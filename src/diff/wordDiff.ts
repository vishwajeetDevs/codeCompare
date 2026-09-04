import { diffWordsWithSpace } from 'diff';

export interface WordDiffHighlight {
  start: number;
  end: number;
}

export interface WordDiffResult {
  original: WordDiffHighlight[];
  modified: WordDiffHighlight[];
}

export function computeWordDiff(
  original: string,
  modified: string,
): WordDiffResult {
  const changes = diffWordsWithSpace(original, modified);
  const originalHighlights: WordDiffHighlight[] = [];
  const modifiedHighlights: WordDiffHighlight[] = [];

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

  return { original: originalHighlights, modified: modifiedHighlights };
}
