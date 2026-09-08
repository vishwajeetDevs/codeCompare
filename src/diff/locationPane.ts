import type { ChangeGroup } from './changeGroups';
import type { DiffType, LineDiffEntry, LineDiffResult } from './diffTypes';

export type LocationMarkerKind = 'content' | 'blank';

export interface LocationMarker {
  alignedLine: number;
  changeIndex: number;
  type: Exclude<DiffType, 'unchanged'>;
  kind: LocationMarkerKind;
  topPercent: number;
  heightPercent: number;
}

export interface LocationPaneModel {
  totalLines: number;
  originalTotalLines: number;
  modifiedTotalLines: number;
  original: LocationMarker[];
  modified: LocationMarker[];
}

function blockHeightPercent(
  startLine: number,
  endLine: number,
  totalLines: number,
): number {
  const lineCount = endLine - startLine + 1;
  return Math.max((lineCount / totalLines) * 100, 0.35);
}

function blockTopPercent(startLine: number, totalLines: number): number {
  return ((startLine - 1) / totalLines) * 100;
}

function sideKindForBlock(
  entries: LineDiffEntry[],
  startIndex: number,
  endIndex: number,
  side: 'original' | 'modified',
): LocationMarkerKind {
  for (let index = startIndex; index <= endIndex; index += 1) {
    const entry = entries[index]!;
    if (side === 'original') {
      if (entry.type === 'removed' || entry.type === 'modified') return 'content';
    } else if (entry.type === 'added' || entry.type === 'modified') {
      return 'content';
    }
  }
  return 'blank';
}

function pushBlockMarker(
  target: LocationMarker[],
  group: ChangeGroup,
  totalLines: number,
  kind: LocationMarkerKind,
) {
  target.push({
    alignedLine: group.alignedLineStart,
    changeIndex: group.index,
    type: group.type,
    kind,
    topPercent: blockTopPercent(group.alignedLineStart, totalLines),
    heightPercent: blockHeightPercent(
      group.alignedLineStart,
      group.alignedLineEnd,
      totalLines,
    ),
  });
}

/** Build minimap markers for both panes from an aligned diff result. */
export function buildLocationPaneModel(
  result: LineDiffResult,
  groups: ChangeGroup[],
): LocationPaneModel {
  const totalLines = Math.max(result.entries.length, 1);
  const original: LocationMarker[] = [];
  const modified: LocationMarker[] = [];

  for (const group of groups) {
    const startIndex = group.alignedLineStart - 1;
    const endIndex = group.alignedLineEnd - 1;

    pushBlockMarker(
      original,
      group,
      totalLines,
      sideKindForBlock(result.entries, startIndex, endIndex, 'original'),
    );
    pushBlockMarker(
      modified,
      group,
      totalLines,
      sideKindForBlock(result.entries, startIndex, endIndex, 'modified'),
    );
  }

  return {
    totalLines,
    originalTotalLines: totalLines,
    modifiedTotalLines: totalLines,
    original,
    modified,
  };
}

function collectRawBlockLines(
  entries: LineDiffEntry[],
  startIndex: number,
  endIndex: number,
): {
  originalLines: number[];
  modifiedLines: number[];
} {
  const originalLines: number[] = [];
  const modifiedLines: number[] = [];
  let origLine = 0;
  let modLine = 0;

  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index]!;

    if (entry.type === 'unchanged') {
      origLine += 1;
      modLine += 1;
      continue;
    }

    if (entry.type === 'added') {
      modLine += 1;
      if (index >= startIndex && index <= endIndex) modifiedLines.push(modLine);
      continue;
    }

    if (entry.type === 'removed') {
      origLine += 1;
      if (index >= startIndex && index <= endIndex) originalLines.push(origLine);
      continue;
    }

    origLine += 1;
    modLine += 1;
    if (index >= startIndex && index <= endIndex) {
      originalLines.push(origLine);
      modifiedLines.push(modLine);
    }
  }

  return { originalLines, modifiedLines };
}

function pushRawBlockMarker(
  target: LocationMarker[],
  group: ChangeGroup,
  lines: number[],
  totalLines: number,
  kind: LocationMarkerKind,
) {
  if (lines.length === 0) return;

  const startLine = Math.min(...lines);
  const endLine = Math.max(...lines);

  target.push({
    alignedLine: startLine,
    changeIndex: group.index,
    type: group.type,
    kind,
    topPercent: blockTopPercent(startLine, totalLines),
    heightPercent: blockHeightPercent(startLine, endLine, totalLines),
  });
}

/** Build minimap markers when editors are not vertically aligned (single-pane or raw view). */
export function buildLocationPaneModelRaw(
  result: LineDiffResult,
  groups: ChangeGroup[],
): LocationPaneModel {
  const original: LocationMarker[] = [];
  const modified: LocationMarker[] = [];
  let origLine = 0;
  let modLine = 0;

  for (const entry of result.entries) {
    if (entry.type === 'unchanged') {
      origLine += 1;
      modLine += 1;
      continue;
    }

    if (entry.type === 'added') {
      modLine += 1;
      continue;
    }

    if (entry.type === 'removed') {
      origLine += 1;
      continue;
    }

    origLine += 1;
    modLine += 1;
  }

  const originalTotalLines = Math.max(origLine, 1);
  const modifiedTotalLines = Math.max(modLine, 1);
  const totalLines = Math.max(originalTotalLines, modifiedTotalLines);

  for (const group of groups) {
    const startIndex = group.alignedLineStart - 1;
    const endIndex = group.alignedLineEnd - 1;
    const { originalLines, modifiedLines } = collectRawBlockLines(
      result.entries,
      startIndex,
      endIndex,
    );

    pushRawBlockMarker(
      original,
      group,
      originalLines,
      originalTotalLines,
      originalLines.length > 0 ? 'content' : 'blank',
    );
    pushRawBlockMarker(
      modified,
      group,
      modifiedLines,
      modifiedTotalLines,
      modifiedLines.length > 0 ? 'content' : 'blank',
    );
  }

  return {
    totalLines,
    originalTotalLines,
    modifiedTotalLines,
    original,
    modified,
  };
}

export function scrollRatioFromMetrics(metrics: {
  scrollTop: number;
  scrollHeight: number;
  viewportHeight: number;
}): { topPercent: number; heightPercent: number } {
  const topPercent = (metrics.scrollTop / metrics.scrollHeight) * 100;
  const heightPercent = (metrics.viewportHeight / metrics.scrollHeight) * 100;
  return {
    topPercent: Math.min(Math.max(topPercent, 0), 100),
    heightPercent: Math.min(Math.max(heightPercent, 2), 100),
  };
}

export function ratioFromPointer(
  clientY: number,
  rect: DOMRect,
): number {
  const ratio = (clientY - rect.top) / rect.height;
  return Math.min(Math.max(ratio, 0), 1);
}
