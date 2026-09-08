import type { editor } from 'monaco-editor';
import { formatJson, isValidJson, needsJsonFormatting } from './jsonFormat';

interface EditorJsonPasteOptions {
  onAfterJsonPaste?: () => void;
}

/** Pretty-print JSON on paste when the clipboard holds minified/unformatted JSON. */
export function setupEditorJsonPaste(
  codeEditor: editor.IStandaloneCodeEditor,
  options: EditorJsonPasteOptions = {},
): { dispose: () => void } {
  const domNode = codeEditor.getDomNode();
  if (!domNode) return { dispose: () => undefined };

  const onPaste = (event: ClipboardEvent) => {
    const text = event.clipboardData?.getData('text/plain') ?? '';
    if (!text || !isValidJson(text)) return;

    if (needsJsonFormatting(text)) {
      const formatted = formatJson(text);
      if (!formatted) return;

      event.preventDefault();
      event.stopPropagation();

      const selections = codeEditor.getSelections();
      if (!selections?.length) return;

      codeEditor.pushUndoStop();
      codeEditor.executeEdits(
        'codecompare-json-paste',
        selections.map((selection) => ({
          range: selection,
          text: formatted,
          forceMoveMarkers: true,
        })),
      );
      codeEditor.pushUndoStop();
    }

    queueMicrotask(() => options.onAfterJsonPaste?.());
  };

  domNode.addEventListener('paste', onPaste, true);

  return {
    dispose: () => domNode.removeEventListener('paste', onPaste, true),
  };
}
