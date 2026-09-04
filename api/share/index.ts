import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Redis } from '@upstash/redis';

const MAX_BYTES = 1_500_000;
const TTL_SECONDS = 60 * 60 * 24 * 90;
const ID_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;

  if (!url || !token) return null;
  return new Redis({ url, token });
}

function createShareId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(bytes, (byte) => ID_ALPHABET[byte % ID_ALPHABET.length]).join('');
}

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
): Promise<VercelResponse> {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ error: 'Method not allowed' });
  }

  const redis = getRedis();
  if (!redis) {
    return response.status(503).json({ error: 'Storage unavailable' });
  }

  const body = request.body as { data?: unknown };
  const data = body?.data;

  if (typeof data !== 'string' || !data) {
    return response.status(400).json({ error: 'Missing data' });
  }

  if (data.length > MAX_BYTES) {
    return response.status(413).json({ error: 'Payload too large' });
  }

  try {
    const id = createShareId();
    await redis.set(`share:${id}`, data, { ex: TTL_SECONDS });
    return response.status(201).json({ id });
  } catch (error) {
    console.error('Failed to store share:', error);
    return response.status(503).json({ error: 'Storage unavailable' });
  }
}
