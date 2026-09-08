import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  fetchShare,
  getShareDb,
  isValidShareId,
} from '../lib/shareDb.js';

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
): Promise<VercelResponse> {
  try {
    if (request.method !== 'GET') {
      response.setHeader('Allow', 'GET');
      return response.status(405).json({ error: 'Method not allowed' });
    }

    const sql = getShareDb();
    if (!sql) {
      return response.status(503).json({
        error: 'Share service unavailable',
        hint: 'Try again in a moment.',
      });
    }

    const id = typeof request.query.id === 'string' ? request.query.id : '';
    if (!isValidShareId(id)) {
      return response.status(400).json({ error: 'Invalid share id' });
    }

    try {
      const share = await fetchShare(sql, id);
      if (!share) {
        return response.status(404).json({ error: 'Share not found or expired' });
      }

      response.setHeader('Cache-Control', 'public, max-age=60');
      return response.status(200).json({ data: share.data, preview: share.preview });
    } catch (error) {
      console.error('Failed to load share:', error);
      return response.status(503).json({
        error: 'Share service unavailable',
        hint: 'Try again in a moment.',
      });
    }
  } catch (error) {
    console.error('Share load API failed:', error);
    return response.status(500).json({
      error: 'Internal server error',
      hint: error instanceof Error ? error.message : undefined,
    });
  }
}
