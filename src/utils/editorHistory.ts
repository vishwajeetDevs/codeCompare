import type { Monaco } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';

/**
 * Keep undo and redo scoped to the active code pane. Model history is managed
 * by Monaco, and its content-change event publishes restored values to React.
 */
export function setupEditorHistory(
  codeEditor: editor.IStandaloneCodeEditor,
  monaco: Monaco,
): { dispose: () => void } {
  const editorId = codeEditor.getId();
  const whenTextFocused =
    `editorFocus && editorId == '${editorId}' && ` +
    '!findInputFocussed && !replaceInputFocussed';

  const undo = () => {
    void codeEditor.getModel()?.undo();
  };
  const redo = () => {
    void codeEditor.getModel()?.redo();
  };

  codeEditor.addCommand(
    monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyZ,
    undo,
    whenTextFocused,
  );
  codeEditor.addCommand(
    monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyY,
    redo,
    whenTextFocused,
  );
  codeEditor.addCommand(
    monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyZ,
    redo,
    whenTextFocused,
  );

  return { dispose: () => undefined };
}
