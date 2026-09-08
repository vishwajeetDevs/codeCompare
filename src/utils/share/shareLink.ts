import type { EditorSettings } from '../../types/editor';
import type { ShareLinkResult, SharePayload } from '../../types/share';
import type { ThemeMode } from '../../types';
import { encodeSharePayload, decodeSharePayload } from './codec';
import {
  createRemoteShare,
  fetchRemoteShare,
  isRemoteShareId,
} from './remoteShare';
import { previewText, saveShareRecord } from './storage';

/** Short fixed-length URL for the share popover. */
export function formatShareUrlForDisplay(result: ShareLinkResult): string {
  let origin: string;
  try {
    origin = new URL(result.url).origin;
  } catch {
    origin = window.location.origin;
  }

  return `${origin}/c/${result.displayId}`;
}

export async function buildShareLink(
  original: string,
  modified: string,
  settings: EditorSettings,
  theme: ThemeMode,
): Promise<ShareLinkResult> {
  const encoded = encodeSharePayload({
    original,
    modified,
    language: settings.language,
    tabSize: settings.tabSize,
    insertSpaces: settings.insertSpaces,
    theme,
  });

  const preview = previewText(original, modified);
  const remoteId = await createRemoteShare(encoded, preview);
  if (!remoteId) {
    throw new Error('Could not create share link');
  }

  saveShareRecord({
    id: remoteId,
    encoded,
    createdAt: new Date().toISOString(),
    preview,
  });

  const origin = window.location.origin;

  return {
    url: `${origin}/c/${remoteId}`,
    displayId: remoteId,
    localOnly: false,
    hosted: true,
  };
}

function getShareIdFromPath(): string | null {
  const match = window.location.pathname.match(/^\/c\/([^/]+)\/?$/);
  const segment = match?.[1];
  if (!segment || !isRemoteShareId(segment)) return null;
  return segment;
}

/** Shared links always load from the database asynchronously. */
export function loadSharedComparisonFromUrlSync(): SharePayload | null {
  return null;
}

export async function loadSharedComparisonFromUrl(): Promise<SharePayload | null> {
  const shareId = getShareIdFromPath();
  if (!shareId) return null;

  const encoded = await fetchRemoteShare(shareId);
  if (!encoded) return null;

  const payload = decodeSharePayload(encoded);
  if (!payload) return null;

  saveShareRecord({
    id: shareId,
    encoded,
    createdAt: new Date().toISOString(),
    preview: previewText(payload.original, payload.modified),
  });

  return payload;
}

export function isSharedComparisonUrl(): boolean {
  return Boolean(getShareIdFromPath());
}

export function needsAsyncShareLoad(): boolean {
  return isSharedComparisonUrl();
}

export function clearShareRouteFromUrl(displayId?: string): void {
  const nextPath = displayId ? `/c/${displayId}` : '/';
  window.history.replaceState({}, '', nextPath);
}

export function getShareRouteMeta(): {
  displayId: string;
  localOnly: boolean;
  hosted: boolean;
} | null {
  const shareId = getShareIdFromPath();
  if (!shareId) return null;

  return {
    displayId: shareId,
    localOnly: false,
    hosted: true,
  };
}
