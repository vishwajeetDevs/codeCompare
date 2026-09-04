export type DiffType = 'added' | 'removed' | 'modified' | 'unchanged';

export interface LineDiffEntry {
  type: DiffType;
  content: string;
  originalContent?: string;
  modifiedContent?: string;
  originalLine?: number;
  modifiedLine?: number;
}

export interface LineDiffResult {
  entries: LineDiffEntry[];
  removedLines: number[];
  addedLines: number[];
  modifiedOriginalLines: number[];
  modifiedModifiedLines: number[];
}

export interface DiffConnection {
  type: Exclude<DiffType, 'unchanged'>;
  originalLine?: number;
  modifiedLine?: number;
}

export interface ConnectorPath {
  id: string;
  type: Exclude<DiffType, 'unchanged'>;
  d: string;
  color: string;
  dotX: number;
  dotY: number;
}

export interface ComparisonStats {
  added: number;
  removed: number;
  modified: number;
  unchanged: number;
}
