-- Share links stored in Neon PostgreSQL (fixed 8-character IDs)
CREATE TABLE IF NOT EXISTS shares (
  id CHAR(8) PRIMARY KEY,
  data TEXT NOT NULL,
  content_hash CHAR(64),
  preview TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '90 days')
);

CREATE INDEX IF NOT EXISTS shares_expires_at_idx ON shares (expires_at);
CREATE UNIQUE INDEX IF NOT EXISTS shares_content_hash_idx
  ON shares (content_hash)
  WHERE content_hash IS NOT NULL;
