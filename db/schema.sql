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
user_agent TEXT
);