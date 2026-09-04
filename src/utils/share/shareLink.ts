import type { EditorSettings } from '../../types/editor';
import type { ShareLinkResult, SharePayload } from '../../types/share';
import type { ThemeMode } from '../../types';
import {
  createShareDisplayId,
  decodeSharePayload,
  encodeSharePayload,
  MAX_PATH_PAYLOAD_LENGTH,
  REMOTE_SHARE_THRESHOLD,
} from './codec';
import {
  createRemoteShare,
  fetchRemoteShare,
  isRemoteShareId,
} from './remoteShare';
import { getShareRecord, previewText, saveShareRecord } from './storage';

/** Short, readable URL for the share popover (full URL is still copied). */
export function formatShareUrlForDisplay(result: ShareLinkResult): string {
  let origin: string;
  try {
    origin = new URL(result.url).origin;
  } catch {
    origin = window.location.origin;
  }

  if (result.hosted || result.localOnly) {
    return `${origin}/c/${result.displayId}`;
  }

  const pathPrefix = `${origin}/c/`;
  const payload = result.url.startsWith(pathPrefix)
    ? result.url.slice(pathPrefix.length)
    : result.url;

  if (payload.length <= 28) {
    return result.url;
  }

  return `${pathPrefix}${payload.slice(0, 14)}…${payload.slice(-10)}`;
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

  const displayId = createShareDisplayId(encoded);
  const origin = window.location.origin;

  saveShareRecord({
    id: displayId,
    encoded,
    createdAt: new Date().toISOString(),
    preview: previewText(original, modified),
  });

  if (encoded.length > REMOTE_SHARE_THRESHOLD) {
    const remoteId = await createRemoteShare(encoded);
    if (remoteId) {
      saveShareRecord({
        id: remoteId,
        encoded,
        createdAt: new Date().toISOString(),
        preview: previewText(original, modified),
      });

      return {
        url: `${origin}/c/${remoteId}`,
        displayId: remoteId,
        localOnly: false,
        hosted: true,
      };
    }
  }

  if (encoded.length <= MAX_PATH_PAYLOAD_LENGTH) {
    return {
      url: `${origin}/c/${encoded}`,
      displayId,
      localOnly: false,
    };
  }

  return {
    url: `${origin}/c/${displayId}#${encoded}`,
    displayId,
    localOnly: true,
  };
}

function payloadFromHash(): SharePayload | null {
  const hash = window.location.hash.slice(1);
  if (!hash) return null;
  return decodeSharePayload(hash);
}

function payloadFromPathSegment(segment: string): SharePayload | null {
  const fromPayload = decodeSharePayload(segment);
  if (fromPayload) return fromPayload;

  const stored = getShareRecord(segment);
  if (!stored) return null;
  return decodeSharePayload(stored.encoded);
}

/** Synchronous load: hash, inline path payload, or local storage only. */
export function loadSharedComparisonFromUrlSync(): SharePayload | null {
  const hashPayload = payloadFromHash();
  if (hashPayload) return hashPayload;

  const match = window.location.pathname.match(/^\/c\/([^/]+)\/?$/);
  if (!match?.[1]) return null;

  return payloadFromPathSegment(match[1]);
}

export async function loadSharedComparisonFromUrl(): Promise<SharePayload | null> {
  const syncPayload = loadSharedComparisonFromUrlSync();
  if (syncPayload) return syncPayload;

  const match = window.location.pathname.match(/^\/c\/([^/]+)\/?$/);
  const segment = match?.[1];
  if (!segment || !isRemoteShareId(segment)) return null;

  const encoded = await fetchRemoteShare(segment);
  if (!encoded) return null;

  const payload = decodeSharePayload(encoded);
  if (!payload) return null;

  saveShareRecord({
    id: segment,
    encoded,
    createdAt: new Date().toISOString(),
    preview: previewText(payload.original, payload.modified),
  });

  return payload;
}

export function isSharedComparisonUrl(): boolean {
  return (
    window.location.pathname.startsWith('/c/') ||
    window.location.hash.length > 1
  );
}

export function needsAsyncShareLoad(): boolean {
  if (!isSharedComparisonUrl()) return false;
  if (loadSharedComparisonFromUrlSync()) return false;

  const match = window.location.pathname.match(/^\/c\/([^/]+)\/?$/);
  const segment = match?.[1];
  return Boolean(segment && isRemoteShareId(segment));
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
  const payload = loadSharedComparisonFromUrlSync();
  if (!payload) {
    const match = window.location.pathname.match(/^\/c\/([^/]+)\/?$/);
    const segment = match?.[1];
    if (segment && isRemoteShareId(segment)) {
      return { displayId: segment, localOnly: false, hosted: true };
    }
    return null;
  }

  const encoded = encodeSharePayload({
    original: payload.original,
    modified: payload.modified,
    language: payload.language,
    tabSize: payload.tabSize,
    insertSpaces: payload.insertSpaces,
    theme: payload.theme,
  });

  const match = window.location.pathname.match(/^\/c\/([^/]+)\/?$/);
  const segment = match?.[1] ?? '';

  return {
    displayId: isRemoteShareId(segment) ? segment : createShareDisplayId(encoded),
    localOnly: window.location.hash.length > 1,
    hosted: isRemoteShareId(segment),
  };
}
