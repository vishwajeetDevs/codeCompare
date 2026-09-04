export type DownloadKind = 'original' | 'modified' | 'diff' | 'report';

export function downloadTextFile(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

const LANGUAGE_EXTENSIONS: Record<string, string> = {
  javascript: 'js',
  typescript: 'ts',
  json: 'json',
  html: 'html',
  css: 'css',
  python: 'py',
  java: 'java',
  c: 'c',
  cpp: 'cpp',
  csharp: 'cs',
  go: 'go',
  rust: 'rs',
  php: 'php',
  sql: 'sql',
  xml: 'xml',
  yaml: 'yaml',
  markdown: 'md',
  shell: 'sh',
  plaintext: 'txt',
};

export function filenameForLanguage(
  base: string,
  language: string,
): string {
  const extension = LANGUAGE_EXTENSIONS[language] ?? 'txt';
  return `${base}.${extension}`;
}
