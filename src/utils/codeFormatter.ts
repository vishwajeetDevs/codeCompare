import type { EditorSettings, MonacoLanguageId } from '../types/editor';
import type { Plugin } from 'prettier';
import { detectLanguage } from './languageDetection';
import { formatJson } from './jsonFormat';

function layoutConfig(settings: EditorSettings) {
  return {
    indentStyle: settings.insertSpaces ? ('space' as const) : ('tab' as const),
    indentWidth: settings.tabSize,
    lineWidth: 100,
  };
}

function webFmtConfig(settings: EditorSettings) {
  const layout = layoutConfig(settings);
  return {
    ...layout,
    json: layout,
    script: { ...layout, expand: 'always' as const },
    style: layout,
    markup: layout,
  };
}

type InitializedFormatter = {
  // Formatter packages expose different language-specific signatures.
  format: (...args: any[]) => string | undefined;
};

const formatterCache = new Map<
  string,
  Promise<InitializedFormatter>
>();

async function loadWasmFormatter(
  key: string,
  loader: () => Promise<unknown>,
): Promise<InitializedFormatter> {
  let pending = formatterCache.get(key);
  if (!pending) {
    pending = loader().then(async (loaded) => {
      const module = loaded as InitializedFormatter & {
        default: () => Promise<unknown>;
      };
      await module.default();
      return module;
    });
    formatterCache.set(key, pending);
  }
  return pending;
}

/** Warm up WASM formatters in the background when auto-format is enabled. */
export function preloadFormatters(): void {
  void loadWasmFormatter('web', () => import('@wasm-fmt/web_fmt/vite'));
  void loadWasmFormatter('clang', () => import('@wasm-fmt/clang-format/vite'));
  void loadWasmFormatter('python', () => import('@wasm-fmt/ruff_fmt/vite'));
  void loadWasmFormatter('go', () => import('@wasm-fmt/gofmt/vite'));
  void loadWasmFormatter('php', () => import('@wasm-fmt/mago_fmt/vite'));
  void loadWasmFormatter('sql', () => import('@wasm-fmt/sql_fmt/vite'));
  void loadWasmFormatter('yaml', () => import('@wasm-fmt/yamlfmt/vite'));
  void loadWasmFormatter('markdown', () => import('@wasm-fmt/markdown/vite'));
  void loadWasmFormatter('shell', () => import('@wasm-fmt/shfmt/vite'));
}

function filenameForLanguage(language: MonacoLanguageId): string {
  switch (language) {
    case 'javascript':
      return 'code.js';
    case 'typescript':
      return 'code.ts';
    case 'json':
      return 'code.json';
    case 'html':
      return 'code.html';
    case 'css':
      return 'code.css';
    case 'python':
      return 'code.py';
    case 'java':
      return 'code.java';
    case 'c':
      return 'code.c';
    case 'cpp':
      return 'code.cpp';
    case 'csharp':
      return 'code.cs';
    case 'go':
      return 'code.go';
    case 'rust':
      return 'code.rs';
    case 'php':
      return 'code.php';
    case 'sql':
      return 'code.sql';
    case 'xml':
      return 'code.xml';
    case 'yaml':
      return 'code.yaml';
    case 'markdown':
      return 'code.md';
    case 'shell':
      return 'code.sh';
    default:
      return 'code.txt';
  }
}

async function formatWithPrettierPlugin(
  source: string,
  language: 'rust' | 'xml',
  settings: EditorSettings,
): Promise<string> {
  const prettier = await import('prettier/standalone');
  const plugin =
    language === 'rust'
      ? await import('prettier-plugin-rust')
      : await import('@prettier/plugin-xml');
  const pluginValue =
    (plugin as { default?: Plugin }).default ?? (plugin as unknown as Plugin);

  return prettier.format(source, {
    filepath: filenameForLanguage(language),
    plugins: [pluginValue],
    tabWidth: settings.tabSize,
    useTabs: !settings.insertSpaces,
  });
}

/**
 * Detect and format one complete document. Invalid or unrecognized input is
 * returned unchanged so automatic formatting never damages partial code.
 */
export async function formatDetectedCode(
  source: string,
  settings: EditorSettings,
): Promise<{ code: string; language: MonacoLanguageId }> {
  const language = detectLanguage(source);
  if (!source.trim() || language === 'plaintext') {
    return { code: source, language };
  }

  try {
    let formatted: string | undefined;

    switch (language) {
      case 'json': {
        const pretty = formatJson(source, settings.tabSize);
        if (pretty) {
          formatted = pretty;
          break;
        }
        const formatter = await loadWasmFormatter('web', () =>
          import('@wasm-fmt/web_fmt/vite'),
        );
        formatted = formatter.format(
          source,
          filenameForLanguage('json'),
          webFmtConfig(settings),
        );
        break;
      }
      case 'javascript':
      case 'typescript':
      case 'html':
      case 'css': {
        const formatter = await loadWasmFormatter('web', () =>
          import('@wasm-fmt/web_fmt/vite'),
        );
        formatted = formatter.format(
          source,
          filenameForLanguage(language),
          webFmtConfig(settings),
        );
        break;
      }
      case 'java':
      case 'c':
      case 'cpp':
      case 'csharp': {
        const formatter = await loadWasmFormatter('clang', () =>
          import('@wasm-fmt/clang-format/vite'),
        );
        formatted = formatter.format(
          source,
          filenameForLanguage(language),
          `{BasedOnStyle: LLVM, IndentWidth: ${settings.tabSize}, UseTab: ${
            settings.insertSpaces ? 'Never' : 'ForIndentation'
          }}`,
        );
        break;
      }
      case 'python': {
        const formatter = await loadWasmFormatter('python', () =>
          import('@wasm-fmt/ruff_fmt/vite'),
        );
        formatted = formatter.format(source, filenameForLanguage(language), {
          indent_style: settings.insertSpaces ? 'space' : 'tab',
          indent_width: settings.tabSize,
          line_width: 100,
        });
        break;
      }
      case 'go': {
        const formatter = await loadWasmFormatter('go', () =>
          import('@wasm-fmt/gofmt/vite'),
        );
        formatted = formatter.format(source);
        break;
      }
      case 'rust':
      case 'xml':
        formatted = await formatWithPrettierPlugin(source, language, settings);
        break;
      case 'php': {
        const formatter = await loadWasmFormatter('php', () =>
          import('@wasm-fmt/mago_fmt/vite'),
        );
        formatted = formatter.format(source, filenameForLanguage(language), {
          'use-tabs': !settings.insertSpaces,
          'tab-width': settings.tabSize,
        });
        break;
      }
      case 'sql': {
        const formatter = await loadWasmFormatter('sql', () =>
          import('@wasm-fmt/sql_fmt/vite'),
        );
        formatted = formatter.format(source, {
          indent_width: settings.tabSize,
          line_width: 100,
        });
        break;
      }
      case 'yaml': {
        const formatter = await loadWasmFormatter('yaml', () =>
          import('@wasm-fmt/yamlfmt/vite'),
        );
        formatted = formatter.format(source, {
          indent_width: settings.tabSize,
          line_width: 100,
        });
        break;
      }
      case 'markdown': {
        const formatter = await loadWasmFormatter('markdown', () =>
          import('@wasm-fmt/markdown/vite'),
        );
        formatted = formatter.format(source);
        break;
      }
      case 'shell': {
        const formatter = await loadWasmFormatter('shell', () =>
          import('@wasm-fmt/shfmt/vite'),
        );
        formatted = formatter.format(
          source,
          filenameForLanguage(language),
          { indent: settings.insertSpaces ? settings.tabSize : 0 },
        );
        break;
      }
    }

    return {
      code: typeof formatted === 'string' ? formatted.trimEnd() : source,
      language,
    };
  } catch {
    return { code: source, language };
  }
}
