/** 8-char Crockford-style IDs for database-hosted share links. */
export const SHARE_ID_PATTERN = /^[0-9A-HJ-NP-Z]{8}$/;

export function isShareId(id: string): boolean {
  return SHARE_ID_PATTERN.test(id);
}
