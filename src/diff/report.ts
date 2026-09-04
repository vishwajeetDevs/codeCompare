import { computeCharDiff } from './charDiff';
import { computeComparisonStats } from './stats';
import type { DiffType, LineDiffResult } from './diffTypes';

export interface ChangedLineSummary {
  line: number;
  type: Exclude<DiffType, 'unchanged'>;
  score: number;
}

export interface ComparisonReportData {
  totalLines: number;
  added: number;
  removed: number;
  modified: number;
  unchanged: number;
  mostChangedLines: ChangedLineSummary[];
  generatedAt: string;
}

function changeScore(
  type: Exclude<DiffType, 'unchanged'>,
  entry: LineDiffResult['entries'][number],
): { line: number; score: number } {
  if (type === 'modified') {
    const originalText = entry.originalContent ?? entry.content;
    const modifiedText = entry.modifiedContent ?? entry.content;
    const charDiff = computeCharDiff(originalText, modifiedText);
    const score =
      charDiff.original.reduce((sum, range) => sum + range.end - range.start, 0) +
      charDiff.modified.reduce((sum, range) => sum + range.end - range.start, 0);

    return {
      line: entry.originalLine ?? entry.modifiedLine ?? 0,
      score: Math.max(score, 1),
    };
  }

  if (type === 'added') {
    return {
      line: entry.modifiedLine ?? 0,
      score: Math.max(entry.content.length, 1),
    };
  }

  return {
    line: entry.originalLine ?? 0,
    score: Math.max(entry.content.length, 1),
  };
}

export function buildComparisonReportData(
  result: LineDiffResult,
  maxMostChanged = 10,
): ComparisonReportData {
  const stats = computeComparisonStats(result);
  const changedLines: ChangedLineSummary[] = [];

  for (const entry of result.entries) {
    if (entry.type === 'unchanged') continue;

    const { line, score } = changeScore(entry.type, entry);
    changedLines.push({ line, type: entry.type, score });
  }

  changedLines.sort((a, b) => b.score - a.score || a.line - b.line);

  return {
    totalLines: result.entries.length,
    ...stats,
    mostChangedLines: changedLines.slice(0, maxMostChanged),
    generatedAt: new Date().toISOString(),
  };
}

export function createReportText(
  original: string,
  modified: string,
  data: ComparisonReportData,
  result: LineDiffResult,
): string {
  const lines = [
    'Comparison Report',
    '=================',
    '',
    `Generated: ${data.generatedAt}`,
    '',
    `Total lines       ${data.totalLines}`,
    `Added             ${data.added}`,
    `Removed           ${data.removed}`,
    `Modified          ${data.modified}`,
    `Unchanged         ${data.unchanged}`,
    '',
  ];

  if (data.mostChangedLines.length > 0) {
    lines.push('Most changes:', '');
    for (const item of data.mostChangedLines) {
      lines.push(`Line ${item.line} (${item.type})`);
    }
    lines.push('');
  }

  lines.push('Details', '-------');

  if (result.entries.every((entry) => entry.type === 'unchanged')) {
    lines.push('No differences found.');
  } else {
    for (const entry of result.entries) {
      if (entry.type === 'unchanged') continue;

      if (entry.type === 'added') {
        lines.push(
          `[ADDED] Line ${entry.modifiedLine ?? '?'}: ${entry.content}`,
        );
      } else if (entry.type === 'removed') {
        lines.push(
          `[REMOVED] Line ${entry.originalLine ?? '?'}: ${entry.content}`,
        );
      } else {
        lines.push(
          `[MODIFIED] Line ${entry.originalLine ?? '?'} → ${entry.modifiedLine ?? '?'}:`,
        );
        lines.push(`  - ${entry.originalContent ?? entry.content}`);
        lines.push(`  + ${entry.modifiedContent ?? entry.content}`);
      }
    }
  }

  lines.push('', '--- Original ---', original, '', '--- Modified ---', modified);

  return lines.join('\n');
}

function escapeCsvValue(value: string | number): string {
  const text = String(value);
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function createReportCsv(data: ComparisonReportData): string {
  const rows: (string | number)[][] = [
    ['Metric', 'Value'],
    ['Total lines', data.totalLines],
    ['Added', data.added],
    ['Removed', data.removed],
    ['Modified', data.modified],
    ['Unchanged', data.unchanged],
    ['Generated', data.generatedAt],
    [],
    ['Line', 'Change Type', 'Change Score'],
    ...data.mostChangedLines.map((item) => [
      item.line,
      item.type,
      item.score,
    ]),
  ];

  return rows.map((row) => row.map(escapeCsvValue).join(',')).join('\n');
}

export function createComparisonReport(
  original: string,
  modified: string,
  result: LineDiffResult,
): string {
  const data = buildComparisonReportData(result);
  return createReportText(original, modified, data, result);
}
