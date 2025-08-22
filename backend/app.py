import os
import time
from flask import Flask, request, jsonify
from flask_cors import CORS
import psycopg
from dotenv import load_dotenv
from chatbot.chatbot import PerplexityChatbot

# Load environment variables
load_dotenv()

PERPLEXITY_API_KEY = os.getenv("PERPLEXITY_API_KEY")
CONTENT_FILE = os.getenv("CONTENT_FILE", "inforens_scraped_data.txt")
DATABASE_URL = os.getenv(
    "DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/inforens_chat")

if not PERPLEXITY_API_KEY:
    raise RuntimeError("PERPLEXITY_API_KEY is not set. Put it in backend/.env")

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Initialize chatbot
bot = PerplexityChatbot(api_key=PERPLEXITY_API_KEY, content_file_path=CONTENT_FILE)

# Ensure DB table exists with thumbs_up/down/feedback
CREATE_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS queries (
    id BIGSERIAL PRIMARY KEY,
    asked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    session_id TEXT,
    user_id TEXT,
    question TEXT NOT NULL,
    answer TEXT,
    model TEXT,
    latency_ms INT,
    success BOOLEAN DEFAULT TRUE,
    error TEXT,
    ip_address TEXT,
    user_agent TEXT,
    thumbs_up BOOLEAN DEFAULT FALSE,
    thumbs_down BOOLEAN DEFAULT FALSE
);
"""
try:
    with psycopg.connect(DATABASE_URL, autocommit=True) as conn:
        with conn.cursor() as cur:
            cur.execute(CREATE_TABLE_SQL)
except Exception as e:
    print("[WARN] Could not initialize DB table:", e)

@app.get("/api/health")
def health():
    return {"status": "ok"}

@app.post("/api/ask")
def ask():
    start = time.time()
    data = request.get_json(silent=True) or {}
    question = (data.get("question") or "").strip()
    session_id = data.get("sessionId")
    user_id = data.get("userId")

    if not question:
        return jsonify({"error": "Question is required"}), 400

    ip = request.headers.get("X-Forwarded-For", request.remote_addr)
    ua = request.headers.get("User-Agent")

    try:
        raw_answer = bot.ask_question(question)
        latency_ms = int((time.time() - start) * 1000)

        # Log query and return DB id
        query_id = None
        try:
            with psycopg.connect(DATABASE_URL, autocommit=True) as conn:
                with conn.cursor() as cur:
                    cols = [
                        "session_id", "user_id", "question", "answer",
                        "model", "latency_ms", "success", "error", "ip_address", "user_agent"
                    ]
                    vals = [
                        session_id, user_id, question, raw_answer,
                        "perplexity-sonar", latency_ms, True, None, ip, ua
                    ]
                    placeholders = ", ".join(["%s"] * len(cols))
                    sql = f"INSERT INTO queries ({', '.join(cols)}) VALUES ({placeholders}) RETURNING id"
                    cur.execute(sql, vals)
                    query_id = cur.fetchone()[0]
        except Exception as e:
            print("[WARN] Failed to log query:", e)

        return jsonify({"answer": raw_answer, "latencyMs": latency_ms, "messageId": query_id})
    except Exception as e:
        latency_ms = int((time.time() - start) * 1000)
        return jsonify({"error": f"Failed to get answer: {str(e)}"}), 500

@app.post("/api/feedback")
def feedback():
    data = request.get_json()
    message_id = data.get("messageId")
    thumbs_up = data.get("thumbsUp", False)
    thumbs_down = data.get("thumbsDown", False)

    if not message_id:
        return jsonify({"error": "Message ID is required"}), 400

    try:
        with psycopg.connect(DATABASE_URL, autocommit=True) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    UPDATE queries
                    SET thumbs_up = %s,
                        thumbs_down = %s
                    WHERE id = %s
                    """,
                    (thumbs_up, thumbs_down, message_id)
                )
        return jsonify({"status": "ok"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


import requests

@app.post("/api/transcribe")
def transcribe():
    try:
        audio_file = request.files["file"]
        response = requests.post(
            "https://api.perplexity.ai/audio/transcriptions",
            headers={"Authorization": f"Bearer {PERPLEXITY_API_KEY}"},
            files={"file": (audio_file.filename, audio_file, audio_file.mimetype)},
        )
        return jsonify(response.json())
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)