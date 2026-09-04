import type { Monaco } from '@monaco-editor/react';
import type { editor, Selection } from 'monaco-editor';
import type { LineDiffResult } from '../diff/diffTypes';

export type DiffPaneSide = 'original' | 'modified';

/** Aligned row numbers that are padding blanks (must not be copied). */
export function getAlignmentPaddingLines(
  result: LineDiffResult,
  pane: DiffPaneSide,
): Set<number> {
  const padding = new Set<number>();
  let row = 0;

  for (const entry of result.entries) {
    row += 1;
    if (pane === 'original' && entry.type === 'added') padding.add(row);
    if (pane === 'modified' && entry.type === 'removed') padding.add(row);
  }

  return padding;
}

function copyTextForSelection(
  codeEditor: editor.IStandaloneCodeEditor,
  selection: Selection,
  paddingLines: Set<number>,
): string {
  const model = codeEditor.getModel();
  if (!model || selection.isEmpty()) return '';

  const startLine = selection.startLineNumber;
  const endLine = selection.endLineNumber;
  const lines: string[] = [];

  for (let lineNumber = startLine; lineNumber <= endLine; lineNumber += 1) {
    if (paddingLines.has(lineNumber)) continue;

    const lineContent = model.getLineContent(lineNumber);

    if (startLine === endLine) {
      lines.push(
        lineContent.slice(selection.startColumn - 1, selection.endColumn - 1),
      );
      continue;
    }

    if (lineNumber === startLine) {
      lines.push(lineContent.slice(selection.startColumn - 1));
    } else if (lineNumber === endLine) {
      lines.push(lineContent.slice(0, selection.endColumn - 1));
    } else {
      lines.push(lineContent);
    }
  }

  return lines.join('\n');
}

export function getFilteredCopyText(
  codeEditor: editor.IStandaloneCodeEditor,
  paddingLines: Set<number>,
): string {
  const selections = codeEditor.getSelections();
  if (!selections?.length) return '';

  return selections
    .map((selection) => copyTextForSelection(codeEditor, selection, paddingLines))
    .filter((part) => part.length > 0)
    .join('\n');
}

function selectAllExcludingPadding(
  codeEditor: editor.IStandaloneCodeEditor,
  monaco: Monaco,
  paddingLines: Set<number>,
): void {
  const model = codeEditor.getModel();
  if (!model) return;

  const contentLines: number[] = [];
  for (let line = 1; line <= model.getLineCount(); line += 1) {
    if (!paddingLines.has(line)) contentLines.push(line);
  }

  if (contentLines.length === 0) {
    codeEditor.setSelection(
      new monaco.Selection(1, 1, 1, model.getLineMaxColumn(1)),
    );
    return;
  }

  const first = contentLines[0]!;
  const last = contentLines[contentLines.length - 1]!;
  codeEditor.setSelection(
    new monaco.Selection(first, 1, last, model.getLineMaxColumn(last)),
  );
}

export function setupEditorCopy(
  codeEditor: editor.IStandaloneCodeEditor,
  monaco: Monaco,
  pane: DiffPaneSide,
  getAlignedResult: () => LineDiffResult,
  isAlignedMode: () => boolean,
): { dispose: () => void } {
  const editorId = codeEditor.getId();
  const whenFocused = `editorFocus && editorId == '${editorId}'`;

  const getPaddingLines = () =>
    isAlignedMode()
      ? getAlignmentPaddingLines(getAlignedResult(), pane)
      : new Set<number>();

  const copyFilteredText = (): string =>
    getFilteredCopyText(codeEditor, getPaddingLines());

  const performFilteredCopy = (): boolean => {
    if (!isAlignedMode()) return false;

    const text = copyFilteredText();
    void navigator.clipboard.writeText(text);
    return true;
  };

  codeEditor.addCommand(
    monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyA,
    () => {
      if (!isAlignedMode()) {
        void codeEditor.trigger('keyboard', 'editor.action.selectAll', null);
        return;
      }
      selectAllExcludingPadding(codeEditor, monaco, getPaddingLines());
    },
    whenFocused,
  );

  codeEditor.addCommand(
    monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyC,
    () => {
      if (!performFilteredCopy()) {
        void codeEditor.trigger('keyboard', 'editor.action.clipboardCopyAction', null);
      }
    },
    whenFocused,
  );

  codeEditor.addCommand(
    monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyC,
    () => {
      if (!performFilteredCopy()) {
        void codeEditor.trigger(
          'keyboard',
          'editor.action.clipboardCopyWithSyntaxHighlightingAction',
          null,
        );
      }
    },
    whenFocused,
  );

  const onCopy = (event: ClipboardEvent) => {
    if (!isAlignedMode()) return;

    event.preventDefault();
    event.stopPropagation();
    event.clipboardData?.setData('text/plain', copyFilteredText());
  };

  const domNode = codeEditor.getDomNode();
  domNode?.addEventListener('copy', onCopy, true);

  return {
    dispose: () => {
      domNode?.removeEventListener('copy', onCopy, true);
    },
  };
}
