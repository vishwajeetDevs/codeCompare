import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  getShareDb,
  insertShare,
} from '../lib/shareDb';

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
): Promise<VercelResponse> {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ error: 'Method not allowed' });
  }

  const sql = getShareDb();
  if (!sql) {
    return response.status(503).json({ error: 'Database unavailable' });
  }

  const body = request.body as { data?: unknown; preview?: unknown };
  const data = body?.data;
  const preview = typeof body?.preview === 'string' ? body.preview : undefined;

  if (typeof data !== 'string' || !data) {
    return response.status(400).json({ error: 'Missing data' });
  }

  try {
    const id = await insertShare(sql, data, preview);
    return response.status(201).json({ id });
  } catch (error) {
    if (error instanceof Error && error.message === 'Payload too large') {
      return response.status(413).json({ error: 'Payload too large' });
    }

    console.error('Failed to store share:', error);
    return response.status(503).json({ error: 'Database unavailable' });
  }
}
