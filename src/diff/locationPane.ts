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

function segmentHeight(totalLines: number): number {
  return Math.max(100 / totalLines, 0.35);
}

function pushMarker(
  target: LocationMarker[],
  entry: LineDiffEntry,
  row: number,
  changeIndex: number,
  totalLines: number,
  kind: LocationMarkerKind,
) {
  const heightPercent = segmentHeight(totalLines);
  target.push({
    alignedLine: row,
    changeIndex,
    type: entry.type as Exclude<DiffType, 'unchanged'>,
    kind,
    topPercent: ((row - 1) / totalLines) * 100,
    heightPercent,
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

  let changePointer = 0;

  for (let index = 0; index < result.entries.length; index += 1) {
    const entry = result.entries[index]!;
    const row = index + 1;

    if (entry.type === 'unchanged') continue;

    const changeIndex = groups[changePointer]?.index ?? changePointer;
    changePointer += 1;

    if (entry.type === 'added') {
      pushMarker(original, entry, row, changeIndex, totalLines, 'blank');
      pushMarker(modified, entry, row, changeIndex, totalLines, 'content');
      continue;
    }

    if (entry.type === 'removed') {
      pushMarker(original, entry, row, changeIndex, totalLines, 'content');
      pushMarker(modified, entry, row, changeIndex, totalLines, 'blank');
      continue;
    }

    pushMarker(original, entry, row, changeIndex, totalLines, 'content');
    pushMarker(modified, entry, row, changeIndex, totalLines, 'content');
  }

  return {
    totalLines,
    originalTotalLines: totalLines,
    modifiedTotalLines: totalLines,
    original,
    modified,
  };
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
  let changePointer = 0;

  for (const entry of result.entries) {
    if (entry.type === 'unchanged') {
      origLine += 1;
      modLine += 1;
      continue;
    }

    const changeIndex = groups[changePointer]?.index ?? changePointer;
    changePointer += 1;

    if (entry.type === 'added') {
      modLine += 1;
      const total = Math.max(modLine, 1);
      modified.push({
        alignedLine: modLine,
        changeIndex,
        type: 'added',
        kind: 'content',
        topPercent: ((modLine - 1) / total) * 100,
        heightPercent: segmentHeight(total),
      });
      continue;
    }

    if (entry.type === 'removed') {
      origLine += 1;
      const total = Math.max(origLine, 1);
      original.push({
        alignedLine: origLine,
        changeIndex,
        type: 'removed',
        kind: 'content',
        topPercent: ((origLine - 1) / total) * 100,
        heightPercent: segmentHeight(total),
      });
      continue;
    }

    origLine += 1;
    modLine += 1;
    const origTotal = Math.max(origLine, 1);
    const modTotal = Math.max(modLine, 1);
    original.push({
      alignedLine: origLine,
      changeIndex,
      type: 'modified',
      kind: 'content',
      topPercent: ((origLine - 1) / origTotal) * 100,
      heightPercent: segmentHeight(origTotal),
    });
    modified.push({
      alignedLine: modLine,
      changeIndex,
      type: 'modified',
      kind: 'content',
      topPercent: ((modLine - 1) / modTotal) * 100,
      heightPercent: segmentHeight(modTotal),
    });
  }

  const originalTotalLines = Math.max(origLine, 1);
  const modifiedTotalLines = Math.max(modLine, 1);
  const totalLines = Math.max(originalTotalLines, modifiedTotalLines);

  for (const marker of original) {
    marker.topPercent = ((marker.alignedLine - 1) / originalTotalLines) * 100;
    marker.heightPercent = segmentHeight(originalTotalLines);
  }

  for (const marker of modified) {
    marker.topPercent = ((marker.alignedLine - 1) / modifiedTotalLines) * 100;
    marker.heightPercent = segmentHeight(modifiedTotalLines);
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
