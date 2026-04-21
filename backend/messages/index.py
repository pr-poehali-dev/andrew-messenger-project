"""
Сообщения: получить историю чата, отправить сообщение, polling новых.
GET action=history&chat_id=X&after_id=Y
POST action=send body={chat_id, text}
"""
import json
import os
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


def check_member(cur, chat_id: int, user_id: int) -> bool:
    cur.execute("SELECT 1 FROM chat_members WHERE chat_id = %s AND user_id = %s", (chat_id, user_id))
    return cur.fetchone() is not None


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

    conn = get_conn()
    cur = conn.cursor()
    user = get_user_by_session(cur, session_id)
    if not user:
        conn.close()
        return err("Не авторизован", 401)

    # GET history — получить сообщения
    if method == "GET" and action == "history":
        chat_id = qs.get("chat_id")
        after_id = int(qs.get("after_id", "0"))
        if not chat_id:
            conn.close()
            return err("Укажите chat_id")
        chat_id = int(chat_id)

        if not check_member(cur, chat_id, user["id"]):
            conn.close()
            return err("Нет доступа", 403)

        if after_id > 0:
            cur.execute("""
                SELECT m.id, m.sender_id, u.display_name, u.avatar_letters, m.text, m.created_at
                FROM messages m JOIN users u ON u.id = m.sender_id
                WHERE m.chat_id = %s AND m.id > %s
                ORDER BY m.created_at ASC
            """, (chat_id, after_id))
        else:
            cur.execute("""
                SELECT m.id, m.sender_id, u.display_name, u.avatar_letters, m.text, m.created_at
                FROM messages m JOIN users u ON u.id = m.sender_id
                WHERE m.chat_id = %s
                ORDER BY m.created_at ASC
                LIMIT 100
            """, (chat_id,))

        messages = [{
            "id": r[0],
            "sender_id": r[1],
            "sender_name": r[2],
            "sender_avatar": r[3],
            "text": r[4],
            "created_at": str(r[5]),
            "is_mine": r[1] == user["id"]
        } for r in cur.fetchall()]
        conn.close()
        return ok({"messages": messages})

    # POST send — отправить сообщение
    if method == "POST" and action == "send":
        chat_id = body.get("chat_id")
        text = (body.get("text") or "").strip()

        if not chat_id or not text:
            conn.close()
            return err("Укажите chat_id и text")

        chat_id = int(chat_id)
        if not check_member(cur, chat_id, user["id"]):
            conn.close()
            return err("Нет доступа", 403)

        if len(text) > 4000:
            conn.close()
            return err("Сообщение слишком длинное")

        cur.execute(
            "INSERT INTO messages (chat_id, sender_id, text) VALUES (%s, %s, %s) RETURNING id, created_at",
            (chat_id, user["id"], text)
        )
        msg_id, created_at = cur.fetchone()
        conn.commit()
        conn.close()

        return ok({
            "id": msg_id,
            "sender_id": user["id"],
            "sender_name": user["display_name"],
            "sender_avatar": user["avatar_letters"],
            "text": text,
            "created_at": str(created_at),
            "is_mine": True
        })

    conn.close()
    return err("Не авторизован", 401)
