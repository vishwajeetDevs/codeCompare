import type { ComparisonStats, LineDiffResult } from './diffTypes';

export type { ComparisonStats };

export function computeComparisonStats(result: LineDiffResult): ComparisonStats {
  return {
    added: result.addedLines.length,
    removed: result.removedLines.length,
    modified: result.modifiedOriginalLines.length,
    unchanged: result.entries.filter((entry) => entry.type === 'unchanged').length,
  };
}
