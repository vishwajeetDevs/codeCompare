import type { Monaco } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';

/** Close the Monaco find/replace bar for an editor instance. */
export function closeFindWidget(codeEditor: editor.IStandaloneCodeEditor): void {
  void codeEditor.trigger('keyboard', 'closeFindWidget', null);
}

/** Wire VS Code-style find (Ctrl+F) scoped to a single editor pane. */
export function setupEditorSearch(
  codeEditor: editor.IStandaloneCodeEditor,
  monaco: Monaco,
): { dispose: () => void } {
  const editorId = codeEditor.getId();
  const whenFocused = `editorFocus && editorId == '${editorId}'`;

  const openFind = () => {
    codeEditor.focus();
    void codeEditor.trigger('codecompare', 'actions.find', null);
  };

  const openReplace = () => {
    codeEditor.focus();
    void codeEditor.trigger('codecompare', 'actions.findWithReplace', null);
  };

  codeEditor.addCommand(
    monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyF,
    openFind,
    whenFocused,
  );

  codeEditor.addCommand(
    monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyH,
    openReplace,
    whenFocused,
  );

  const domNode = codeEditor.getContainerDomNode();
  const onKeyDown = (event: KeyboardEvent) => {
    if (!(event.ctrlKey || event.metaKey)) return;

    const key = event.key.toLowerCase();
    if (key !== 'f' && key !== 'h') return;

    if (!domNode.contains(event.target as Node) && !codeEditor.hasTextFocus()) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    if (key === 'f') openFind();
    else openReplace();
  };

  domNode.addEventListener('keydown', onKeyDown, true);

  return {
    dispose: () => {
      domNode.removeEventListener('keydown', onKeyDown, true);
    },
  };
}
