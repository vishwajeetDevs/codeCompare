import type { LineDiffEntry, LineDiffResult } from './diffTypes';

function splitLines(value: string): string[] {
  if (value.length === 0) return [];
  return value.split('\n');
}

export function getChangeEntryAtLine(
  result: LineDiffResult,
  alignedLine: number,
): LineDiffEntry | null {
  if (alignedLine < 1) return null;
  return result.entries[alignedLine - 1] ?? null;
}

export function canMoveChangeToLeft(entry: LineDiffEntry | null): boolean {
  return (
    entry != null &&
    entry.type !== 'unchanged' &&
    entry.type !== 'removed'
  );
}

export function canMoveChangeToRight(entry: LineDiffEntry | null): boolean {
  return (
    entry != null &&
    entry.type !== 'unchanged' &&
    entry.type !== 'added'
  );
}

/** Copy the modified-side line to the original side at the aligned row. */
export function applyMoveToLeft(
  alignedOriginal: string,
  alignedModified: string,
  alignedLine: number,
): { original: string; modified: string } | null {
  const index = alignedLine - 1;
  if (index < 0) return null;

  const origLines = splitLines(alignedOriginal);
  const modLines = splitLines(alignedModified);
  const modifiedLine = modLines[index];
  if (modifiedLine === undefined) return null;

  origLines[index] = modifiedLine;
  return {
    original: origLines.join('\n'),
    modified: alignedModified,
  };
}

/** Copy the original-side line to the modified side at the aligned row. */
export function applyMoveToRight(
  alignedOriginal: string,
  alignedModified: string,
  alignedLine: number,
): { original: string; modified: string } | null {
  const index = alignedLine - 1;
  if (index < 0) return null;

  const origLines = splitLines(alignedOriginal);
  const modLines = splitLines(alignedModified);
  const originalLine = origLines[index];
  if (originalLine === undefined) return null;

  modLines[index] = originalLine;
  return {
    original: alignedOriginal,
    modified: modLines.join('\n'),
  };
}
