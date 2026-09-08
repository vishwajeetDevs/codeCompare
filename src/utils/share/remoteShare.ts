import { isShareId, SHARE_ID_PATTERN } from './shareId';

/** @deprecated Use SHARE_ID_PATTERN from shareId.ts */
export const REMOTE_SHARE_ID_PATTERN = SHARE_ID_PATTERN;

export function isRemoteShareId(id: string): boolean {
  return isShareId(id);
}

export class ShareApiError extends Error {
  hint?: string;

  constructor(message: string, hint?: string) {
    super(message);
    this.name = 'ShareApiError';
    this.hint = hint;
  }
}

async function readShareApiError(response: Response): Promise<ShareApiError> {
  try {
    const body = (await response.json()) as { error?: string; hint?: string };
    const message =
      typeof body.error === 'string' ? body.error : `Share API failed (${response.status})`;
    const hint = typeof body.hint === 'string' ? body.hint : undefined;
    return new ShareApiError(message, hint);
  } catch {
    if (response.status === 404) {
      return new ShareApiError(
        'Share API not found',
        'Redeploy on Vercel so /api/share serverless functions are included.',
      );
    }
    return new ShareApiError(`Share API failed (${response.status})`);
  }
}

export async function createRemoteShare(
  encoded: string,
  preview?: string,
): Promise<string> {
  let response: Response;
  try {
    response = await fetch('/api/share', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: encoded, preview }),
    });
  } catch {
    throw new ShareApiError(
      'Could not reach share API',
      'Use a Vercel deployment with /api/share enabled, or run npx vercel dev locally.',
    );
  }

  if (!response.ok) {
    throw await readShareApiError(response);
  }

  const body = (await response.json()) as { id?: string };
  if (!body.id || !isShareId(body.id)) {
    throw new ShareApiError('Share API returned an invalid link id');
  }

  return body.id;
}

export async function fetchRemoteShare(id: string): Promise<string | null> {
  if (!isShareId(id)) return null;

  try {
    const response = await fetch(`/api/share/${id}`);
    if (!response.ok) return null;

    const body = (await response.json()) as { data?: string };
    return typeof body.data === 'string' ? body.data : null;
  } catch {
    return null;
  }
}
