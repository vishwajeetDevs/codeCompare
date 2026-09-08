import type { Monaco } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import { resolveEditorLanguage } from './languageDetection';
import type { EditorSettings } from '../types/editor';

export const DEFAULT_EDITOR_SETTINGS: EditorSettings = {
  tabSize: 4,
  insertSpaces: true,
  language: 'auto',
  wordWrap: 'off',
};

export function defineCompareTheme(monaco: Monaco): void {
  monaco.editor.defineTheme('codecompare-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [],
    colors: {
      'diffEditor.insertedLineBackground': '#00000000',
      'diffEditor.removedLineBackground': '#00000000',
      'diffEditor.insertedTextBackground': '#00000000',
      'diffEditor.removedTextBackground': '#00000000',
    },
  });

  monaco.editor.defineTheme('codecompare-light', {
    base: 'vs',
    inherit: true,
    rules: [],
    colors: {
      'editor.background': '#f6f5f2',
      'editor.lineHighlightBackground': '#eceae4',
      'editorLineNumber.foreground': '#8b949e',
      'editorLineNumber.activeForeground': '#424a53',
      'editorGutter.background': '#f0efea',
      'diffEditor.insertedLineBackground': '#00000000',
      'diffEditor.removedLineBackground': '#00000000',
      'diffEditor.insertedTextBackground': '#00000000',
      'diffEditor.removedTextBackground': '#00000000',
    },
  });
}

/** Configure Monaco themes; paste-safe options disable auto-format on paste/type. */
export function setupMonaco(monaco: Monaco): void {
  defineCompareTheme(monaco);
}

/** @deprecated Use setupMonaco */
export function disableAutoFormatting(monaco: Monaco): void {
  setupMonaco(monaco);
}

export function createEditorOptions(
  settings: EditorSettings,
): editor.IStandaloneEditorConstructionOptions {
  return {
    // Paste handling — preserve exact indentation, never run a formatter
    formatOnPaste: false,
    formatOnType: false,
    autoIndent: 'none',
    trimAutoWhitespace: false,
    detectIndentation: true,

    // Tab size and spaces vs tabs
    tabSize: settings.tabSize,
    insertSpaces: settings.insertSpaces,

    // Large text
    largeFileOptimizations: true,

    // Line numbers
    lineNumbers: 'on',
    lineNumbersMinChars: 3,
    lineDecorationsWidth: 20,
    glyphMargin: true,
    overviewRulerBorder: false,
    overviewRulerLanes: 0,

    // Syntax highlighting — driven by language / auto-detect
    // Code folding
    folding: true,
    foldingStrategy: 'auto',
    foldingHighlight: true,
    showFoldingControls: 'always',

    // Bracket matching & auto-close
    matchBrackets: 'always',
    bracketPairColorization: { enabled: true },
    autoClosingBrackets: 'languageDefined',
    autoClosingQuotes: 'languageDefined',
    autoSurround: 'languageDefined',

    // Find (Ctrl+F), Replace (Ctrl+H), Go to line (Ctrl+G) — enabled by default
    // Undo / redo — enabled by default
    // Multi-cursor — enabled by default (Alt+click, Ctrl+Alt+↑/↓)

    // Selection
    selectOnLineNumbers: true,
    roundedSelection: true,
    selectionHighlight: true,
    occurrencesHighlight: 'singleFile',
    renderLineHighlight: 'line',

    // Word wrap (minimap disabled — saves horizontal space in side-by-side view)
    wordWrap: settings.wordWrap,
    wordWrapBreakAfterCharacters: '',
    wordWrapBreakBeforeCharacters: '',
    minimap: { enabled: false },

    // Find widget — keep scoped to the editor, don't auto-open on selection changes
    find: {
      addExtraSpaceOnTop: false,
      autoFindInSelection: 'never',
      seedSearchStringFromSelection: 'never',
    },

    // Scrollbars
    scrollbar: {
      vertical: 'auto',
      horizontal: 'auto',
      useShadows: true,
      verticalScrollbarSize: 12,
      horizontalScrollbarSize: 12,
      alwaysConsumeMouseWheel: false,
    },
    mouseWheelScrollSensitivity: 3,
    scrollBeyondLastLine: false,
    smoothScrolling: false,

    // General editing
    readOnly: false,
    renderWhitespace: 'selection',
    fontSize: 14,
    automaticLayout: true,
    fixedOverflowWidgets: true,
    contextmenu: true,
    quickSuggestions: false,
    links: true,
    colorDecorators: true,
    hover: { enabled: 'off' },
  };
}

export function createDiffEditorOptions(
  settings: EditorSettings,
): editor.IDiffEditorConstructionOptions {
  return {
    ...createEditorOptions(settings),
    renderSideBySide: true,
    enableSplitViewResizing: true,
    renderOverviewRuler: true,
    renderIndicators: true,
    originalEditable: true,
    diffWordWrap: settings.wordWrap,
  };
}

export { resolveEditorLanguage };
