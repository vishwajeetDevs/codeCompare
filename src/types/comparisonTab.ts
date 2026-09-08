import type { ComparisonPhase } from '../hooks/useComparison';
import type { EditorSettings } from './editor';
import { DEFAULT_EDITOR_SETTINGS } from '../utils/editorConfig';

export const DEFAULT_TAB_TITLE = 'Untitled';

export interface ComparisonSnapshot {
  original: string;
  modified: string;
}

export interface ComparisonTabState {
  id: string;
  title: string;
  titleCustomized: boolean;
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

export function createComparisonTab(
  partial?: Partial<ComparisonTabState>,
): ComparisonTabState {
  const original = partial?.original ?? '';
  const modified = partial?.modified ?? '';
  const phase = partial?.phase ?? 'idle';
  const compareVersion = partial?.compareVersion ?? (phase === 'compared' ? 1 : 0);
  const titleCustomized = partial?.titleCustomized ?? false;

  return {
    id: partial?.id ?? crypto.randomUUID(),
    title: normalizeTabTitle(partial?.title ?? DEFAULT_TAB_TITLE),
    titleCustomized,
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
