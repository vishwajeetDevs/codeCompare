import type { LanguageSetting, MonacoLanguageId } from '../types/editor';

function firstNonEmptyLine(code: string): string {
  return code.split('\n').find((line) => line.trim().length > 0)?.trim() ?? '';
}

function looksLikeJson(code: string): boolean {
  const trimmed = code.trim();
  if (!(trimmed.startsWith('{') || trimmed.startsWith('['))) return false;
  try {
    JSON.parse(trimmed);
    return true;
  } catch {
    return false;
  }
}

function looksLikeYaml(code: string): boolean {
  const trimmed = code.trim();
  if (trimmed.startsWith('---')) return true;
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) return false;
  return /^\s*[\w.-]+\s*:\s*\S/m.test(code) && !looksLikeJava(code);
}

function looksLikeHtml(code: string): boolean {
  return (
    /<!DOCTYPE\s+html/i.test(code) ||
    /<html[\s>]/i.test(code) ||
    /<(?:div|span|main|section|article|header|footer|nav|button|input|form|script|style|body|head)(?:\s[^>]*)?>/i.test(
      code,
    )
  );
}

function looksLikeXml(code: string): boolean {
  return /<\?xml[\s>]/i.test(code) || /<[\w:-]+[\s>][\s\S]*<\/[\w:-]+>/.test(code);
}

function looksLikeCss(code: string): boolean {
  if (
    /\b(const|let|function|class|interface|type)\b|=>|console\./.test(code)
  ) {
    return false;
  }

  return (
    /@(?:media|supports|keyframes|font-face)\b/i.test(code) ||
    /(?:^|})\s*(?:[.#][\w-]+|[a-z][\w-]*(?:\s+[.#a-z][\w-]*)?|[*])(?:\s*:[\w()-]+)?\s*\{[^}]*[-\w]+\s*:[^;}]+[;}]/im.test(
      code,
    )
  );
}

function looksLikeSql(code: string): boolean {
  return /\b(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP)\b/i.test(code);
}

/** Strong Java signals — checked before Python/JS/TS to avoid false positives. */
function looksLikeJava(code: string): boolean {
  return (
    /\b(public|private|protected)\s+(static\s+)?(final\s+)?(class|interface|enum|record|void|int|long|double|float|boolean|String|byte|char|short)\b/.test(
      code,
    ) ||
    /\bimport\s+(static\s+)?[\w.]+(\.[*])?\s*;/.test(code) ||
    /\bpackage\s+[\w.]+\s*;/.test(code) ||
    /\bSystem\.(out|err)\./.test(code) ||
    /\bnew\s+[A-Z]\w*\s*\(/.test(code) ||
    /@Override\b/.test(code) ||
    /\b(throws|extends|implements)\s+[\w.<>,\s]+/.test(code) ||
    /\b(public|private|protected)\s+[A-Z]\w*(\[\])?\s+\w+\s*;/.test(code)
  );
}

function looksLikePython(code: string): boolean {
  if (looksLikeJava(code)) return false;

  return (
    /^\s*def\s+\w+\s*\(/m.test(code) ||
    /^\s*from\s+\w+(\.\w+)*\s+import\s/m.test(code) ||
    /^\s*elif\s+/m.test(code) ||
    /^\s*except(\s+\w+|\s*:)/m.test(code) ||
    /\bself\s*[.,)]/.test(code) ||
    /^\s*@\w+/m.test(code) ||
    /^\s*class\s+\w+\s*\([^)]*\)\s*:/m.test(code) ||
    /^\s*class\s+\w+\s*:/m.test(code) ||
    /^\s*import\s+\w+(,\s*\w+)*/m.test(code)
  );
}

function looksLikeCSharp(code: string): boolean {
  return (
    /\b(using\s+System|namespace\s+\w|Console\.WriteLine)\b/.test(code)
  );
}

function looksLikeGo(code: string): boolean {
  return /\b(package\s+\w+|func\s+\w+|import\s+\()/.test(code);
}

function looksLikeRust(code: string): boolean {
  return /\b(fn\s+\w+|impl\s+|use\s+\w+|let\s+mut\s+)/.test(code);
}

function looksLikePhp(code: string): boolean {
  return /<\?php/i.test(code);
}

function looksLikeCpp(code: string): boolean {
  return (
    /#include\s*[<"]/.test(code) &&
    (/\b(class|namespace|std::|template\s*<|cout\s*<<)\b/.test(code) ||
      /\.hpp/.test(code))
  );
}

function looksLikeC(code: string): boolean {
  return (
    /#include\s*[<"]/.test(code) &&
    /\b(printf|scanf|malloc|free|int\s+main\s*\()\b/.test(code)
  );
}

function looksLikeTypeScript(code: string): boolean {
  if (looksLikeJava(code)) return false;

  return (
    /\b(interface\s+\w|type\s+\w+\s*=)\b/.test(code) ||
    /:\s*(string|number|boolean|void|unknown|any|null|undefined)\b/.test(code) ||
    /\bas\s+(string|number|boolean|const)\b/.test(code) ||
    /\bexport\s+(type|interface)\s+\w/.test(code)
  );
}

function looksLikeJavaScript(code: string): boolean {
  if (looksLikeJava(code)) return false;

  return (
    /\b(const|let|var|function|=>|console\.log)\b/.test(code) ||
    /\bimport\s+.*\s+from\s+['"]/.test(code) ||
    /\brequire\s*\(\s*['"]/.test(code) ||
    looksLikeTypeScript(code)
  );
}

function looksLikeMarkdown(code: string): boolean {
  return /^#{1,6}\s+\S/m.test(code) || /^\s*[-*+]\s+\S/m.test(code);
}

function looksLikeShell(code: string): boolean {
  const first = firstNonEmptyLine(code);
  if (/^#!\/.*\/(ba)?sh/.test(first)) return true;
  return /^\s*(echo|export|sudo|apt|npm|yarn|pnpm|git)\b/.test(code);
}

export function detectLanguage(code: string): MonacoLanguageId {
  const trimmed = code.trim();
  if (!trimmed) return 'plaintext';

  const first = firstNonEmptyLine(code);

  if (looksLikeShell(code) && first.startsWith('#!')) return 'shell';
  if (looksLikePhp(code)) return 'php';
  if (looksLikeHtml(code)) return 'html';
  if (looksLikeXml(code) && !looksLikeHtml(code)) return 'xml';
  if (looksLikeJson(code)) return 'json';
  if (looksLikeJava(code)) return 'java';
  if (looksLikeCSharp(code)) return 'csharp';
  if (looksLikeGo(code)) return 'go';
  if (looksLikeRust(code)) return 'rust';
  if (looksLikeCpp(code)) return 'cpp';
  if (looksLikeC(code)) return 'c';
  if (looksLikePython(code)) return 'python';
  if (looksLikeYaml(code)) return 'yaml';
  if (looksLikeMarkdown(code) && !looksLikeYaml(code)) return 'markdown';
  if (looksLikeSql(code)) return 'sql';
  if (looksLikeCss(code) && !looksLikeHtml(code)) return 'css';
  if (looksLikeTypeScript(code)) return 'typescript';
  if (looksLikeJavaScript(code)) return 'javascript';
  if (looksLikeShell(code)) return 'shell';

  return 'plaintext';
}

export function resolveEditorLanguage(
  setting: LanguageSetting,
  original: string,
  modified: string,
): MonacoLanguageId {
  if (setting !== 'auto') return setting;

  const originalLang = detectLanguage(original);
  const modifiedLang = detectLanguage(modified);

  if (originalLang === modifiedLang) return originalLang;

  if (originalLang !== 'plaintext' && modifiedLang === 'plaintext') {
    return originalLang;
  }
  if (modifiedLang !== 'plaintext' && originalLang === 'plaintext') {
    return modifiedLang;
  }

  const originalWeight = original.trim().length;
  const modifiedWeight = modified.trim().length;
  return modifiedWeight >= originalWeight ? modifiedLang : originalLang;
}
