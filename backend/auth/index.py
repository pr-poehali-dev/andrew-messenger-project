"""
Авторизация: регистрация, вход, выход, проверка сессии.
action передаётся в теле запроса (POST) или query-параметре (GET).
"""
import json
import os
import hashlib
import secrets
import psycopg2


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
        "SELECT u.id, u.username, u.display_name, u.avatar_letters FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.id = %s AND s.expires_at > NOW()",
        (session_id,)
    )
    row = cur.fetchone()
    if not row:
        return None
    return {"id": row[0], "username": row[1], "display_name": row[2], "avatar_letters": row[3]}


def handler(event: dict, context) -> dict:
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": cors_headers(), "body": ""}

    method = event.get("httpMethod", "GET")
    qs = event.get("queryStringParameters") or {}
    body = {}
    if event.get("body"):
        body = json.loads(event["body"])

    action = body.get("action") or qs.get("action", "")
    session_id = event.get("headers", {}).get("X-Session-Id", "")

    # GET me — проверка текущей сессии
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

    # POST register
    if method == "POST" and action == "register":
        username = body.get("username", "").strip().lower()
        display_name = body.get("display_name", "").strip()
        email = body.get("email", "").strip().lower()
        password = body.get("password", "")

        if not username or not display_name or not email or not password:
            return err("Заполните все поля")
        if len(password) < 6:
            return err("Пароль минимум 6 символов")
        if len(username) < 3:
            return err("Имя пользователя минимум 3 символа")

        avatar_letters = "".join([w[0].upper() for w in display_name.split()[:2]])
        password_hash = hash_password(password)

        conn = get_conn()
        cur = conn.cursor()
        cur.execute("SELECT id FROM users WHERE username = %s OR email = %s", (username, email))
        if cur.fetchone():
            conn.close()
            return err("Логин или email уже занят")

        cur.execute(
            "INSERT INTO users (username, display_name, email, password_hash, avatar_letters) VALUES (%s, %s, %s, %s, %s) RETURNING id",
            (username, display_name, email, password_hash, avatar_letters)
        )
        user_id = cur.fetchone()[0]
        session_id = make_session_id()
        cur.execute("INSERT INTO sessions (id, user_id) VALUES (%s, %s)", (session_id, user_id))
        conn.commit()
        conn.close()

        return ok({"session_id": session_id, "user": {"id": user_id, "username": username, "display_name": display_name, "avatar_letters": avatar_letters}})

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
            "SELECT id, username, display_name, avatar_letters FROM users WHERE (username = %s OR email = %s) AND password_hash = %s",
            (login, login, password_hash)
        )
        row = cur.fetchone()
        if not row:
            conn.close()
            return err("Неверный логин или пароль")

        user_id, username, display_name, avatar_letters = row
        cur.execute("UPDATE users SET last_seen_at = NOW() WHERE id = %s", (user_id,))
        new_session = make_session_id()
        cur.execute("INSERT INTO sessions (id, user_id) VALUES (%s, %s)", (new_session, user_id))
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
            "UPDATE users SET display_name = %s, avatar_letters = %s WHERE id = %s",
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
            cur.execute("UPDATE sessions SET expires_at = NOW() WHERE id = %s", (session_id,))
            conn.commit()
            conn.close()
        return ok({"ok": True})

    return err("Не авторизован", 401)