import type { LanguageSetting } from './editor';

export const SHARE_PAYLOAD_VERSION = 1 as const;

export interface SharePayload {
  v: typeof SHARE_PAYLOAD_VERSION;
  original: string;
  modified: string;
  language?: LanguageSetting;
  tabSize?: number;
  insertSpaces?: boolean;
  theme?: 'dark' | 'light';
  originalLabel?: string;
  modifiedLabel?: string;
}

export interface ShareWorkspaceMetadata {
  originalLabel?: string;
  modifiedLabel?: string;
}

export interface StoredShare {
  id: string;
  encoded: string;
  createdAt: string;
  preview: string;
}

export interface ShareLinkResult {
  url: string;
  displayId: string;
  localOnly: boolean;
  /** Stored on server — short URL works for anyone. */
  hosted?: boolean;
}
