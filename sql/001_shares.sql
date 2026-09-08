-- Share links stored in Neon PostgreSQL (fixed 8-character IDs)
CREATE TABLE IF NOT EXISTS shares (
  id CHAR(8) PRIMARY KEY,
  data TEXT NOT NULL,
  preview TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '90 days')
);

CREATE INDEX IF NOT EXISTS shares_expires_at_idx ON shares (expires_at);
