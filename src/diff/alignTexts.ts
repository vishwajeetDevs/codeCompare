import type { LineDiffEntry, LineDiffResult } from './diffTypes';

function splitLines(value: string): string[] {
  if (value.length === 0) return [];
  const lines = value.split('\n');
  if (lines.at(-1) === '') lines.pop();
  return lines;
}

export { splitLines };

/** True when a line is empty or contains only whitespace. */
export function isBlankLine(line: string): boolean {
  return line.trim() === '';
}

/** Remove trailing whitespace-only lines (prevents blank-line diff growth on refresh). */
export function stripTrailingBlankLines(text: string): string {
  const lines = splitLines(text);
  while (lines.length > 0 && lines[lines.length - 1]!.trim() === '') {
    lines.pop();
  }
  return lines.join('\n');
}

function stripTrailingFromLineArray(lines: string[]): string[] {
  const result = [...lines];
  while (result.length > 0 && result[result.length - 1]!.trim() === '') {
    result.pop();
  }
  return result;
}

function isPaddingRow(entry: LineDiffEntry, pane: 'original' | 'modified'): boolean {
  return pane === 'original' ? entry.type === 'added' : entry.type === 'removed';
}

/**
 * Extract raw text from one aligned editor pane.
 * Skips empty alignment-padding rows but preserves real content that drifted onto them.
 */
function extractPaneRaw(
  lines: string[],
  entries: LineDiffEntry[],
  pane: 'original' | 'modified',
): string[] {
  const raw: string[] = [];

  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index]!;
    const line = lines[index] ?? '';

    if (isPaddingRow(entry, pane)) {
      if (line.trim() !== '') {
        raw.push(line);
      }
      continue;
    }

    raw.push(line);
  }

  for (let index = entries.length; index < lines.length; index += 1) {
    const line = lines[index] ?? '';
    if (line.trim() !== '') {
      raw.push(line);
    }
  }

  return stripTrailingFromLineArray(raw);
}

export interface AlignedDiffView {
  original: string;
  modified: string;
  result: LineDiffResult;
}

/** Build side-by-side texts with blank padding rows so both panes stay vertically aligned. */
export function buildAlignedView(rawResult: LineDiffResult): AlignedDiffView {
  const originalLines: string[] = [];
  const modifiedLines: string[] = [];
  const entries: LineDiffEntry[] = [];
  const removedLines: number[] = [];
  const addedLines: number[] = [];
  const modifiedOriginalLines: number[] = [];
  const modifiedModifiedLines: number[] = [];

  let row = 0;

  for (const entry of rawResult.entries) {
    row += 1;

    if (entry.type === 'unchanged') {
      originalLines.push(entry.content);
      modifiedLines.push(entry.content);
      entries.push({
        type: 'unchanged',
        content: entry.content,
        originalLine: row,
        modifiedLine: row,
      });
      continue;
    }

    if (entry.type === 'added') {
      originalLines.push('');
      modifiedLines.push(entry.content);
      addedLines.push(row);
      entries.push({
        type: 'added',
        content: entry.content,
        modifiedLine: row,
      });
      continue;
    }

    if (entry.type === 'removed') {
      originalLines.push(entry.content);
      modifiedLines.push('');
      removedLines.push(row);
      entries.push({
        type: 'removed',
        content: entry.content,
        originalLine: row,
      });
      continue;
    }

    const originalText = entry.originalContent ?? entry.content;
    const modifiedText = entry.modifiedContent ?? entry.content;
    originalLines.push(originalText);
    modifiedLines.push(modifiedText);
    modifiedOriginalLines.push(row);
    modifiedModifiedLines.push(row);
    entries.push({
      type: 'modified',
      content: originalText,
      originalContent: originalText,
      modifiedContent: modifiedText,
      originalLine: row,
      modifiedLine: row,
    });
  }

  return {
    original: originalLines.join('\n'),
    modified: modifiedLines.join('\n'),
    result: {
      entries,
      removedLines,
      addedLines,
      modifiedOriginalLines,
      modifiedModifiedLines,
    },
  };
}

/** Map aligned editor content back to raw original/modified (strips padding blanks). */
export function alignedToRaw(
  alignedOriginal: string,
  alignedModified: string,
  alignedResult: LineDiffResult,
): { original: string; modified: string } {
  return alignedEditorsToRaw(alignedOriginal, alignedModified, alignedResult);
}

/**
 * Map aligned editor buffers back to raw original/modified.
 * Preserves content on padding rows when alignment drifted during editing.
 */
export function alignedEditorsToRaw(
  alignedOriginal: string,
  alignedModified: string,
  alignedResult: LineDiffResult,
): { original: string; modified: string } {
  const origLines = splitLines(alignedOriginal);
  const modLines = splitLines(alignedModified);

  return {
    original: stripTrailingBlankLines(
      extractPaneRaw(origLines, alignedResult.entries, 'original').join('\n'),
    ),
    modified: stripTrailingBlankLines(
      extractPaneRaw(modLines, alignedResult.entries, 'modified').join('\n'),
    ),
  };
}
