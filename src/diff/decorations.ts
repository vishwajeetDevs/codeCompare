import type { Monaco } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import { computeCharDiff } from './charDiff';
import type { LineDiffResult } from './diffTypes';

function lineDecoration(
  monaco: Monaco,
  lineNumber: number,
  className: string,
  markerClassName: string,
): editor.IModelDeltaDecoration {
  return {
    range: new monaco.Range(lineNumber, 1, lineNumber, Number.MAX_SAFE_INTEGER),
    options: {
      isWholeLine: true,
      className,
      linesDecorationsClassName: markerClassName,
    },
  };
}

function charDecorations(
  monaco: Monaco,
  lineNumber: number,
  ranges: { start: number; end: number }[],
  inlineClassName: string,
): editor.IModelDeltaDecoration[] {
  return ranges
    .filter(({ start, end }) => end > start)
    .map(({ start, end }) => ({
      range: new monaco.Range(lineNumber, start + 1, lineNumber, end + 1),
      options: {
        inlineClassName,
      },
    }));
}

function modifiedLineDecorations(
  monaco: Monaco,
  result: LineDiffResult,
): {
  original: editor.IModelDeltaDecoration[];
  modified: editor.IModelDeltaDecoration[];
} {
  const original: editor.IModelDeltaDecoration[] = [];
  const modified: editor.IModelDeltaDecoration[] = [];

  for (const entry of result.entries) {
    if (entry.type !== 'modified') continue;

    const originalLine = entry.originalLine;
    const modifiedLine = entry.modifiedLine;
    const originalText = entry.originalContent ?? entry.content;
    const modifiedText = entry.modifiedContent ?? entry.content;

    if (!originalLine || !modifiedLine) continue;

    original.push(
      lineDecoration(
        monaco,
        originalLine,
        'line-diff-modified-subtle',
        'line-diff-marker-modified',
      ),
    );
    modified.push(
      lineDecoration(
        monaco,
        modifiedLine,
        'line-diff-modified-subtle',
        'line-diff-marker-modified',
      ),
    );

    const charDiff = computeCharDiff(originalText, modifiedText);

    original.push(
      ...charDecorations(
        monaco,
        originalLine,
        charDiff.original,
        'char-diff-removed',
      ),
    );
    modified.push(
      ...charDecorations(
        monaco,
        modifiedLine,
        charDiff.modified,
        'char-diff-added',
      ),
    );
  }

  return { original, modified };
}

function activeChangeDecoration(
  monaco: Monaco,
  lineNumber: number,
): editor.IModelDeltaDecoration {
  return {
    range: new monaco.Range(lineNumber, 1, lineNumber, Number.MAX_SAFE_INTEGER),
    options: {
      isWholeLine: true,
      className: 'line-diff-active-change',
    },
  };
}

export function createLineDiffDecorations(
  monaco: Monaco,
  result: LineDiffResult,
  activeAlignedLine?: number | null,
): {
  original: editor.IModelDeltaDecoration[];
  modified: editor.IModelDeltaDecoration[];
} {
  const modifiedDecorations = modifiedLineDecorations(monaco, result);

  const original = [
    ...result.removedLines.map((lineNumber) =>
      lineDecoration(
        monaco,
        lineNumber,
        'line-diff-removed',
        'line-diff-marker-removed',
      ),
    ),
    ...result.addedLines.map((lineNumber) =>
      lineDecoration(monaco, lineNumber, 'line-diff-blank', ''),
    ),
    ...modifiedDecorations.original,
  ];

  const modified = [
    ...result.addedLines.map((lineNumber) =>
      lineDecoration(
        monaco,
        lineNumber,
        'line-diff-added',
        'line-diff-marker-added',
      ),
    ),
    ...result.removedLines.map((lineNumber) =>
      lineDecoration(monaco, lineNumber, 'line-diff-blank', ''),
    ),
    ...modifiedDecorations.modified,
  ];

  if (activeAlignedLine && activeAlignedLine > 0) {
    original.push(activeChangeDecoration(monaco, activeAlignedLine));
    modified.push(activeChangeDecoration(monaco, activeAlignedLine));
  }

  return { original, modified };
}
