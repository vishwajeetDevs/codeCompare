import type { Monaco } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import { buildAlignedView } from '../diff/alignTexts';
import { createLineDiffDecorations } from '../diff/decorations';
import { computeLineDiff } from '../diff/lineDiff';
import type { LineDiffResult } from '../diff/diffTypes';

interface DecorationIds {
  original: string[];
  modified: string[];
}

/** Apply diff decorations using a pre-built aligned diff result. */
export function applyDiffDecorationsToEditors(
  monaco: Monaco,
  originalEditor: editor.IStandaloneCodeEditor,
  modifiedEditor: editor.IStandaloneCodeEditor,
  alignedResult: LineDiffResult,
  decorationIds: DecorationIds,
  activeAlignedLine?: number | null,
  options?: { skipOriginal?: boolean; skipModified?: boolean },
): void {
  const decorations = createLineDiffDecorations(
    monaco,
    alignedResult,
    activeAlignedLine,
  );

  decorationIds.original = originalEditor.deltaDecorations(
    decorationIds.original,
    options?.skipOriginal ? [] : decorations.original,
  );
  decorationIds.modified = modifiedEditor.deltaDecorations(
    decorationIds.modified,
    options?.skipModified ? [] : decorations.modified,
  );
}

export function applyDiffDecorations(
  monaco: Monaco,
  originalEditor: editor.IStandaloneCodeEditor,
  modifiedEditor: editor.IStandaloneCodeEditor,
  original: string,
  modified: string,
  decorationIds: DecorationIds,
): LineDiffResult {
  const raw = computeLineDiff(original, modified);
  const aligned = buildAlignedView(raw);
  applyDiffDecorationsToEditors(
    monaco,
    originalEditor,
    modifiedEditor,
    aligned.result,
    decorationIds,
  );
  return raw;
}
