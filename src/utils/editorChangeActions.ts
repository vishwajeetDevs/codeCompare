import type { editor } from 'monaco-editor';
import {
  applyMoveToLeft,
  applyMoveToRight,
  canMoveChangeToLeft,
  canMoveChangeToRight,
  getChangeEntryAtLine,
} from '../diff/changeMove';
import type { LineDiffResult } from '../diff/diffTypes';

interface EditorPair {
  original: editor.IStandaloneCodeEditor | null;
  modified: editor.IStandaloneCodeEditor | null;
}

export function setupChangeContextMenu(
  codeEditor: editor.IStandaloneCodeEditor,
  paneId: 'original' | 'modified',
  getAlignedResult: () => LineDiffResult,
  getEditors: () => EditorPair,
  onMerged: (original: string, modified: string) => void,
  isAlignedMode: () => boolean,
): { dispose: () => void } {
  const canMoveLeftKey = codeEditor.createContextKey<boolean>(
    `codecompare.canMoveToLeft.${paneId}`,
    false,
  );
  const canMoveRightKey = codeEditor.createContextKey<boolean>(
    `codecompare.canMoveToRight.${paneId}`,
    false,
  );

  let contextLine = 1;

  const refreshContextKeys = (lineNumber: number) => {
    contextLine = lineNumber;
    if (!isAlignedMode()) {
      canMoveLeftKey.set(false);
      canMoveRightKey.set(false);
      return;
    }

    const entry = getChangeEntryAtLine(getAlignedResult(), lineNumber);
    canMoveLeftKey.set(canMoveChangeToLeft(entry));
    canMoveRightKey.set(canMoveChangeToRight(entry));
  };

  const contextMenuDisposable = codeEditor.onContextMenu((event) => {
    const lineNumber = event.target.position?.lineNumber;
    if (lineNumber) refreshContextKeys(lineNumber);
  });

  const cursorDisposable = codeEditor.onDidChangeCursorPosition((event) => {
    refreshContextKeys(event.position.lineNumber);
  });

  const applyMove = (direction: 'left' | 'right') => {
    const { original, modified } = getEditors();
    if (!original || !modified || !isAlignedMode()) return;

    const alignedOriginal = original.getValue();
    const alignedModified = modified.getValue();
    const entry = getChangeEntryAtLine(getAlignedResult(), contextLine);

    const result =
      direction === 'left'
        ? canMoveChangeToLeft(entry)
          ? applyMoveToLeft(alignedOriginal, alignedModified, contextLine)
          : null
        : canMoveChangeToRight(entry)
          ? applyMoveToRight(alignedOriginal, alignedModified, contextLine)
          : null;

    if (!result) return;

    original.setValue(result.original);
    modified.setValue(result.modified);
    onMerged(result.original, result.modified);
  };

  codeEditor.addAction({
    id: `codecompare.moveToLeft.${paneId}`,
    label: 'Move to Left',
    contextMenuGroupId: '9_codecompare',
    contextMenuOrder: 1,
    precondition: `codecompare.canMoveToLeft.${paneId}`,
    run: () => applyMove('left'),
  });

  codeEditor.addAction({
    id: `codecompare.moveToRight.${paneId}`,
    label: 'Move to Right',
    contextMenuGroupId: '9_codecompare',
    contextMenuOrder: 2,
    precondition: `codecompare.canMoveToRight.${paneId}`,
    run: () => applyMove('right'),
  });

  return {
    dispose: () => {
      contextMenuDisposable.dispose();
      cursorDisposable.dispose();
      canMoveLeftKey.reset();
      canMoveRightKey.reset();
    },
  };
}
