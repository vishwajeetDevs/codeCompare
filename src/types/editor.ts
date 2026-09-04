export const MONACO_LANGUAGES = [
  { id: 'javascript', label: 'JavaScript' },
  { id: 'typescript', label: 'TypeScript' },
  { id: 'json', label: 'JSON' },
  { id: 'html', label: 'HTML' },
  { id: 'css', label: 'CSS' },
  { id: 'python', label: 'Python' },
  { id: 'java', label: 'Java' },
  { id: 'c', label: 'C' },
  { id: 'cpp', label: 'C++' },
  { id: 'csharp', label: 'C#' },
  { id: 'go', label: 'Go' },
  { id: 'rust', label: 'Rust' },
  { id: 'php', label: 'PHP' },
  { id: 'sql', label: 'SQL' },
  { id: 'xml', label: 'XML' },
  { id: 'yaml', label: 'YAML' },
  { id: 'markdown', label: 'Markdown' },
  { id: 'shell', label: 'Shell' },
  { id: 'plaintext', label: 'Plain Text' },
] as const;

export type MonacoLanguageId = (typeof MONACO_LANGUAGES)[number]['id'];

export type LanguageSetting = 'auto' | MonacoLanguageId;

export interface EditorSettings {
  tabSize: number;
  insertSpaces: boolean;
  language: LanguageSetting;
  wordWrap: 'off' | 'on';
}

export interface EditorScrollMetrics {
  scrollTop: number;
  scrollHeight: number;
  viewportHeight: number;
  lineCount: number;
}

/** @deprecated Use MONACO_LANGUAGES */
export const EDITOR_LANGUAGES = MONACO_LANGUAGES.map((lang) => lang.id);

/** @deprecated Use MonacoLanguageId */
export type EditorLanguage = MonacoLanguageId;
