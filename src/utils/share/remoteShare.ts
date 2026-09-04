/** 8-char Crockford-style IDs used for server-hosted share links. */
export const REMOTE_SHARE_ID_PATTERN = /^[0-9A-HJ-NP-Z]{8}$/;

export function isRemoteShareId(id: string): boolean {
  return REMOTE_SHARE_ID_PATTERN.test(id);
}

export async function createRemoteShare(encoded: string): Promise<string | null> {
  try {
    const response = await fetch('/api/share', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: encoded }),
    });

    if (!response.ok) return null;

    const body = (await response.json()) as { id?: string };
    if (!body.id || !isRemoteShareId(body.id)) return null;

    return body.id;
  } catch {
    return null;
  }
}

export async function fetchRemoteShare(id: string): Promise<string | null> {
  if (!isRemoteShareId(id)) return null;

  try {
    const response = await fetch(`/api/share/${id}`);
    if (!response.ok) return null;

    const body = (await response.json()) as { data?: string };
    return typeof body.data === 'string' ? body.data : null;
  } catch {
    return null;
  }
}
