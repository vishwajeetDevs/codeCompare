import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  getShareDb,
  insertShare,
} from '../lib/shareDb.js';

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
): Promise<VercelResponse> {
  try {
    if (request.method === 'GET') {
      const sql = getShareDb();
      return response.status(200).json({
        ok: true,
        database: sql ? 'configured' : 'missing',
      });
    }

    if (request.method !== 'POST') {
      response.setHeader('Allow', 'GET, POST');
      return response.status(405).json({ error: 'Method not allowed' });
    }

    const sql = getShareDb();
    if (!sql) {
      return response.status(503).json({
        error: 'Database unavailable',
        hint: 'Set DATABASE_URL in Vercel project environment variables (Neon connection string).',
      });
    }

    const body = parseJsonBody(request.body);
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
      return response.status(503).json({
        error: 'Database unavailable',
        hint: 'Check DATABASE_URL and Neon database connectivity.',
      });
    }
  } catch (error) {
    console.error('Share API failed:', error);
    return response.status(500).json({
      error: 'Internal server error',
      hint: error instanceof Error ? error.message : undefined,
    });
  }
}

function parseJsonBody(
  body: VercelRequest['body'],
): { data?: unknown; preview?: unknown } | null {
  if (body == null) return null;
  if (typeof body === 'string') {
    try {
      return JSON.parse(body) as { data?: unknown; preview?: unknown };
    } catch {
      return null;
    }
  }
  if (typeof body === 'object') {
    return body as { data?: unknown; preview?: unknown };
  }
  return null;
}
