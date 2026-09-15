import type { editor } from 'monaco-editor';
import { buildChangeGroups } from '../diff/changeGroups';
import type { ChangeGroup } from '../diff/changeGroups';
import {
  applyMoveBlocksToLeft,
  applyMoveBlocksToRight,
  canMoveBlockToLeft,
  canMoveBlockToRight,
  getChangeGroupForLine,
} from '../diff/changeMove';
import type { LineDiffResult } from '../diff/diffTypes';

interface EditorPair {
  original: editor.IStandaloneCodeEditor | null;
  modified: editor.IStandaloneCodeEditor | null;
}

function groupsForCurrentSelection(
  codeEditor: editor.IStandaloneCodeEditor,
  groups: ChangeGroup[],
  contextLine: number,
): ChangeGroup[] {
  const selections = codeEditor.getSelections() ?? [];
  const contextIsSelected = selections.some(
    (selection) =>
      contextLine >= selection.startLineNumber &&
      contextLine <= selection.endLineNumber,
  );

  if (contextIsSelected) {
    const selectedGroups = groups.filter((group) =>
      selections.some(
        (selection) =>
          group.alignedLineStart <= selection.endLineNumber &&
          group.alignedLineEnd >= selection.startLineNumber,
      ),
    );
    if (selectedGroups.length > 0) return selectedGroups;
  }

  const contextGroup = getChangeGroupForLine(groups, contextLine);
  return contextGroup ? [contextGroup] : [];
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
    const groups = groupsForCurrentSelection(
      codeEditor,
      buildChangeGroups(result),
      lineNumber,
    );
    const { original, modified } = getEditors();
    const alignedOriginal = original?.getValue() ?? '';
    const alignedModified = modified?.getValue() ?? '';
    canMoveLeftKey.set(
      groups.some((group) =>
        canMoveBlockToLeft(result, group, alignedModified),
      ),
    );
    canMoveRightKey.set(
      groups.some((group) =>
        canMoveBlockToRight(result, group, alignedOriginal),
      ),
    );
  };

  const contextMenuDisposable = codeEditor.onContextMenu((event) => {
    const lineNumber = event.target.position?.lineNumber;
    if (lineNumber) refreshContextKeys(lineNumber);
  });

  const cursorDisposable = codeEditor.onDidChangeCursorSelection((event) => {
    refreshContextKeys(event.selection.positionLineNumber);
  });

  const applyMove = (direction: 'left' | 'right') => {
    const { original, modified } = getEditors();
    if (!original || !modified || !isAlignedMode()) return;

    const alignedOriginal = original.getValue();
    const alignedModified = modified.getValue();
    const result = getAlignedResult();
    const groups = groupsForCurrentSelection(
      codeEditor,
      buildChangeGroups(result),
      contextLine,
    );
    if (groups.length === 0) return;

    const next =
      direction === 'left'
        ? applyMoveBlocksToLeft(
            alignedOriginal,
            alignedModified,
            result,
            groups,
          )
        : applyMoveBlocksToRight(
            alignedOriginal,
            alignedModified,
            result,
            groups,
          );

    if (!next) return;

    original.setValue(next.original);
    modified.setValue(next.modified);
    onMerged(next.original, next.modified);
  };

  codeEditor.addAction({
    id: `codecompare.moveToLeft.${paneId}`,
    label: 'Move Changes to Left',
    contextMenuGroupId: '9_codecompare',
    contextMenuOrder: 1,
    precondition: `codecompare.canMoveToLeft.${paneId}`,
    run: () => applyMove('left'),
  });

  codeEditor.addAction({
    id: `codecompare.moveToRight.${paneId}`,
    label: 'Move Changes to Right',
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
