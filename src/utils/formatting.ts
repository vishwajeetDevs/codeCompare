export {
  createEditorOptions,
  createDiffEditorOptions,
  setupMonaco,
  resolveEditorLanguage,
  DEFAULT_EDITOR_SETTINGS,
} from './editorConfig';

export async function formatEditorDocument(
  editorInstance: { getAction: (id: string) => { run: () => Promise<void> } | null },
): Promise<void> {
  await editorInstance.getAction('editor.action.formatDocument')?.run();
}
