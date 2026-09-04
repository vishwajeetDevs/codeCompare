import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Redis } from '@upstash/redis';

const REMOTE_SHARE_ID_PATTERN = /^[0-9A-HJ-NP-Z]{8}$/;

function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;

  if (!url || !token) return null;
  return new Redis({ url, token });
}

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
): Promise<VercelResponse> {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ error: 'Method not allowed' });
  }

  const redis = getRedis();
  if (!redis) {
    return response.status(503).json({ error: 'Storage unavailable' });
  }

  const id = typeof request.query.id === 'string' ? request.query.id : '';
  if (!REMOTE_SHARE_ID_PATTERN.test(id)) {
    return response.status(400).json({ error: 'Invalid share id' });
  }

  try {
    const data = await redis.get<string>(`share:${id}`);
    if (!data) {
      return response.status(404).json({ error: 'Share not found or expired' });
    }

    response.setHeader('Cache-Control', 'public, max-age=60');
    return response.status(200).json({ data });
  } catch (error) {
    console.error('Failed to load share:', error);
    return response.status(503).json({ error: 'Storage unavailable' });
  }
}
