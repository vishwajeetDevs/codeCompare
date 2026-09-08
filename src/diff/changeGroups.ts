import type { DiffType, LineDiffResult } from './diffTypes';

export interface ChangeGroup {
  index: number;
  type: Exclude<DiffType, 'unchanged'>;
  /** Center line used for scrolling the block into view. */
  alignedLine: number;
  alignedLineStart: number;
  alignedLineEnd: number;
}

function resolveBlockType(
  types: Set<Exclude<DiffType, 'unchanged'>>,
): Exclude<DiffType, 'unchanged'> {
  if (types.size === 1) return [...types][0]!;
  return 'modified';
}

function shouldExtendBlock(
  blockEndType: Exclude<DiffType, 'unchanged'>,
  nextType: Exclude<DiffType, 'unchanged'>,
): boolean {
  if (blockEndType === nextType) return true;
  // Adjacent removed→added rows form one replace hunk (blank padding on each side).
  if (blockEndType === 'removed' && nextType === 'added') return true;
  return false;
}

/**
 * Build navigation groups from an aligned diff result.
 * Groups split on unchanged lines and on change-type boundaries so blank padding
 * rows do not merge unrelated edits into one stop.
 */
export function buildChangeGroups(result: LineDiffResult): ChangeGroup[] {
  const groups: ChangeGroup[] = [];
  let row = 0;
  let blockStart: number | null = null;
  let blockEnd = 0;
  let blockEndType: Exclude<DiffType, 'unchanged'> | null = null;
  const blockTypes = new Set<Exclude<DiffType, 'unchanged'>>();

  const flushBlock = () => {
    if (blockStart === null || blockEndType === null) return;

    const alignedLineStart = blockStart;
    const alignedLineEnd = blockEnd;
    groups.push({
      index: groups.length,
      type: resolveBlockType(blockTypes),
      alignedLine: Math.round((alignedLineStart + alignedLineEnd) / 2),
      alignedLineStart,
      alignedLineEnd,
    });

    blockStart = null;
    blockEnd = 0;
    blockEndType = null;
    blockTypes.clear();
  };

  const startBlock = (
    line: number,
    type: Exclude<DiffType, 'unchanged'>,
  ) => {
    blockStart = line;
    blockEnd = line;
    blockEndType = type;
    blockTypes.clear();
    blockTypes.add(type);
  };

  const extendBlock = (
    line: number,
    type: Exclude<DiffType, 'unchanged'>,
  ) => {
    blockEnd = line;
    blockEndType = type;
    blockTypes.add(type);
  };

  for (const entry of result.entries) {
    row += 1;

    if (entry.type === 'unchanged') {
      flushBlock();
      continue;
    }

    if (blockStart === null) {
      startBlock(row, entry.type);
      continue;
    }

    if (shouldExtendBlock(blockEndType!, entry.type)) {
      extendBlock(row, entry.type);
      continue;
    }

    flushBlock();
    startBlock(row, entry.type);
  }

  flushBlock();

  return groups;
}
