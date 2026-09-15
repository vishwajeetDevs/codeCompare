import type { editor } from 'monaco-editor';

/**
 * Keep undo and redo scoped to the active code pane. Model history is managed
 * by Monaco, and its content-change event publishes restored values to React.
 */
export function setupEditorHistory(
  codeEditor: editor.IStandaloneCodeEditor,
): { dispose: () => void } {
  const domNode = codeEditor.getDomNode();
  if (!domNode) return { dispose: () => undefined };

  const handleHistoryShortcut = (event: KeyboardEvent) => {
    if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
    if (!codeEditor.hasTextFocus()) return;

    const key = event.key.toLowerCase();
    const shouldUndo = key === 'z' && !event.shiftKey;
    const shouldRedo = key === 'y' || (key === 'z' && event.shiftKey);
    if (!shouldUndo && !shouldRedo) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    const model = codeEditor.getModel();
    if (shouldUndo) void model?.undo();
    else void model?.redo();
  };

  domNode.addEventListener('keydown', handleHistoryShortcut, true);

  return {
    dispose: () => {
      domNode.removeEventListener('keydown', handleHistoryShortcut, true);
    },
  };
}
