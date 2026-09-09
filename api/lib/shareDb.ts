import { createHash } from 'node:crypto';
import { neon, type NeonQueryFunction } from '@neondatabase/serverless';

export const SHARE_ID_PATTERN = /^[0-9A-HJ-NP-Z]{8}$/;
export const SHARE_ID_LENGTH = 8;

const ID_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const MAX_DATA_BYTES = 1_500_000;
let schemaReady: Promise<void> | null = null;

export function getShareDb(): NeonQueryFunction<false, false> | null {
  const databaseUrl = resolveDatabaseUrl();
  if (!databaseUrl) return null;
  return neon(databaseUrl);
}

function resolveDatabaseUrl(): string | null {
  const candidates = [
    process.env.DATABASE_URL,
    process.env.POSTGRES_URL,
    process.env.NEON_DATABASE_URL,
    process.env.POSTGRES_PRISMA_URL,
    process.env.POSTGRES_URL_NON_POOLING,
  ];

  for (const value of candidates) {
    const trimmed = value?.trim();
    if (trimmed) return trimmed;
  }

  return null;
}

export async function ensureShareSchema(
  sql: NeonQueryFunction<false, false>,
): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
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
    })();
  }

  await schemaReady;
}

export function createShareId(): string {
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(SHARE_ID_LENGTH));
  return Array.from(bytes, (byte: number) => ID_ALPHABET[byte % ID_ALPHABET.length]).join(
    '',
  );
}

export function isValidShareId(id: string): boolean {
  return SHARE_ID_PATTERN.test(id);
}

export async function insertShare(
  sql: NeonQueryFunction<false, false>,
  data: string,
  preview?: string,
): Promise<{ id: string; created: boolean }> {
  if (data.length > MAX_DATA_BYTES) {
    throw new Error('Payload too large');
  }

  await ensureShareSchema(sql);

  const contentHash = createHash('sha256').update(data).digest('hex');

  const hashedRows = await sql`
    SELECT id
    FROM shares
    WHERE content_hash = ${contentHash}
      AND data = ${data}
    ORDER BY created_at ASC
    LIMIT 1
  `;
  const legacyRows =
    hashedRows.length > 0
      ? []
      : await sql`
          SELECT id
          FROM shares
          WHERE content_hash IS NULL
            AND data = ${data}
          ORDER BY created_at ASC
          LIMIT 1
        `;
  const existingRows = hashedRows.length > 0 ? hashedRows : legacyRows;
  const existingId = existingRows[0]?.id;
  if (typeof existingId === 'string') {
    try {
      await sql`
        UPDATE shares
        SET
          content_hash = ${contentHash},
          preview = ${preview ?? null},
          expires_at = NOW() + INTERVAL '90 days'
        WHERE id = ${existingId}
      `;
    } catch (error) {
      const pgCode =
        error && typeof error === 'object' && 'code' in error
          ? String((error as { code?: string }).code)
          : '';
      if (pgCode !== '23505') throw error;
    }

    return { id: existingId, created: false };
  }

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const id = createShareId();

    try {
      const rows = await sql`
        INSERT INTO shares (id, data, content_hash, preview, expires_at)
        VALUES (
          ${id},
          ${data},
          ${contentHash},
          ${preview ?? null},
          NOW() + INTERVAL '90 days'
        )
        ON CONFLICT (content_hash) WHERE content_hash IS NOT NULL
        DO UPDATE SET
          preview = EXCLUDED.preview,
          expires_at = NOW() + INTERVAL '90 days'
        RETURNING id
      `;

      const inserted = rows[0]?.id;
      if (typeof inserted === 'string') {
        return { id: inserted, created: inserted === id };
      }
    } catch (error) {
      const pgCode =
        error && typeof error === 'object' && 'code' in error
          ? String((error as { code?: string }).code)
          : '';

      if (pgCode === '23505') continue;
      throw error;
    }
  }

  throw new Error('Could not allocate share id');
}

export async function fetchShare(
  sql: NeonQueryFunction<false, false>,
  id: string,
): Promise<{ data: string; preview: string | null } | null> {
  if (!isValidShareId(id)) return null;

  await ensureShareSchema(sql);

  const rows = await sql`
    SELECT data, preview
    FROM shares
    WHERE id = ${id}
      AND expires_at > NOW()
    LIMIT 1
  `;

  const row = rows[0];
  if (!row || typeof row.data !== 'string') return null;

  return {
    data: row.data,
    preview: typeof row.preview === 'string' ? row.preview : null,
  };
}
