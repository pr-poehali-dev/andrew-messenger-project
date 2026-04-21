"""
Загрузка файлов и фото в S3. Принимает base64, возвращает CDN URL.
POST body: {session_id via header, file_base64, file_name, file_type, chat_id}
"""
import json
import os
import base64
import uuid
import psycopg2
import boto3


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def cors_headers():
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, X-Session-Id",
    }


def ok(data):
    return {"statusCode": 200, "headers": {**cors_headers(), "Content-Type": "application/json"}, "body": json.dumps(data, default=str)}


def err(msg, code=400):
    return {"statusCode": code, "headers": {**cors_headers(), "Content-Type": "application/json"}, "body": json.dumps({"error": msg})}


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

    if event.get("httpMethod") != "POST":
        return err("Method not allowed", 405)

    session_id = event.get("headers", {}).get("X-Session-Id", "")
    body = json.loads(event.get("body") or "{}")

    conn = get_conn()
    cur = conn.cursor()
    user = get_user_by_session(cur, session_id)
    if not user:
        conn.close()
        return err("Не авторизован", 401)

    file_b64 = body.get("file_base64", "")
    file_name = body.get("file_name", "file")
    file_type = body.get("file_type", "application/octet-stream")
    chat_id = body.get("chat_id")

    if not file_b64 or not chat_id:
        conn.close()
        return err("Укажите file_base64 и chat_id")

    # Проверить что пользователь участник чата
    cur.execute("SELECT 1 FROM chat_members WHERE chat_id = %s AND user_id = %s", (chat_id, user["id"]))
    if not cur.fetchone():
        conn.close()
        return err("Нет доступа", 403)

    # Декодировать файл
    try:
        if "," in file_b64:
            file_b64 = file_b64.split(",", 1)[1]
        file_data = base64.b64decode(file_b64)
    except Exception:
        conn.close()
        return err("Неверный формат файла")

    # Ограничение 20 МБ
    if len(file_data) > 20 * 1024 * 1024:
        conn.close()
        return err("Файл слишком большой (максимум 20 МБ)")

    # Загрузить в S3
    ext = file_name.rsplit(".", 1)[-1].lower() if "." in file_name else "bin"
    key = f"messenger/{chat_id}/{uuid.uuid4().hex}.{ext}"

    s3 = boto3.client(
        "s3",
        endpoint_url="https://bucket.poehali.dev",
        aws_access_key_id=os.environ["AWS_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["AWS_SECRET_ACCESS_KEY"],
    )
    s3.put_object(Bucket="files", Key=key, Body=file_data, ContentType=file_type)
    cdn_url = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{key}"

    # Сохранить сообщение с файлом
    cur.execute(
        "INSERT INTO messages (chat_id, sender_id, text, file_url, file_name, file_type) VALUES (%s, %s, %s, %s, %s, %s) RETURNING id, created_at",
        (chat_id, user["id"], file_name, cdn_url, file_name, file_type)
    )
    msg_id, created_at = cur.fetchone()
    conn.commit()
    conn.close()

    return ok({
        "id": msg_id,
        "sender_id": user["id"],
        "sender_name": user["display_name"],
        "sender_avatar": user["avatar_letters"],
        "text": file_name,
        "file_url": cdn_url,
        "file_name": file_name,
        "file_type": file_type,
        "created_at": str(created_at),
        "is_mine": True
    })
