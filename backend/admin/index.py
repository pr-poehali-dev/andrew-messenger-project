"""
Панель разработчика: статистика, пользователи, чаты, сообщения.
Доступ защищён паролем передаваемым в теле запроса.
"""
import json
import os
import psycopg2

SCHEMA = "t_p70879376_andrew_messenger_pro"
DEV_PASSWORD = "popa1488wawawawa"


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def cors():
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
    }


def resp(status, body):
    return {"statusCode": status, "headers": {**cors(), "Content-Type": "application/json"}, "body": json.dumps(body, default=str)}


def handler(event: dict, context) -> dict:
    """Панель разработчика — только с правильным паролем."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": cors(), "body": ""}

    try:
        body = json.loads(event.get("body") or "{}")
    except Exception:
        body = {}

    if body.get("password") != DEV_PASSWORD:
        return resp(403, {"error": "Неверный пароль"})

    action = body.get("action", "stats")
    conn = get_conn()
    cur = conn.cursor()

    try:
        if action == "stats":
            cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.users")
            users_count = cur.fetchone()[0]
            cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.chats")
            chats_count = cur.fetchone()[0]
            cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.messages")
            messages_count = cur.fetchone()[0]
            cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.sessions")
            sessions_count = cur.fetchone()[0]
            cur.execute(f"""
                SELECT COUNT(*) FROM {SCHEMA}.sessions
                WHERE created_at > NOW() - INTERVAL '24 hours'
            """)
            active_today = cur.fetchone()[0]
            return resp(200, {
                "users": users_count,
                "chats": chats_count,
                "messages": messages_count,
                "sessions": sessions_count,
                "active_today": active_today,
            })

        elif action == "users":
            cur.execute(f"""
                SELECT id, username, display_name, email, avatar_letters, created_at, last_seen_at
                FROM {SCHEMA}.users
                ORDER BY created_at DESC
            """)
            cols = [d[0] for d in cur.description]
            rows = [dict(zip(cols, row)) for row in cur.fetchall()]
            return resp(200, {"users": rows})

        elif action == "chats":
            cur.execute(f"""
                SELECT c.id, c.created_at,
                    u1.display_name AS user1_name, u1.username AS user1_username,
                    u2.display_name AS user2_name, u2.username AS user2_username,
                    (SELECT COUNT(*) FROM {SCHEMA}.messages m WHERE m.chat_id = c.id) AS msg_count,
                    (SELECT MAX(created_at) FROM {SCHEMA}.messages m WHERE m.chat_id = c.id) AS last_msg_at
                FROM {SCHEMA}.chats c
                JOIN {SCHEMA}.chat_members cm1 ON cm1.chat_id = c.id
                JOIN {SCHEMA}.users u1 ON u1.id = cm1.user_id
                JOIN {SCHEMA}.chat_members cm2 ON cm2.chat_id = c.id AND cm2.user_id != cm1.user_id
                JOIN {SCHEMA}.users u2 ON u2.id = cm2.user_id
                WHERE cm1.user_id < cm2.user_id
                ORDER BY last_msg_at DESC NULLS LAST
            """)
            cols = [d[0] for d in cur.description]
            rows = [dict(zip(cols, row)) for row in cur.fetchall()]
            return resp(200, {"chats": rows})

        elif action == "messages":
            chat_id = body.get("chat_id")
            if chat_id:
                cur.execute(f"""
                    SELECT m.id, m.chat_id, m.text, m.created_at, m.file_url, m.file_name, m.file_type,
                        u.display_name AS sender_name, u.username AS sender_username, u.avatar_letters AS sender_avatar
                    FROM {SCHEMA}.messages m
                    JOIN {SCHEMA}.users u ON u.id = m.sender_id
                    WHERE m.chat_id = %s
                    ORDER BY m.created_at ASC
                """, (chat_id,))
            else:
                cur.execute(f"""
                    SELECT m.id, m.chat_id, m.text, m.created_at, m.file_url, m.file_name, m.file_type,
                        u.display_name AS sender_name, u.username AS sender_username, u.avatar_letters AS sender_avatar
                    FROM {SCHEMA}.messages m
                    JOIN {SCHEMA}.users u ON u.id = m.sender_id
                    ORDER BY m.created_at DESC
                    LIMIT 200
                """)
            cols = [d[0] for d in cur.description]
            rows = [dict(zip(cols, row)) for row in cur.fetchall()]
            return resp(200, {"messages": rows})

        else:
            return resp(400, {"error": "Неизвестный action"})

    finally:
        cur.close()
        conn.close()
