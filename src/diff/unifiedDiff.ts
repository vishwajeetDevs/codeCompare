import { createTwoFilesPatch } from 'diff';

export function createUnifiedDiff(
  original: string,
  modified: string,
  originalLabel = 'original',
  modifiedLabel = 'modified',
): string {
  return createTwoFilesPatch(
    originalLabel,
    modifiedLabel,
    original,
    modified,
    undefined,
    undefined,
    { context: 3 },
  );
}
