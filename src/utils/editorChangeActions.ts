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
  selections: readonly editor.ICursorSelectionChangedEvent['selection'][],
  groups: ChangeGroup[],
  contextLine: number,
): ChangeGroup[] {
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

function replaceEditorContents(
  codeEditor: editor.IStandaloneCodeEditor,
  value: string,
): void {
  const model = codeEditor.getModel();
  if (!model || model.getValue() === value) return;

  codeEditor.pushUndoStop();
  codeEditor.executeEdits('codecompare.moveChanges', [
    {
      range: model.getFullModelRange(),
      text: value,
      forceMoveMarkers: true,
    },
  ]);
  codeEditor.pushUndoStop();
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

  let contextGroups: ChangeGroup[] = [];
  let selectionsAtRightClick = codeEditor.getSelections() ?? [];
  const domNode = codeEditor.getDomNode();

  const refreshContextKeys = (
    lineNumber: number,
    selections = codeEditor.getSelections() ?? [],
  ) => {
    if (!isAlignedMode()) {
      contextGroups = [];
      canMoveLeftKey.set(false);
      canMoveRightKey.set(false);
      return;
    }

    const result = getAlignedResult();
    contextGroups = groupsForCurrentSelection(
      selections,
      buildChangeGroups(result),
      lineNumber,
    );
    const { original, modified } = getEditors();
    const alignedOriginal = original?.getValue() ?? '';
    const alignedModified = modified?.getValue() ?? '';
    canMoveLeftKey.set(
      contextGroups.some((group) =>
        canMoveBlockToLeft(result, group, alignedModified),
      ),
    );
    canMoveRightKey.set(
      contextGroups.some((group) =>
        canMoveBlockToRight(result, group, alignedOriginal),
      ),
    );
  };

  const captureRightClickSelection = (event: MouseEvent) => {
    if (event.button === 2) {
      selectionsAtRightClick = codeEditor.getSelections() ?? [];
    }
  };
  domNode?.addEventListener('mousedown', captureRightClickSelection, true);

  const contextMenuDisposable = codeEditor.onContextMenu((event) => {
    const lineNumber = event.target.position?.lineNumber;
    if (lineNumber) refreshContextKeys(lineNumber, selectionsAtRightClick);
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
    const groups = contextGroups;
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

    if (direction === 'left') {
      replaceEditorContents(original, next.original);
    } else {
      replaceEditorContents(modified, next.modified);
    }
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
      domNode?.removeEventListener('mousedown', captureRightClickSelection, true);
      contextMenuDisposable.dispose();
      cursorDisposable.dispose();
      canMoveLeftKey.reset();
      canMoveRightKey.reset();
    },
  };
}
