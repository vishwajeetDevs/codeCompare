import type { StoredShare } from '../../types/share';

const STORAGE_KEY = 'codecompare:shares';
const MAX_STORED = 20;

function readStore(): StoredShare[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredShare[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeStore(items: StoredShare[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_STORED)));
}

export function saveShareRecord(record: StoredShare): void {
  const items = readStore().filter((item) => item.id !== record.id);
  items.unshift(record);
  writeStore(items);
}

export function getShareRecord(id: string): StoredShare | null {
  return readStore().find((item) => item.id === id) ?? null;
}

export function listRecentShares(): StoredShare[] {
  return readStore();
}

export function previewText(original: string, modified: string): string {
  const line =
    original.split('\n').find((entry) => entry.trim()) ??
    modified.split('\n').find((entry) => entry.trim()) ??
    'Empty comparison';
  return line.trim().slice(0, 80);
}
