import { diffChars } from 'diff';

export interface CharDiffHighlight {
  start: number;
  end: number;
}

export interface CharDiffResult {
  /** Ranges to highlight in the original string (removed/changed chars) */
  original: CharDiffHighlight[];
  /** Ranges to highlight in the modified string (added/changed chars) */
  modified: CharDiffHighlight[];
}

export function computeCharDiff(
  original: string,
  modified: string,
): CharDiffResult {
  const changes = diffChars(original, modified);
  const originalHighlights: CharDiffHighlight[] = [];
  const modifiedHighlights: CharDiffHighlight[] = [];

  let originalIndex = 0;
  let modifiedIndex = 0;

  for (const change of changes) {
    const length = change.value.length;

    if (change.removed) {
      originalHighlights.push({
        start: originalIndex,
        end: originalIndex + length,
      });
      originalIndex += length;
      continue;
    }

    if (change.added) {
      modifiedHighlights.push({
        start: modifiedIndex,
        end: modifiedIndex + length,
      });
      modifiedIndex += length;
      continue;
    }

    originalIndex += length;
    modifiedIndex += length;
  }

  return {
    original: originalHighlights,
    modified: modifiedHighlights,
  };
}
