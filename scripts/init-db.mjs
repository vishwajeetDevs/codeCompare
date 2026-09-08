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
    preview TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '90 days')
  )
`;

await sql`
  CREATE INDEX IF NOT EXISTS shares_expires_at_idx ON shares (expires_at)
`;

console.log('Share table ready.');
