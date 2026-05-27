"""
Авторизация: регистрация с подтверждением email, вход, выход, проверка сессии.
action передаётся в теле запроса (POST) или query-параметре (GET). v2
"""
import json
import os
import hashlib
import secrets
import random
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import psycopg2

SCHEMA = "t_p70879376_andrew_messenger_pro"


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def cors_headers():
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, X-Session-Id",
    }


def ok(data):
    return {"statusCode": 200, "headers": {**cors_headers(), "Content-Type": "application/json"}, "body": json.dumps(data)}


def err(msg, code=400):
    return {"statusCode": code, "headers": {**cors_headers(), "Content-Type": "application/json"}, "body": json.dumps({"error": msg})}


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


def make_session_id() -> str:
    return secrets.token_hex(32)


def get_user_by_session(cur, session_id: str):
    cur.execute(
        f"SELECT u.id, u.username, u.display_name, u.avatar_letters FROM {SCHEMA}.sessions s JOIN {SCHEMA}.users u ON u.id = s.user_id WHERE s.id = %s AND s.expires_at > NOW()",
        (session_id,)
    )
    row = cur.fetchone()
    if not row:
        return None
    return {"id": row[0], "username": row[1], "display_name": row[2], "avatar_letters": row[3]}


def send_email_code(to_email: str, code: str):
    gmail_user = os.environ["GMAIL_USER"]
    gmail_password = os.environ["GMAIL_APP_PASSWORD"]

    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"{code} — код подтверждения Andrew Messenger"
    msg["From"] = f"Andrew Messenger <{gmail_user}>"
    msg["To"] = to_email

    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 400px; margin: 0 auto; padding: 32px; background: #0f1117; border-radius: 16px; color: #e8eaf0;">
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="width: 56px; height: 56px; background: linear-gradient(135deg, #3b82f6, #8b5cf6); border-radius: 14px; display: inline-flex; align-items: center; justify-content: center; font-weight: 900; font-size: 24px; color: white;">A</div>
        <h2 style="margin: 12px 0 4px; font-size: 20px;">Andrew Messenger</h2>
        <p style="margin: 0; color: #6b7280; font-size: 14px;">Подтверждение email</p>
      </div>
      <p style="font-size: 15px; color: #d1d5db; margin-bottom: 8px;">Ваш код подтверждения:</p>
      <div style="text-align: center; background: #1a1f2e; border: 1px solid #2d3348; border-radius: 12px; padding: 20px; margin-bottom: 16px;">
        <span style="font-size: 36px; font-weight: 900; letter-spacing: 10px; color: #818cf8;">{code}</span>
      </div>
      <p style="font-size: 13px; color: #6b7280; text-align: center;">Код действует 10 минут. Если вы не регистрировались — просто проигнорируйте это письмо.</p>
    </div>
    """

    msg.attach(MIMEText(html, "html"))

    with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
        server.login(gmail_user, gmail_password)
        server.sendmail(gmail_user, to_email, msg.as_string())


def handler(event: dict, context) -> dict:
    """Авторизация с подтверждением email через код."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": cors_headers(), "body": ""}

    method = event.get("httpMethod", "GET")
    qs = event.get("queryStringParameters") or {}
    body = {}
    if event.get("body"):
        body = json.loads(event["body"])

    action = body.get("action") or qs.get("action", "")
    session_id = event.get("headers", {}).get("X-Session-Id", "")

    # GET me
    if method == "GET" and action == "me":
        if not session_id:
            return err("Не авторизован", 401)
        conn = get_conn()
        cur = conn.cursor()
        user = get_user_by_session(cur, session_id)
        conn.close()
        if not user:
            return err("Сессия истекла", 401)
        return ok(user)

    # POST send_code — отправить код на email перед регистрацией
    if method == "POST" and action == "send_code":
        email = body.get("email", "").strip().lower()
        if not email or "@" not in email:
            return err("Укажите корректный email")

        conn = get_conn()
        cur = conn.cursor()
        cur.execute(f"SELECT id FROM {SCHEMA}.users WHERE email = %s", (email,))
        if cur.fetchone():
            conn.close()
            return err("Email уже зарегистрирован")

        # Не чаще раза в минуту
        cur.execute(
            f"SELECT id FROM {SCHEMA}.email_codes WHERE email = %s AND created_at > NOW() - INTERVAL '60 seconds' AND used = FALSE",
            (email,)
        )
        if cur.fetchone():
            conn.close()
            return err("Подождите минуту перед повторной отправкой")

        code = str(random.randint(100000, 999999))
        cur.execute(
            f"INSERT INTO {SCHEMA}.email_codes (email, code, expires_at) VALUES (%s, %s, NOW() + INTERVAL '10 minutes')",
            (email, code)
        )
        conn.commit()
        conn.close()

        send_email_code(email, code)
        return ok({"sent": True})

    # POST verify_code — проверить код (без регистрации, просто валидация)
    if method == "POST" and action == "verify_code":
        email = body.get("email", "").strip().lower()
        code = body.get("code", "").strip()
        if not email or not code:
            return err("Укажите email и код")

        conn = get_conn()
        cur = conn.cursor()
        cur.execute(
            f"SELECT id FROM {SCHEMA}.email_codes WHERE email = %s AND code = %s AND expires_at > NOW() AND used = FALSE ORDER BY created_at DESC LIMIT 1",
            (email, code)
        )
        row = cur.fetchone()
        conn.close()
        if not row:
            return err("Неверный или просроченный код")
        return ok({"valid": True})

    # POST register — с проверкой кода
    if method == "POST" and action == "register":
        username = body.get("username", "").strip().lower()
        display_name = body.get("display_name", "").strip()
        email = body.get("email", "").strip().lower()
        password = body.get("password", "")
        code = body.get("code", "").strip()

        if not username or not display_name or not email or not password or not code:
            return err("Заполните все поля")
        if len(password) < 6:
            return err("Пароль минимум 6 символов")
        if len(username) < 3:
            return err("Имя пользователя минимум 3 символа")

        conn = get_conn()
        cur = conn.cursor()

        # Проверяем код
        cur.execute(
            f"SELECT id FROM {SCHEMA}.email_codes WHERE email = %s AND code = %s AND expires_at > NOW() AND used = FALSE ORDER BY created_at DESC LIMIT 1",
            (email, code)
        )
        code_row = cur.fetchone()
        if not code_row:
            conn.close()
            return err("Неверный или просроченный код подтверждения")

        cur.execute(f"SELECT id FROM {SCHEMA}.users WHERE username = %s OR email = %s", (username, email))
        if cur.fetchone():
            conn.close()
            return err("Логин или email уже занят")

        avatar_letters = "".join([w[0].upper() for w in display_name.split()[:2]])
        password_hash = hash_password(password)

        cur.execute(
            f"INSERT INTO {SCHEMA}.users (username, display_name, email, password_hash, avatar_letters) VALUES (%s, %s, %s, %s, %s) RETURNING id",
            (username, display_name, email, password_hash, avatar_letters)
        )
        user_id = cur.fetchone()[0]

        new_session = make_session_id()
        cur.execute(f"INSERT INTO {SCHEMA}.sessions (id, user_id) VALUES (%s, %s)", (new_session, user_id))

        # Помечаем код как использованный
        cur.execute(f"UPDATE {SCHEMA}.email_codes SET used = TRUE WHERE id = %s", (code_row[0],))

        conn.commit()
        conn.close()

        return ok({"session_id": new_session, "user": {"id": user_id, "username": username, "display_name": display_name, "avatar_letters": avatar_letters}})

    # POST login
    if method == "POST" and action == "login":
        login = body.get("login", "").strip().lower()
        password = body.get("password", "")

        if not login or not password:
            return err("Введите логин и пароль")

        password_hash = hash_password(password)
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(
            f"SELECT id, username, display_name, avatar_letters FROM {SCHEMA}.users WHERE (username = %s OR email = %s) AND password_hash = %s",
            (login, login, password_hash)
        )
        row = cur.fetchone()
        if not row:
            conn.close()
            return err("Неверный логин или пароль")

        user_id, username, display_name, avatar_letters = row
        cur.execute(f"UPDATE {SCHEMA}.users SET last_seen_at = NOW() WHERE id = %s", (user_id,))
        new_session = make_session_id()
        cur.execute(f"INSERT INTO {SCHEMA}.sessions (id, user_id) VALUES (%s, %s)", (new_session, user_id))
        conn.commit()
        conn.close()

        return ok({"session_id": new_session, "user": {"id": user_id, "username": username, "display_name": display_name, "avatar_letters": avatar_letters}})

    # POST update_profile
    if method == "POST" and action == "update_profile":
        if not session_id:
            return err("Не авторизован", 401)
        display_name = body.get("display_name", "").strip()
        avatar_letters = body.get("avatar_letters", "").strip().upper()
        if not display_name:
            return err("Имя не может быть пустым")
        if not avatar_letters:
            avatar_letters = "".join([w[0].upper() for w in display_name.split()[:2]])
        if len(avatar_letters) > 2:
            avatar_letters = avatar_letters[:2]
        conn = get_conn()
        cur = conn.cursor()
        user = get_user_by_session(cur, session_id)
        if not user:
            conn.close()
            return err("Сессия истекла", 401)
        cur.execute(
            f"UPDATE {SCHEMA}.users SET display_name = %s, avatar_letters = %s WHERE id = %s",
            (display_name, avatar_letters, user["id"])
        )
        conn.commit()
        conn.close()
        return ok({"display_name": display_name, "avatar_letters": avatar_letters})

    # POST logout
    if method == "POST" and action == "logout":
        if session_id:
            conn = get_conn()
            cur = conn.cursor()
            cur.execute(f"UPDATE {SCHEMA}.sessions SET expires_at = NOW() WHERE id = %s", (session_id,))
            conn.commit()
            conn.close()
        return ok({"ok": True})

    return err("Неизвестный запрос", 400)