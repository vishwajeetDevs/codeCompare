import type { editor } from 'monaco-editor';
import { buildChangeGroups } from '../diff/changeGroups';
import {
  applyMoveBlockToLeft,
  applyMoveBlockToRight,
  canMoveBlockToLeft,
  canMoveBlockToRight,
  getChangeGroupForLine,
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

    const result = getAlignedResult();
    const group = getChangeGroupForLine(buildChangeGroups(result), lineNumber);
    const { original, modified } = getEditors();
    const alignedOriginal = original?.getValue() ?? '';
    const alignedModified = modified?.getValue() ?? '';
    canMoveLeftKey.set(
      group ? canMoveBlockToLeft(result, group, alignedModified) : false,
    );
    canMoveRightKey.set(
      group ? canMoveBlockToRight(result, group, alignedOriginal) : false,
    );
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
    const result = getAlignedResult();
    const group = getChangeGroupForLine(buildChangeGroups(result), contextLine);
    if (!group) return;

    const next =
      direction === 'left'
        ? canMoveBlockToLeft(result, group, alignedModified)
          ? applyMoveBlockToLeft(alignedOriginal, alignedModified, result, group)
          : null
        : canMoveBlockToRight(result, group, alignedOriginal)
          ? applyMoveBlockToRight(alignedOriginal, alignedModified, result, group)
          : null;

    if (!next) return;

    original.setValue(next.original);
    modified.setValue(next.modified);
    onMerged(next.original, next.modified);
  };

  codeEditor.addAction({
    id: `codecompare.moveToLeft.${paneId}`,
    label: 'Move Block to Left',
    contextMenuGroupId: '9_codecompare',
    contextMenuOrder: 1,
    precondition: `codecompare.canMoveToLeft.${paneId}`,
    run: () => applyMove('left'),
  });

  codeEditor.addAction({
    id: `codecompare.moveToRight.${paneId}`,
    label: 'Move Block to Right',
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
