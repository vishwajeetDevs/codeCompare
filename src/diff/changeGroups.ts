import type { DiffType, LineDiffResult } from './diffTypes';

export interface ChangeGroup {
  index: number;
  type: Exclude<DiffType, 'unchanged'>;
  alignedLine: number;
}

/** Build sequential change groups from an aligned diff result (one group per changed row). */
export function buildChangeGroups(result: LineDiffResult): ChangeGroup[] {
  const groups: ChangeGroup[] = [];
  let row = 0;

  for (const entry of result.entries) {
    row += 1;
    if (entry.type === 'unchanged') continue;

    groups.push({
      index: groups.length,
      type: entry.type,
      alignedLine: row,
    });
  }

  return groups;
}
