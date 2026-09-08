import { Editor } from '@monaco-editor/react';
import type { Monaco } from '@monaco-editor/react';
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react';
import type { editor } from 'monaco-editor';
import { alignedEditorsToRaw, buildAlignedView, stripTrailingBlankLines } from '../../diff/alignTexts';
import { buildChangeGroups } from '../../diff/changeGroups';
import {
  applyMoveBlockToLeft,
  applyMoveBlockToRight,
  canMoveBlockToLeft,
  canMoveBlockToRight,
} from '../../diff/changeMove';
import { createEmptyLineDiffResult } from '../../diff/lineDiff';
import { applyDiffDecorationsToEditors } from '../../hooks/applyDiffDecorations';
import { getMonacoTheme } from '../../hooks/useTheme';
import type { MobileEditorView, ThemeMode } from '../../types';
import type { LineDiffResult } from '../../diff/diffTypes';
import type { EditorSettings, EditorScrollMetrics } from '../../types/editor';
import {
  createEditorOptions,
  resolveEditorLanguage,
  setupMonaco,
} from '../../utils/editorConfig';
import { setupEditorSearch, closeFindWidget } from '../../utils/editorSearch';
import { setupEditorCopy } from '../../utils/editorCopy';
import { setupChangeContextMenu } from '../../utils/editorChangeActions';
import { ResizableSplitPane } from '../Layout/ResizableSplitPane';

interface DiffEditorProps {
  original: string;
  modified: string;
  settings: EditorSettings;
  theme: ThemeMode;
  compareVersion: number;
  showDiffHighlights?: boolean;
  displayDiffResult?: LineDiffResult;
  activeChangeIndex?: number;
  activeChangeAlignedLine?: number | null;
  activeChangeBlock?: { start: number; end: number } | null;
  mobileView?: MobileEditorView | null;
  isMobile?: boolean;
  onOriginalChange?: (value: string) => void;
  onModifiedChange?: (value: string) => void;
  splitRatio?: number;
  onSplitRatioChange?: (ratio: number) => void;
  onScrollMetrics?: (metrics: EditorScrollMetrics) => void;
}

export interface CompareEditorHandle {
  formatBoth: () => Promise<void>;
  clearBoth: () => void;
  closeFindWidgets: () => void;
  scrollToRatio: (ratio: number) => void;
  getRawContents: () => { original: string; modified: string };
}

function applyModelSettings(
  editorInstance: editor.IStandaloneCodeEditor,
  settings: EditorSettings,
) {
  editorInstance.getModel()?.updateOptions({
    tabSize: settings.tabSize,
    insertSpaces: settings.insertSpaces,
    indentSize: settings.tabSize,
  });
}

async function formatEditor(codeEditor: editor.IStandaloneCodeEditor) {
  await codeEditor.getAction('editor.action.formatDocument')?.run();
}

function syncEditorValue(
  codeEditor: editor.IStandaloneCodeEditor,
  nextValue: string,
  isSyncingRef?: { current: boolean },
) {
  const model = codeEditor.getModel();
  if (!model || model.getValue() === nextValue) return;

  const scrollTop = codeEditor.getScrollTop();
  const scrollLeft = codeEditor.getScrollLeft();
  const selections = codeEditor.getSelections();

  if (isSyncingRef) isSyncingRef.current = true;
  try {
    closeFindWidget(codeEditor);
    codeEditor.setValue(nextValue);
  } finally {
    if (isSyncingRef) isSyncingRef.current = false;
  }

  codeEditor.setScrollTop(scrollTop);
  codeEditor.setScrollLeft(scrollLeft);
  if (selections) codeEditor.setSelections(selections);
}

export const CompareEditor = forwardRef<CompareEditorHandle, DiffEditorProps>(
  function CompareEditor(
    {
      original,
      modified,
      settings,
      theme,
      compareVersion,
      showDiffHighlights = false,
      displayDiffResult,
      activeChangeIndex = -1,
      activeChangeAlignedLine = null,
      activeChangeBlock = null,
      mobileView = null,
      isMobile = false,
      onOriginalChange,
      onModifiedChange,
      splitRatio = 0.5,
      onSplitRatioChange,
      onScrollMetrics,
    },
    ref,
  ) {
    const originalRef = useRef<editor.IStandaloneCodeEditor | null>(null);
    const modifiedRef = useRef<editor.IStandaloneCodeEditor | null>(null);
    const monacoRef = useRef<Monaco | null>(null);
    const decorationIdsRef = useRef<{ original: string[]; modified: string[] }>({
      original: [],
      modified: [],
    });
    const scrollSyncRef = useRef(false);
    const isSyncingRef = useRef(false);
    const skipExternalSyncRef = useRef(false);
    const lastRevealedChangeIndexRef = useRef(-1);
    const lastExternalSyncKeyRef = useRef('');
    const scrollDisposablesRef = useRef<Array<{ dispose: () => void }>>([]);
    const scrollMetricsFrameRef = useRef<number | null>(null);
    const onScrollMetricsRef = useRef(onScrollMetrics);
    onScrollMetricsRef.current = onScrollMetrics;
    const copyDisposablesRef = useRef<Array<{ dispose: () => void }>>([]);
    const searchDisposablesRef = useRef<Array<{ dispose: () => void }>>([]);
    const changeActionDisposablesRef = useRef<Array<{ dispose: () => void }>>([]);

    const rawResult = useMemo(
      () => displayDiffResult ?? createEmptyLineDiffResult(),
      [displayDiffResult, compareVersion],
    );

    const alignedView = useMemo(
      () => buildAlignedView(rawResult),
      [rawResult],
    );

    const alignedResultRef = useRef(alignedView.result);
    alignedResultRef.current = alignedView.result;

    const showOriginalOnly = isMobile && mobileView === 'original';
    const showModifiedOnly = isMobile && mobileView === 'modified';
    const shouldAlign =
      showDiffHighlights &&
      original.trim().length > 0 &&
      modified.trim().length > 0;

    const changeGroups = useMemo(
      () => (shouldAlign ? buildChangeGroups(alignedView.result) : []),
      [alignedView.result, shouldAlign],
    );

    const activeChangeGroup =
      activeChangeIndex >= 0 ? changeGroups[activeChangeIndex] : undefined;

    const canMoveActiveBlockLeft =
      shouldAlign &&
      activeChangeGroup != null &&
      canMoveBlockToLeft(alignedView.result, activeChangeGroup);

    const canMoveActiveBlockRight =
      shouldAlign &&
      activeChangeGroup != null &&
      canMoveBlockToRight(alignedView.result, activeChangeGroup);

    const monacoTheme = getMonacoTheme(theme);
    const shouldAlignRef = useRef(shouldAlign);
    shouldAlignRef.current = shouldAlign;
    const isAlignedMode = () =>
      shouldAlignRef.current && !showOriginalOnly && !showModifiedOnly;

    const resolvedLanguage = useMemo(
      () => resolveEditorLanguage(settings.language, original, modified),
      [settings.language, original, modified],
    );

    const markEditorDrivenUpdate = () => {
      skipExternalSyncRef.current = true;
    };

    const publishRawFromAligned = (
      alignedOriginal: string,
      alignedModified: string,
    ) => {
      const raw = alignedEditorsToRaw(
        alignedOriginal,
        alignedModified,
        displayDiffResultRef.current.entries.length > 0
          ? displayDiffResultRef.current
          : alignedResultRef.current,
      );
      markEditorDrivenUpdate();
      onOriginalChange?.(stripTrailingBlankLines(raw.original));
      onModifiedChange?.(stripTrailingBlankLines(raw.modified));
    };

    const publishScrollMetrics = () => {
      const orig = originalRef.current;
      if (!orig || !onScrollMetricsRef.current) return;

      if (scrollMetricsFrameRef.current !== null) return;

      scrollMetricsFrameRef.current = requestAnimationFrame(() => {
        scrollMetricsFrameRef.current = null;
        const editor = originalRef.current;
        if (!editor || !onScrollMetricsRef.current) return;

        onScrollMetricsRef.current({
          scrollTop: editor.getScrollTop(),
          scrollHeight: editor.getScrollHeight(),
          viewportHeight: editor.getLayoutInfo().height,
          lineCount: editor.getModel()?.getLineCount() ?? 0,
        });
      });
    };

    const displayDiffResultRef = useRef(rawResult);
    displayDiffResultRef.current = rawResult;

    const getRawContentsFromEditors = () => {
      const orig = originalRef.current;
      const mod = modifiedRef.current;
      if (!orig || !mod) {
        return { original: '', modified: '' };
      }

      if (shouldAlignRef.current && displayDiffResultRef.current.entries.length > 0) {
        const raw = alignedEditorsToRaw(
          orig.getValue(),
          mod.getValue(),
          displayDiffResultRef.current,
        );
        return {
          original: stripTrailingBlankLines(raw.original),
          modified: stripTrailingBlankLines(raw.modified),
        };
      }

      return {
        original: stripTrailingBlankLines(orig.getValue()),
        modified: stripTrailingBlankLines(mod.getValue()),
      };
    };

    useImperativeHandle(ref, () => ({
      formatBoth: async () => {
        const orig = originalRef.current;
        const mod = modifiedRef.current;
        if (!orig || !mod) return;
        await formatEditor(orig);
        await formatEditor(mod);
        if (shouldAlignRef.current) {
          publishRawFromAligned(orig.getValue(), mod.getValue());
        } else {
          onOriginalChange?.(orig.getValue());
          onModifiedChange?.(mod.getValue());
        }
      },
      clearBoth: () => {
        const orig = originalRef.current;
        const mod = modifiedRef.current;
        if (orig) {
          closeFindWidget(orig);
          syncEditorValue(orig, '', isSyncingRef);
        }
        if (mod) {
          closeFindWidget(mod);
          syncEditorValue(mod, '', isSyncingRef);
        }
        clearDecorations();
      },
      closeFindWidgets: () => {
        const orig = originalRef.current;
        const mod = modifiedRef.current;
        if (orig) closeFindWidget(orig);
        if (mod) closeFindWidget(mod);
      },
      scrollToRatio: (ratio: number) => {
        const orig = originalRef.current;
        const mod = modifiedRef.current;
        if (!orig) return;

        const maxScroll = Math.max(
          orig.getScrollHeight() - orig.getLayoutInfo().height,
          0,
        );
        const scrollTop = ratio * maxScroll;

        scrollSyncRef.current = true;
        orig.setScrollTop(scrollTop);
        mod?.setScrollTop(scrollTop);
        publishScrollMetrics();
        requestAnimationFrame(() => {
          scrollSyncRef.current = false;
        });
      },
      getRawContents: getRawContentsFromEditors,
    }));

    const clearDecorations = () => {
      const orig = originalRef.current;
      const mod = modifiedRef.current;
      if (orig) {
        decorationIdsRef.current.original = orig.deltaDecorations(
          decorationIdsRef.current.original,
          [],
        );
      }
      if (mod) {
        decorationIdsRef.current.modified = mod.deltaDecorations(
          decorationIdsRef.current.modified,
          [],
        );
      }
    };

    const applyDecorations = () => {
      const monaco = monacoRef.current;
      const orig = originalRef.current;
      const mod = modifiedRef.current;
      if (!monaco || !orig || !mod) return;

      if (!showDiffHighlights || (!original.trim() && !modified.trim())) {
        clearDecorations();
        return;
      }

      applyDiffDecorationsToEditors(
        monaco,
        orig,
        mod,
        shouldAlign ? alignedView.result : rawResult,
        decorationIdsRef.current,
        shouldAlign ? activeChangeBlock : null,
        shouldAlign
          ? undefined
          : {
              skipOriginal: !original.trim(),
              skipModified: !modified.trim(),
            },
      );
    };

    const linkScroll = (
      source: editor.IStandaloneCodeEditor,
      target: editor.IStandaloneCodeEditor,
    ) => {
      const disposable = source.onDidScrollChange((event) => {
        if (scrollSyncRef.current) return;
        scrollSyncRef.current = true;
        target.setScrollTop(event.scrollTop);
        target.setScrollLeft(event.scrollLeft);
        publishScrollMetrics();
        requestAnimationFrame(() => {
          scrollSyncRef.current = false;
        });
      });
      scrollDisposablesRef.current.push(disposable);
    };

    const wireScrollSync = () => {
      const orig = originalRef.current;
      const mod = modifiedRef.current;
      if (!orig || !mod || scrollDisposablesRef.current.length > 0) return;
      linkScroll(orig, mod);
      linkScroll(mod, orig);
    };

    const handleBeforeMount = (monaco: Monaco) => {
      monacoRef.current = monaco;
      setupMonaco(monaco);
    };

    const applyEditorLanguage = (instance: editor.IStandaloneCodeEditor) => {
      const monaco = monacoRef.current;
      const model = instance.getModel();
      if (!monaco || !model) return;
      monaco.editor.setModelLanguage(model, resolvedLanguage);
    };

    const getEditorPair = () => ({
      original: originalRef.current,
      modified: modifiedRef.current,
    });

    const handleMergedAligned = (
      alignedOriginal: string,
      alignedModified: string,
    ) => {
      publishRawFromAligned(alignedOriginal, alignedModified);
    };

    const applyActiveBlockMove = (direction: 'left' | 'right') => {
      const orig = originalRef.current;
      const mod = modifiedRef.current;
      if (!orig || !mod || !shouldAlignRef.current || activeChangeIndex < 0) {
        return;
      }

      const groups = buildChangeGroups(alignedResultRef.current);
      const group = groups[activeChangeIndex];
      if (!group) return;

      const result = alignedResultRef.current;
      const next =
        direction === 'left'
          ? applyMoveBlockToLeft(
              orig.getValue(),
              mod.getValue(),
              result,
              group,
            )
          : applyMoveBlockToRight(
              orig.getValue(),
              mod.getValue(),
              result,
              group,
            );

      if (!next) return;

      isSyncingRef.current = true;
      try {
        orig.setValue(next.original);
        mod.setValue(next.modified);
      } finally {
        isSyncingRef.current = false;
      }

      publishRawFromAligned(next.original, next.modified);
    };

    const mountOriginal = (instance: editor.IStandaloneCodeEditor) => {
      originalRef.current = instance;
      applyModelSettings(instance, settings);
      applyEditorLanguage(instance);
      if (monacoRef.current) {
        searchDisposablesRef.current.push(
          setupEditorSearch(instance, monacoRef.current, {
            getSiblingEditor: () => modifiedRef.current,
          }),
        );
        copyDisposablesRef.current.push(
          setupEditorCopy(
            instance,
            monacoRef.current,
            'original',
            () => alignedResultRef.current,
            isAlignedMode,
          ),
        );
        changeActionDisposablesRef.current.push(
          setupChangeContextMenu(
            instance,
            'original',
            () => alignedResultRef.current,
            getEditorPair,
            handleMergedAligned,
            isAlignedMode,
          ),
        );
      }
      instance.onDidChangeModelContent(() => {
        if (isSyncingRef.current) return;
        if (showOriginalOnly) {
          markEditorDrivenUpdate();
          onOriginalChange?.(stripTrailingBlankLines(instance.getValue()));
          return;
        }
        if (!shouldAlignRef.current) {
          markEditorDrivenUpdate();
          onOriginalChange?.(stripTrailingBlankLines(instance.getValue()));
          return;
        }
        const mod = modifiedRef.current;
        if (!mod) return;
        publishRawFromAligned(instance.getValue(), mod.getValue());
      });
      wireScrollSync();
      applyDecorations();
      publishScrollMetrics();
    };

    const mountModified = (instance: editor.IStandaloneCodeEditor) => {
      modifiedRef.current = instance;
      applyModelSettings(instance, settings);
      applyEditorLanguage(instance);
      if (monacoRef.current) {
        searchDisposablesRef.current.push(
          setupEditorSearch(instance, monacoRef.current, {
            getSiblingEditor: () => originalRef.current,
          }),
        );
        copyDisposablesRef.current.push(
          setupEditorCopy(
            instance,
            monacoRef.current,
            'modified',
            () => alignedResultRef.current,
            isAlignedMode,
          ),
        );
        changeActionDisposablesRef.current.push(
          setupChangeContextMenu(
            instance,
            'modified',
            () => alignedResultRef.current,
            getEditorPair,
            handleMergedAligned,
            isAlignedMode,
          ),
        );
      }
      instance.onDidChangeModelContent(() => {
        if (isSyncingRef.current) return;
        if (showModifiedOnly) {
          markEditorDrivenUpdate();
          onModifiedChange?.(stripTrailingBlankLines(instance.getValue()));
          return;
        }
        if (!shouldAlignRef.current) {
          markEditorDrivenUpdate();
          onModifiedChange?.(stripTrailingBlankLines(instance.getValue()));
          return;
        }
        const orig = originalRef.current;
        if (!orig) return;
        publishRawFromAligned(orig.getValue(), instance.getValue());
      });
      wireScrollSync();
      applyDecorations();
      publishScrollMetrics();
    };

    useEffect(() => {
      return () => {
        if (scrollMetricsFrameRef.current !== null) {
          cancelAnimationFrame(scrollMetricsFrameRef.current);
        }
        scrollDisposablesRef.current.forEach((disposable) => disposable.dispose());
        scrollDisposablesRef.current = [];
        copyDisposablesRef.current.forEach((disposable) => disposable.dispose());
        copyDisposablesRef.current = [];
        searchDisposablesRef.current.forEach((disposable) => disposable.dispose());
        searchDisposablesRef.current = [];
        changeActionDisposablesRef.current.forEach((disposable) =>
          disposable.dispose(),
        );
        changeActionDisposablesRef.current = [];
      };
    }, []);

    useEffect(() => {
      const orig = originalRef.current;
      const mod = modifiedRef.current;
      if (!orig || !mod) return;
      orig.updateOptions(createEditorOptions(settings));
      mod.updateOptions(createEditorOptions(settings));
      applyModelSettings(orig, settings);
      applyModelSettings(mod, settings);
    }, [settings]);

    useEffect(() => {
      const monaco = monacoRef.current;
      const orig = originalRef.current;
      const mod = modifiedRef.current;
      if (!monaco || !orig || !mod) return;

      monaco.editor.setModelLanguage(orig.getModel()!, resolvedLanguage);
      monaco.editor.setModelLanguage(mod.getModel()!, resolvedLanguage);
    }, [resolvedLanguage]);

    useEffect(() => {
      lastRevealedChangeIndexRef.current = -1;
      lastExternalSyncKeyRef.current = '';
      skipExternalSyncRef.current = false;
    }, [compareVersion]);

    useEffect(() => {
      const externalSyncKey = [
        compareVersion,
        showDiffHighlights,
        showOriginalOnly,
        showModifiedOnly,
        shouldAlign,
        original,
        modified,
        alignedView.original,
        alignedView.modified,
      ].join('\u0000');

      if (skipExternalSyncRef.current) {
        skipExternalSyncRef.current = false;
        lastExternalSyncKeyRef.current = externalSyncKey;
        applyDecorations();
        return;
      }

      if (externalSyncKey === lastExternalSyncKeyRef.current) {
        applyDecorations();
        return;
      }

      lastExternalSyncKeyRef.current = externalSyncKey;

      if (showOriginalOnly) {
        const orig = originalRef.current;
        if (orig) syncEditorValue(orig, original, isSyncingRef);
        applyDecorations();
        return;
      }
      if (showModifiedOnly) {
        const mod = modifiedRef.current;
        if (mod) syncEditorValue(mod, modified, isSyncingRef);
        applyDecorations();
        return;
      }

      const orig = originalRef.current;
      const mod = modifiedRef.current;
      if (!orig || !mod) return;

      if (!shouldAlign) {
        syncEditorValue(orig, original, isSyncingRef);
        syncEditorValue(mod, modified, isSyncingRef);
        applyDecorations();
        return;
      }

      syncEditorValue(orig, alignedView.original, isSyncingRef);
      syncEditorValue(mod, alignedView.modified, isSyncingRef);
      applyDecorations();
    }, [
      alignedView.original,
      alignedView.modified,
      original,
      modified,
      compareVersion,
      showDiffHighlights,
      showOriginalOnly,
      showModifiedOnly,
      shouldAlign,
    ]);

    useEffect(() => {
      applyDecorations();
    }, [alignedView.result, theme, activeChangeBlock, showDiffHighlights]);

    useEffect(() => {
      const orig = originalRef.current;
      const mod = modifiedRef.current;
      if (
        !orig ||
        !mod ||
        !activeChangeAlignedLine ||
        !shouldAlign ||
        activeChangeIndex < 0
      ) {
        return;
      }

      if (activeChangeIndex === lastRevealedChangeIndexRef.current) return;
      lastRevealedChangeIndexRef.current = activeChangeIndex;

      scrollSyncRef.current = true;
      orig.revealLineInCenter(activeChangeAlignedLine);
      mod.revealLineInCenter(activeChangeAlignedLine);
      mod.setScrollTop(orig.getScrollTop());
      mod.setScrollLeft(orig.getScrollLeft());
      publishScrollMetrics();
      requestAnimationFrame(() => {
        scrollSyncRef.current = false;
      });
    }, [activeChangeIndex, activeChangeAlignedLine, shouldAlign]);

    useEffect(() => {
      publishScrollMetrics();
    }, [
      alignedView.original,
      alignedView.modified,
      original,
      modified,
      compareVersion,
      shouldAlign,
    ]);

    if (showOriginalOnly) {
      return (
        <div className="editor-pane relative h-full min-h-0">
          <Editor
          height="100%"
          language={resolvedLanguage}
          defaultValue={original}
          theme={monacoTheme}
          beforeMount={handleBeforeMount}
          onMount={mountOriginal}
          options={createEditorOptions(settings)}
        />
        </div>
      );
    }

    if (showModifiedOnly) {
      return (
        <div className="editor-pane relative h-full min-h-0">
          <Editor
          height="100%"
          language={resolvedLanguage}
          defaultValue={modified}
          theme={monacoTheme}
          beforeMount={handleBeforeMount}
          onMount={mountModified}
          options={createEditorOptions(settings)}
        />
        </div>
      );
    }

    if (isMobile) {
      return (
        <div className="grid h-full grid-cols-1">
          <div className="editor-pane relative h-full min-h-0 border-b border-[var(--border)]">
            <Editor
              height="100%"
              language={resolvedLanguage}
              defaultValue={shouldAlign ? alignedView.original : original}
              theme={monacoTheme}
              beforeMount={handleBeforeMount}
              onMount={mountOriginal}
              options={createEditorOptions(settings)}
              path="original-editor"
            />
          </div>
          <div className="editor-pane relative h-full min-h-0">
            <Editor
              height="100%"
              language={resolvedLanguage}
              defaultValue={shouldAlign ? alignedView.modified : modified}
              theme={monacoTheme}
              beforeMount={handleBeforeMount}
              onMount={mountModified}
              options={createEditorOptions(settings)}
              path="modified-editor"
            />
          </div>
        </div>
      );
    }

    return (
      <ResizableSplitPane
        ratio={splitRatio}
        onRatioChange={onSplitRatioChange ?? (() => undefined)}
        showBlockMoveControls={shouldAlign && activeChangeIndex >= 0}
        canMoveBlockLeft={canMoveActiveBlockLeft}
        canMoveBlockRight={canMoveActiveBlockRight}
        onMoveBlockLeft={() => applyActiveBlockMove('left')}
        onMoveBlockRight={() => applyActiveBlockMove('right')}
        left={
          <div className="editor-pane relative h-full min-h-0">
            <Editor
              height="100%"
              language={resolvedLanguage}
              defaultValue={shouldAlign ? alignedView.original : original}
              theme={monacoTheme}
              beforeMount={handleBeforeMount}
              onMount={mountOriginal}
              options={createEditorOptions(settings)}
              path="original-editor"
            />
          </div>
        }
        right={
          <div className="editor-pane relative h-full min-h-0">
            <Editor
              height="100%"
              language={resolvedLanguage}
              defaultValue={shouldAlign ? alignedView.modified : modified}
              theme={monacoTheme}
              beforeMount={handleBeforeMount}
              onMount={mountModified}
              options={createEditorOptions(settings)}
              path="modified-editor"
            />
          </div>
        }
      />
    );
  },
);

export { CompareEditor as DiffEditorView };
