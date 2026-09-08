import { isShareId, SHARE_ID_PATTERN } from './shareId';

/** @deprecated Use SHARE_ID_PATTERN from shareId.ts */
export const REMOTE_SHARE_ID_PATTERN = SHARE_ID_PATTERN;

export function isRemoteShareId(id: string): boolean {
  return isShareId(id);
}

export async function createRemoteShare(
  encoded: string,
  preview?: string,
): Promise<string | null> {
  try {
    const response = await fetch('/api/share', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: encoded, preview }),
    });

    if (!response.ok) return null;

    const body = (await response.json()) as { id?: string };
    if (!body.id || !isShareId(body.id)) return null;

    return body.id;
  } catch {
    return null;
  }
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
