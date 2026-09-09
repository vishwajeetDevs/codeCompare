import { neon } from '@neondatabase/serverless';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('DATABASE_URL is required. Example: node --env-file=.env scripts/init-db.mjs');
  process.exit(1);
}

const sql = neon(databaseUrl);

await sql`
  CREATE TABLE IF NOT EXISTS shares (
    id CHAR(8) PRIMARY KEY,
    data TEXT NOT NULL,
    content_hash CHAR(64),
    preview TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '90 days')
  )
`;

await sql`
  ALTER TABLE shares
  ADD COLUMN IF NOT EXISTS content_hash CHAR(64)
`;

await sql`
  CREATE INDEX IF NOT EXISTS shares_expires_at_idx ON shares (expires_at)
`;

await sql`
  CREATE UNIQUE INDEX IF NOT EXISTS shares_content_hash_idx
  ON shares (content_hash)
  WHERE content_hash IS NOT NULL
`;

console.log('Share table ready.');
