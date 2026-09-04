export interface CompareState {
  original: string;
  modified: string;
}

export * from './editor';
export * from './share';
export type {
  DiffType,
  LineDiffEntry,
  LineDiffResult,
  DiffConnection,
  ConnectorPath,
  ComparisonStats,
} from '../diff/diffTypes';

export type ThemeMode = 'dark' | 'light';

export type MobileEditorView = 'original' | 'modified' | 'diff';

export type DownloadKind = 'original' | 'modified' | 'diff' | 'report';
