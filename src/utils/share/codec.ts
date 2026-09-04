import {
  compressToEncodedURIComponent,
  decompressFromEncodedURIComponent,
} from 'lz-string';
import { applyPatch, createPatch } from 'diff';
import {
  SHARE_PAYLOAD_VERSION,
  type SharePayload,
} from '../../types/share';

interface WirePayloadV1 extends SharePayload {
  v: typeof SHARE_PAYLOAD_VERSION;
}

/** Compact on-the-wire format (shorter keys + optional patch). */
interface WirePayloadV2 {
  v: 2;
  o: string;
  m?: string;
  p?: string;
  l?: SharePayload['language'];
  t?: number;
  s?: boolean;
  h?: SharePayload['theme'];
}

type WirePayload = WirePayloadV1 | WirePayloadV2;

function compactMeta(payload: Omit<SharePayload, 'v' | 'original' | 'modified'>) {
  return {
    ...(payload.language !== undefined && { l: payload.language }),
    ...(payload.tabSize !== undefined && { t: payload.tabSize }),
    ...(payload.insertSpaces !== undefined && { s: payload.insertSpaces }),
    ...(payload.theme !== undefined && { h: payload.theme }),
  };
}

function expandMeta(wire: WirePayloadV2): Omit<SharePayload, 'v' | 'original' | 'modified'> {
  return {
    ...(wire.l !== undefined && { language: wire.l }),
    ...(wire.t !== undefined && { tabSize: wire.t }),
    ...(wire.s !== undefined && { insertSpaces: wire.s }),
    ...(wire.h !== undefined && { theme: wire.h }),
  };
}

function pickSmallerWire(
  payload: Omit<SharePayload, 'v'>,
): WirePayload {
  const meta = compactMeta(payload);
  const full: WirePayloadV2 = { v: 2, o: payload.original, m: payload.modified, ...meta };
  const fullJson = JSON.stringify(full);

  const patch = createPatch(
    'c',
    payload.original,
    payload.modified,
    undefined,
    undefined,
    { context: 1 },
  );

  if (patch) {
    const patched: WirePayloadV2 = { v: 2, o: payload.original, p: patch, ...meta };
    const patchedJson = JSON.stringify(patched);
    if (patchedJson.length < fullJson.length) {
      return patched;
    }
  }

  return full;
}

export function encodeSharePayload(payload: Omit<SharePayload, 'v'>): string {
  const wire = pickSmallerWire(payload);
  return compressToEncodedURIComponent(JSON.stringify(wire));
}

function decodeWirePayload(data: WirePayload): SharePayload | null {
  if (data.v === SHARE_PAYLOAD_VERSION) {
    if (typeof data.original !== 'string' || typeof data.modified !== 'string') {
      return null;
    }
    return data;
  }

  if (data.v === 2) {
    if (typeof data.o !== 'string') return null;

    let modified: string | false;
    if (typeof data.p === 'string') {
      modified = applyPatch(data.o, data.p);
    } else if (typeof data.m === 'string') {
      modified = data.m;
    } else {
      return null;
    }

    if (modified === false) return null;

    return {
      v: SHARE_PAYLOAD_VERSION,
      original: data.o,
      modified,
      ...expandMeta(data),
    };
  }

  return null;
}

export function decodeSharePayload(encoded: string): SharePayload | null {
  try {
    const json = decompressFromEncodedURIComponent(encoded);
    if (!json) return null;

    const data = JSON.parse(json) as WirePayload;
    return decodeWirePayload(data);
  } catch {
    return null;
  }
}

/** Max encoded length for a self-contained /c/<payload> path segment. */
export const MAX_PATH_PAYLOAD_LENGTH = 1800;

/** Try server-hosted short links when payload exceeds this size. */
export const REMOTE_SHARE_THRESHOLD = 400;

export function createShareDisplayId(encoded: string): string {
  let hash = 2166136261;

  for (let index = 0; index < encoded.length; index += 1) {
    hash ^= encoded.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let id = '';

  for (let index = 0; index < 6; index += 1) {
    id += alphabet[Math.abs(hash + index * 97) % alphabet.length];
  }

  return id;
}
