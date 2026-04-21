"""
Чаты: список чатов, создание диалога, поиск пользователей.
action: list | open | search
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

    # GET list — список чатов
    if method == "GET" and action == "list":
        cur.execute("""
            SELECT
                c.id,
                u2.id,
                u2.display_name,
                u2.avatar_letters,
                u2.last_seen_at,
                (SELECT text FROM messages m WHERE m.chat_id = c.id ORDER BY m.created_at DESC LIMIT 1),
                (SELECT created_at FROM messages m WHERE m.chat_id = c.id ORDER BY m.created_at DESC LIMIT 1)
            FROM chats c
            JOIN chat_members cm1 ON cm1.chat_id = c.id AND cm1.user_id = %s
            JOIN chat_members cm2 ON cm2.chat_id = c.id AND cm2.user_id != %s
            JOIN users u2 ON u2.id = cm2.user_id
            ORDER BY 7 DESC NULLS LAST
        """, (user["id"], user["id"]))
        rows = cur.fetchall()
        chats = [{
            "id": r[0],
            "partner_id": r[1],
            "partner_name": r[2],
            "partner_avatar": r[3],
            "partner_last_seen": str(r[4]) if r[4] else None,
            "last_msg": r[5],
            "last_msg_time": str(r[6]) if r[6] else None,
        } for r in rows]
        conn.close()
        return ok({"chats": chats})

    # GET search?q=... — поиск пользователей
    if method == "GET" and action == "search":
        q = qs.get("q", "").strip()
        if len(q) < 2:
            conn.close()
            return ok({"users": []})
        cur.execute(
            "SELECT id, username, display_name, avatar_letters FROM users WHERE (username ILIKE %s OR display_name ILIKE %s) AND id != %s LIMIT 20",
            (f"%{q}%", f"%{q}%", user["id"])
        )
        users = [{"id": r[0], "username": r[1], "display_name": r[2], "avatar_letters": r[3]} for r in cur.fetchall()]
        conn.close()
        return ok({"users": users})

    # POST open — открыть/создать диалог
    if method == "POST" and action == "open":
        partner_id = body.get("partner_id")
        if not partner_id:
            conn.close()
            return err("Укажите partner_id")

        cur.execute("""
            SELECT c.id FROM chats c
            JOIN chat_members cm1 ON cm1.chat_id = c.id AND cm1.user_id = %s
            JOIN chat_members cm2 ON cm2.chat_id = c.id AND cm2.user_id = %s
            LIMIT 1
        """, (user["id"], partner_id))
        row = cur.fetchone()
        if row:
            chat_id = row[0]
        else:
            cur.execute("INSERT INTO chats DEFAULT VALUES RETURNING id")
            chat_id = cur.fetchone()[0]
            cur.execute("INSERT INTO chat_members (chat_id, user_id) VALUES (%s, %s)", (chat_id, user["id"]))
            cur.execute("INSERT INTO chat_members (chat_id, user_id) VALUES (%s, %s)", (chat_id, partner_id))
            conn.commit()

        conn.close()
        return ok({"chat_id": chat_id})

    conn.close()
    return err("Не авторизован", 401)
