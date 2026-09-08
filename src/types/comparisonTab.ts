import type { ComparisonPhase } from '../hooks/useComparison';
import type { EditorSettings } from './editor';
import { DEFAULT_EDITOR_SETTINGS } from '../utils/editorConfig';

export const DEFAULT_TAB_TITLE = 'Untitled';
export const DEFAULT_ORIGINAL_LABEL = 'Untitled';
export const DEFAULT_MODIFIED_LABEL = 'Untitled';

export interface ComparisonSnapshot {
  original: string;
  modified: string;
}

export interface ComparisonTabState {
  id: string;
  title: string;
  titleCustomized: boolean;
  originalLabel: string;
  modifiedLabel: string;
  original: string;
  modified: string;
  phase: ComparisonPhase;
  snapshot: ComparisonSnapshot;
  compareVersion: number;
  settings: EditorSettings;
  scrollRatio: number;
  activeChangeIndex: number;
  splitRatio: number;
}

export function normalizeTabTitle(title: string): string {
  const trimmed = title.replace(/\s+/g, ' ').trim();
  return trimmed || DEFAULT_TAB_TITLE;
}

export function normalizePaneLabel(title: string, fallback: string): string {
  const trimmed = title.replace(/\s+/g, ' ').trim();
  return trimmed || fallback;
}

export function createComparisonTab(
  partial?: Partial<ComparisonTabState>,
): ComparisonTabState {
  const original = partial?.original ?? '';
  const modified = partial?.modified ?? '';
  const phase = partial?.phase ?? 'idle';
  const compareVersion = partial?.compareVersion ?? (phase === 'compared' ? 1 : 0);
  const titleCustomized = partial?.titleCustomized ?? false;
  const originalLabel =
    !partial?.originalLabel || partial.originalLabel === 'Original'
      ? DEFAULT_ORIGINAL_LABEL
      : partial.originalLabel;
  const modifiedLabel =
    !partial?.modifiedLabel || partial.modifiedLabel === 'Modified'
      ? DEFAULT_MODIFIED_LABEL
      : partial.modifiedLabel;

  return {
    id: partial?.id ?? crypto.randomUUID(),
    title: normalizeTabTitle(partial?.title ?? DEFAULT_TAB_TITLE),
    titleCustomized,
    originalLabel: normalizePaneLabel(
      originalLabel,
      DEFAULT_ORIGINAL_LABEL,
    ),
    modifiedLabel: normalizePaneLabel(
      modifiedLabel,
      DEFAULT_MODIFIED_LABEL,
    ),
    original,
    modified,
    phase,
    snapshot: {
      original: partial?.snapshot?.original ?? (phase === 'compared' ? original : ''),
      modified: partial?.snapshot?.modified ?? (phase === 'compared' ? modified : ''),
    },
    compareVersion,
    settings: { ...(partial?.settings ?? DEFAULT_EDITOR_SETTINGS) },
    scrollRatio: partial?.scrollRatio ?? 0,
    activeChangeIndex: partial?.activeChangeIndex ?? -1,
    splitRatio: partial?.splitRatio ?? 0.5,
  };
}
