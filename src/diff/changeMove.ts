import type { ChangeGroup } from './changeGroups';
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

export function getChangeGroupForLine(
  groups: ChangeGroup[],
  alignedLine: number,
): ChangeGroup | null {
  return (
    groups.find(
      (group) =>
        alignedLine >= group.alignedLineStart &&
        alignedLine <= group.alignedLineEnd,
    ) ?? null
  );
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

export function canMoveBlockToLeft(
  result: LineDiffResult,
  group: ChangeGroup,
): boolean {
  for (let line = group.alignedLineStart; line <= group.alignedLineEnd; line += 1) {
    if (canMoveChangeToLeft(getChangeEntryAtLine(result, line))) return true;
  }
  return false;
}

export function canMoveBlockToRight(
  result: LineDiffResult,
  group: ChangeGroup,
): boolean {
  for (let line = group.alignedLineStart; line <= group.alignedLineEnd; line += 1) {
    if (canMoveChangeToRight(getChangeEntryAtLine(result, line))) return true;
  }
  return false;
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

/** Copy all applicable modified-side lines in a block to the original pane. */
export function applyMoveBlockToLeft(
  alignedOriginal: string,
  alignedModified: string,
  result: LineDiffResult,
  group: ChangeGroup,
): { original: string; modified: string } | null {
  let original = alignedOriginal;
  let modified = alignedModified;
  let changed = false;

  for (let line = group.alignedLineStart; line <= group.alignedLineEnd; line += 1) {
    const entry = getChangeEntryAtLine(result, line);
    if (!canMoveChangeToLeft(entry)) continue;

    const next = applyMoveToLeft(original, modified, line);
    if (!next) continue;

    original = next.original;
    modified = next.modified;
    changed = true;
  }

  return changed ? { original, modified } : null;
}

/** Copy all applicable original-side lines in a block to the modified pane. */
export function applyMoveBlockToRight(
  alignedOriginal: string,
  alignedModified: string,
  result: LineDiffResult,
  group: ChangeGroup,
): { original: string; modified: string } | null {
  let original = alignedOriginal;
  let modified = alignedModified;
  let changed = false;

  for (let line = group.alignedLineStart; line <= group.alignedLineEnd; line += 1) {
    const entry = getChangeEntryAtLine(result, line);
    if (!canMoveChangeToRight(entry)) continue;

    const next = applyMoveToRight(original, modified, line);
    if (!next) continue;

    original = next.original;
    modified = next.modified;
    changed = true;
  }

  return changed ? { original, modified } : null;
}
