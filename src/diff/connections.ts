import type { DiffConnection, DiffType, LineDiffResult } from './diffTypes';

export function getDiffConnections(result: LineDiffResult): DiffConnection[] {
  return result.entries
    .filter((entry) => entry.type !== 'unchanged')
    .map((entry) => ({
      type: entry.type as Exclude<DiffType, 'unchanged'>,
      originalLine: entry.originalLine,
      modifiedLine: entry.modifiedLine,
    }));
}
