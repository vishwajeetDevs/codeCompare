import { diffLines } from 'diff';
import { isBlankLine, stripTrailingBlankLines } from './alignTexts';
import type { DiffType, LineDiffEntry, LineDiffResult } from './diffTypes';

function splitIntoLines(value: string): string[] {
  if (value.length === 0) return [];
  const lines = value.split('\n');
  if (lines.at(-1) === '') lines.pop();
  return lines;
}

interface Segment {
  type: 'added' | 'removed' | 'unchanged';
  lines: string[];
}

type AlignOp =
  | { type: 'unchanged'; content: string }
  | { type: 'removed'; content: string }
  | { type: 'added'; content: string }
  | { type: 'modified'; original: string; modified: string };

function linesEquivalent(a: string, b: string): boolean {
  if (a === b) return true;
  return isBlankLine(a) && isBlankLine(b);
}

/**
 * Identify structured property lines independently of their values.
 * This lets JSON/YAML/object fields stay aligned when a value changes or when
 * adding the next field causes the previous line to gain a trailing comma.
 */
function structuredLineKey(line: string): string | null {
  const property = line.match(
    /^(\s*)(?:"([^"]+)"|'([^']+)'|([\w.-]+))\s*:/,
  );
  if (property) {
    const indentation = property[1]?.length ?? 0;
    const key = property[2] ?? property[3] ?? property[4];
    return `property:${indentation}:${key}`;
  }

  const trimmed = line.trim();
  if (/^[}\]],?$/.test(trimmed)) {
    return `delimiter:${trimmed.replace(/,$/, '')}`;
  }

  return null;
}

function linesAlignable(a: string, b: string): boolean {
  if (linesEquivalent(a, b)) return true;
  const aKey = structuredLineKey(a);
  return aKey !== null && aKey === structuredLineKey(b);
}

function toSegments(original: string, modified: string): Segment[] {
  return diffLines(original, modified).map((change) => ({
    type: change.added ? 'added' : change.removed ? 'removed' : 'unchanged',
    lines: splitIntoLines(change.value),
  }));
}

function lcsAlign(removed: string[], added: string[]): AlignOp[] {
  const m = removed.length;
  const n = added.length;
  const dp = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));

  for (let i = 1; i <= m; i += 1) {
    for (let j = 1; j <= n; j += 1) {
      if (linesAlignable(removed[i - 1]!, added[j - 1]!)) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  const stack: AlignOp[] = [];
  let i = m;
  let j = n;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && linesAlignable(removed[i - 1]!, added[j - 1]!)) {
      const original = removed[i - 1]!;
      const modified = added[j - 1]!;
      if (linesEquivalent(original, modified)) {
        stack.push({ type: 'unchanged', content: original });
      } else {
        stack.push({ type: 'modified', original, modified });
      }
      i -= 1;
      j -= 1;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      stack.push({ type: 'added', content: added[j - 1] });
      j -= 1;
    } else {
      stack.push({ type: 'removed', content: removed[i - 1] });
      i -= 1;
    }
  }

  return stack.reverse();
}

function lcsLength(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () =>
    new Array<number>(n + 1).fill(0),
  );

  for (let i = 1; i <= m; i += 1) {
    for (let j = 1; j <= n; j += 1) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  return dp[m][n];
}

/** 0–1 score: how alike two lines are (used to avoid false "modified" pairings). */
function lineSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return lcsLength(a, b) / maxLen;
}

const MODIFIED_SIMILARITY_THRESHOLD = 0.45;

function shouldTreatAsModified(original: string, modified: string): boolean {
  if (isBlankLine(original) && isBlankLine(modified)) return false;
  return lineSimilarity(original, modified) >= MODIFIED_SIMILARITY_THRESHOLD;
}

/** Pair adjacent remove+add ops only when lines are genuinely similar. */
function mergeToModified(ops: AlignOp[]): AlignOp[] {
  const merged: AlignOp[] = [];

  for (let index = 0; index < ops.length; index += 1) {
    const current = ops[index];
    const next = ops[index + 1];

    if (
      current.type === 'removed' &&
      next?.type === 'added' &&
      isBlankLine(current.content) &&
      isBlankLine(next.content)
    ) {
      merged.push({ type: 'unchanged', content: '' });
      index += 1;
      continue;
    }

    if (
      current.type === 'removed' &&
      next?.type === 'added' &&
      shouldTreatAsModified(current.content, next.content)
    ) {
      merged.push({
        type: 'modified',
        original: current.content,
        modified: next.content,
      });
      index += 1;
      continue;
    }

    merged.push(current);
  }

  return merged;
}

function alignHunk(removed: string[], added: string[]): AlignOp[] {
  if (removed.length === 0) {
    return added.map((content) =>
      isBlankLine(content)
        ? { type: 'unchanged', content: '' }
        : { type: 'added', content },
    );
  }
  if (added.length === 0) {
    return removed.map((content) =>
      isBlankLine(content)
        ? { type: 'unchanged', content: '' }
        : { type: 'removed', content },
    );
  }

  if (removed.length === added.length) {
    const ops: AlignOp[] = [];
    for (let index = 0; index < removed.length; index += 1) {
      const original = removed[index]!;
      const modifiedLine = added[index]!;
      if (linesEquivalent(original, modifiedLine)) {
        ops.push({ type: 'unchanged', content: original });
      } else if (shouldTreatAsModified(original, modifiedLine)) {
        ops.push({ type: 'modified', original, modified: modifiedLine });
      } else {
        ops.push({ type: 'removed', content: original });
        ops.push({ type: 'added', content: modifiedLine });
      }
    }
    return ops;
  }

  return mergeToModified(lcsAlign(removed, added));
}

function pushEntry(
  entries: LineDiffEntry[],
  type: DiffType,
  content: string,
  originalLine: number,
  modifiedLine: number,
  originalContent?: string,
  modifiedContent?: string,
): { originalLine: number; modifiedLine: number } {
  const entry: LineDiffEntry = { type, content };

  if (type === 'unchanged') {
    entry.originalLine = originalLine;
    entry.modifiedLine = modifiedLine;
    entries.push(entry);
    return { originalLine: originalLine + 1, modifiedLine: modifiedLine + 1 };
  }

  if (type === 'removed') {
    entry.originalLine = originalLine;
    entries.push(entry);
    return { originalLine: originalLine + 1, modifiedLine };
  }

  if (type === 'added') {
    entry.modifiedLine = modifiedLine;
    entries.push(entry);
    return { originalLine, modifiedLine: modifiedLine + 1 };
  }

  entry.originalContent = originalContent;
  entry.modifiedContent = modifiedContent;
  entry.content = originalContent ?? content;
  entry.originalLine = originalLine;
  entry.modifiedLine = modifiedLine;
  entries.push(entry);
  return { originalLine: originalLine + 1, modifiedLine: modifiedLine + 1 };
}

export function computeLineDiff(
  original: string,
  modified: string,
): LineDiffResult {
  const segments = toSegments(
    stripTrailingBlankLines(original),
    stripTrailingBlankLines(modified),
  );
  const entries: LineDiffEntry[] = [];
  const removedLines: number[] = [];
  const addedLines: number[] = [];
  const modifiedOriginalLines: number[] = [];
  const modifiedModifiedLines: number[] = [];

  let originalLine = 1;
  let modifiedLine = 1;
  let index = 0;

  while (index < segments.length) {
    const segment = segments[index];

    if (segment.type === 'unchanged') {
      for (const content of segment.lines) {
        const next = pushEntry(
          entries,
          'unchanged',
          content,
          originalLine,
          modifiedLine,
        );
        originalLine = next.originalLine;
        modifiedLine = next.modifiedLine;
      }
      index += 1;
      continue;
    }

    const removed: string[] = [];
    const added: string[] = [];

    while (index < segments.length && segments[index].type !== 'unchanged') {
      const hunkSegment = segments[index];
      if (hunkSegment.type === 'removed') {
        removed.push(...hunkSegment.lines);
      } else {
        added.push(...hunkSegment.lines);
      }
      index += 1;
    }

    for (const op of alignHunk(removed, added)) {
      if (op.type === 'unchanged') {
        const next = pushEntry(
          entries,
          'unchanged',
          op.content,
          originalLine,
          modifiedLine,
        );
        originalLine = next.originalLine;
        modifiedLine = next.modifiedLine;
      } else if (op.type === 'removed') {
        removedLines.push(originalLine);
        const next = pushEntry(
          entries,
          'removed',
          op.content,
          originalLine,
          modifiedLine,
        );
        originalLine = next.originalLine;
        modifiedLine = next.modifiedLine;
      } else if (op.type === 'added') {
        addedLines.push(modifiedLine);
        const next = pushEntry(
          entries,
          'added',
          op.content,
          originalLine,
          modifiedLine,
        );
        originalLine = next.originalLine;
        modifiedLine = next.modifiedLine;
      } else {
        modifiedOriginalLines.push(originalLine);
        modifiedModifiedLines.push(modifiedLine);
        const next = pushEntry(
          entries,
          'modified',
          op.original,
          originalLine,
          modifiedLine,
          op.original,
          op.modified,
        );
        originalLine = next.originalLine;
        modifiedLine = next.modifiedLine;
      }
    }
  }

  return {
    entries,
    removedLines,
    addedLines,
    modifiedOriginalLines,
    modifiedModifiedLines,
  };
}

/** Empty diff result used before the user runs an explicit comparison. */
export function createEmptyLineDiffResult(): LineDiffResult {
  return {
    entries: [],
    removedLines: [],
    addedLines: [],
    modifiedOriginalLines: [],
    modifiedModifiedLines: [],
  };
}
