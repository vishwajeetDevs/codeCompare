import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CompareEditorHandle } from '../components/DiffEditor/DiffEditor';
import { stripTrailingBlankLines } from '../diff/alignTexts';
import {
  buildComparisonReportData,
  computeLineDiff,
  createEmptyLineDiffResult,
  createReportCsv,
  createReportText,
  createUnifiedDiff,
} from '../diff';
import { computeComparisonStats } from '../diff/stats';
import type { DownloadKind } from '../types';
import type { ShareLinkResult } from '../types/share';
import {
  downloadTextFile,
  filenameForLanguage,
} from '../utils/download';
import { DEFAULT_EDITOR_SETTINGS, resolveEditorLanguage } from '../utils/editorConfig';
import {
  buildShareLink,
  getShareRouteMeta,
  loadSharedComparisonFromUrl,
  loadSharedComparisonFromUrlSync,
  needsAsyncShareLoad,
} from '../utils/share/shareLink';
import {
  clearComparisonDraft,
  loadComparisonDraft,
  saveComparisonDraft,
} from '../utils/comparisonStorage';
import type { ThemeMode } from '../types';
import type { ComparisonTabState } from '../types/comparisonTab';
import { DEFAULT_TAB_TITLE } from '../types/comparisonTab';
import { useToast } from './useToast';

const LARGE_FILE_LINE_THRESHOLD = 5000;

export type ComparisonPhase = 'idle' | 'compared' | 'stale';

export interface UseComparisonOptions {
  applySharedTheme?: (theme: ThemeMode) => void;
  persistDraft?: boolean;
  loadSharedFromUrl?: boolean;
  initialTabState?: ComparisonTabState;
}

function readInitialComparison(initialTabState?: ComparisonTabState): {
  original: string;
  modified: string;
} {
  if (initialTabState) {
    return {
      original: initialTabState.original,
      modified: initialTabState.modified,
    };
  }

  const shared = loadSharedComparisonFromUrlSync();
  if (shared) {
    return { original: shared.original, modified: shared.modified };
  }
  return loadComparisonDraft();
}

function initialPhase(initialTabState?: ComparisonTabState): ComparisonPhase {
  if (initialTabState) return initialTabState.phase;

  const shared = loadSharedComparisonFromUrlSync();
  if (shared?.original.trim() && shared?.modified.trim()) return 'compared';
  return 'idle';
}

function countLines(text: string): number {
  if (!text) return 0;
  return text.split('\n').length;
}

export function useComparison(
  theme: ThemeMode,
  options: UseComparisonOptions = {},
) {
  const {
    applySharedTheme,
    persistDraft = true,
    loadSharedFromUrl = true,
    initialTabState,
  } = options;

  const initial = readInitialComparison(initialTabState);
  const startingPhase = initialPhase(initialTabState);

  const [original, setOriginal] = useState(initial.original);
  const [modified, setModified] = useState(initial.modified);
  const [phase, setPhase] = useState<ComparisonPhase>(startingPhase);
  const [snapshot, setSnapshot] = useState(() =>
    initialTabState?.snapshot ??
      (startingPhase === 'compared'
        ? { original: initial.original, modified: initial.modified }
        : { original: '', modified: '' }),
  );
  const [compareVersion, setCompareVersion] = useState(
    initialTabState?.compareVersion ??
      (startingPhase === 'compared' ? 1 : 0),
  );
  const [isComparing, setIsComparing] = useState(false);
  const [sharedView, setSharedView] = useState<{
    displayId: string;
    localOnly: boolean;
    hosted?: boolean;
  } | null>(() => (loadSharedFromUrl ? getShareRouteMeta() : null));
  const [isLoadingShare, setIsLoadingShare] = useState(
    loadSharedFromUrl ? needsAsyncShareLoad() : false,
  );
  const [settings, setSettings] = useState(
    initialTabState?.settings ?? DEFAULT_EDITOR_SETTINGS,
  );
  const updateSettings = useCallback((partial: Partial<typeof settings>) => {
    setSettings((current) => ({ ...current, ...partial }));
  }, []);
  const { showToast } = useToast();
  const editorRef = useRef<CompareEditorHandle>(null);

  useEffect(() => {
    if (!loadSharedFromUrl) return;

    let cancelled = false;

    async function applySharedPayload() {
      const shared = await loadSharedComparisonFromUrl();
      if (cancelled || !shared) {
        setIsLoadingShare(false);
        return;
      }

      updateSettings({
        ...(shared.language !== undefined && { language: shared.language }),
        ...(shared.tabSize !== undefined && { tabSize: shared.tabSize }),
        ...(shared.insertSpaces !== undefined && {
          insertSpaces: shared.insertSpaces,
        }),
      });
      if (shared.theme === 'light' || shared.theme === 'dark') {
        applySharedTheme?.(shared.theme);
      }

      setOriginal(shared.original);
      setModified(shared.modified);
      setSharedView(getShareRouteMeta());
      if (shared.original.trim() && shared.modified.trim()) {
        setSnapshot({ original: shared.original, modified: shared.modified });
        setPhase('compared');
        setCompareVersion((version) => version + 1);
      }
      setIsLoadingShare(false);
    }

    if (needsAsyncShareLoad()) {
      void applySharedPayload();
    } else {
      const shared = loadSharedComparisonFromUrlSync();
      if (!shared) return;

      updateSettings({
        ...(shared.language !== undefined && { language: shared.language }),
        ...(shared.tabSize !== undefined && { tabSize: shared.tabSize }),
        ...(shared.insertSpaces !== undefined && {
          insertSpaces: shared.insertSpaces,
        }),
      });
      if (shared.theme === 'light' || shared.theme === 'dark') {
        applySharedTheme?.(shared.theme);
      }
      setSharedView(getShareRouteMeta());
      if (shared.original.trim() && shared.modified.trim()) {
        setSnapshot({ original: shared.original, modified: shared.modified });
        setPhase('compared');
        setCompareVersion((version) => version + 1);
      }
    }

    return () => {
      cancelled = true;
    };
  }, [updateSettings, applySharedTheme, loadSharedFromUrl]);

  useEffect(() => {
    if (!persistDraft) return;

    const timer = window.setTimeout(() => {
      saveComparisonDraft(original, modified);
    }, 400);

    return () => window.clearTimeout(timer);
  }, [original, modified, persistDraft]);

  useEffect(() => {
    if (!original.trim() && !modified.trim()) {
      setPhase('idle');
      setSnapshot({ original: '', modified: '' });
      setCompareVersion(0);
      return;
    }

    const normOriginal = stripTrailingBlankLines(original);
    const normModified = stripTrailingBlankLines(modified);
    const normSnapOriginal = stripTrailingBlankLines(snapshot.original);
    const normSnapModified = stripTrailingBlankLines(snapshot.modified);

    if (phase === 'compared') {
      if (
        normOriginal !== normSnapOriginal ||
        normModified !== normSnapModified
      ) {
        setPhase('stale');
      }
      return;
    }

    if (phase === 'stale') {
      if (
        normOriginal === normSnapOriginal &&
        normModified === normSnapModified
      ) {
        setPhase('compared');
      }
    }
  }, [original, modified, phase, snapshot.original, snapshot.modified]);

  const diffResult = useMemo(() => {
    if (phase === 'idle') return createEmptyLineDiffResult();
    try {
      return computeLineDiff(snapshot.original, snapshot.modified);
    } catch {
      return createEmptyLineDiffResult();
    }
  }, [phase, snapshot, compareVersion]);

  const comparisonStats = useMemo(
    () => computeComparisonStats(diffResult),
    [diffResult],
  );

  const reportData = useMemo(
    () => buildComparisonReportData(diffResult),
    [diffResult],
  );

  const reportText = useMemo(() => {
    if (phase === 'idle') {
      return createReportText(original, modified, reportData, diffResult);
    }
    return createReportText(
      snapshot.original,
      snapshot.modified,
      reportData,
      diffResult,
    );
  }, [phase, original, modified, snapshot, reportData, diffResult]);

  const reportCsv = useMemo(() => createReportCsv(reportData), [reportData]);

  const hasAnyContent = Boolean(original.trim() || modified.trim());
  const hasBothContent = Boolean(original.trim() && modified.trim());
  const isEmpty = !hasAnyContent;
  const showComparisonResults = phase !== 'idle';
  const showAlignedComparison = phase === 'compared';
  const showCompareBar = hasAnyContent && (phase === 'idle' || phase === 'stale');
  const compareBarMode: 'compare' | 'refresh' = phase === 'stale' ? 'refresh' : 'compare';
  const canRunCompare = hasBothContent && !isComparing;

  const isLargeFile =
    countLines(original) > LARGE_FILE_LINE_THRESHOLD ||
    countLines(modified) > LARGE_FILE_LINE_THRESHOLD;

  const runComparison = useCallback(async () => {
    const live = editorRef.current?.getRawContents();
    const sourceOriginal = live?.original ?? original;
    const sourceModified = live?.modified ?? modified;

    if (!sourceOriginal.trim() || !sourceModified.trim()) {
      showToast('Enter code in both panes to compare', 'info');
      return;
    }

    setIsComparing(true);
    await new Promise((resolve) => window.setTimeout(resolve, 120));

    const normalizedOriginal = stripTrailingBlankLines(sourceOriginal);
    const normalizedModified = stripTrailingBlankLines(sourceModified);

    if (normalizedOriginal !== original) setOriginal(normalizedOriginal);
    if (normalizedModified !== modified) setModified(normalizedModified);

    setSnapshot({
      original: normalizedOriginal,
      modified: normalizedModified,
    });
    setCompareVersion((version) => version + 1);
    setPhase('compared');
    setIsComparing(false);

    showToast(
      phase === 'stale' ? 'Comparison refreshed' : 'Comparison complete',
      'success',
    );
  }, [original, modified, phase, showToast]);

  const compare = runComparison;

  const swap = useCallback(() => {
    const live = editorRef.current?.getRawContents();
    const currentOriginal = live?.original ?? original;
    const currentModified = live?.modified ?? modified;

    if (!currentOriginal && !currentModified) {
      showToast('Nothing to swap', 'info');
      return;
    }

    const nextOriginal = currentModified;
    const nextModified = currentOriginal;

    setOriginal(nextOriginal);
    setModified(nextModified);

    if (phase !== 'idle') {
      setPhase('stale');
    }

    editorRef.current?.swapPanes(nextOriginal, nextModified);
    showToast('Swapped original and modified', 'info');
  }, [original, modified, phase, showToast]);

  const clear = useCallback(() => {
    setOriginal('');
    setModified('');
    setSnapshot({ original: '', modified: '' });
    setPhase('idle');
    setCompareVersion(0);
    editorRef.current?.clearBoth();
    if (persistDraft) {
      clearComparisonDraft();
    }
    showToast('Editors cleared', 'info');
  }, [persistDraft, showToast]);

  const format = useCallback(async () => {
    try {
      await editorRef.current?.formatBoth();
      if (phase === 'compared') {
        setPhase('stale');
      }
      showToast('Formatted both editors', 'success');
    } catch {
      showToast('Format failed for this language', 'error');
    }
  }, [phase, showToast]);

  const getShareLink = useCallback(async () => {
    return buildShareLink(original, modified, settings, theme);
  }, [original, modified, settings, theme]);

  const share = useCallback(async () => {
    try {
      const result = await getShareLink();
      await navigator.clipboard.writeText(result.url);
      const hint = result.hosted ? ' (saved to database)' : '';
      showToast(`Share link copied · ${result.displayId}${hint}`, 'success');
      return result;
    } catch {
      showToast('Could not copy share link', 'error');
      return null;
    }
  }, [getShareLink, showToast]);

  const copyShareLink = useCallback(
    async (link?: ShareLinkResult) => {
      try {
        const result = link ?? (await getShareLink());
        await navigator.clipboard.writeText(result.url);
        return true;
      } catch {
        showToast('Could not copy share link', 'error');
        return false;
      }
    },
    [getShareLink, showToast],
  );

  const startNew = useCallback(() => {
    setSharedView(null);
    setOriginal('');
    setModified('');
    setSnapshot({ original: '', modified: '' });
    setPhase('idle');
    setCompareVersion(0);
    editorRef.current?.clearBoth();
    if (persistDraft) {
      clearComparisonDraft();
    }
    window.history.replaceState({}, '', '/');
    showToast('Started new comparison', 'info');
  }, [persistDraft, showToast]);

  const dismissSharedBanner = useCallback(() => {
    setSharedView(null);
  }, []);

  const download = useCallback(
    (kind: DownloadKind) => {
      const language = resolveEditorLanguage(
        settings.language,
        original,
        modified,
      );

      try {
        switch (kind) {
          case 'original':
            downloadTextFile(
              filenameForLanguage('original', language),
              original,
            );
            break;
          case 'modified':
            downloadTextFile(
              filenameForLanguage('modified', language),
              modified,
            );
            break;
          case 'diff':
            downloadTextFile(
              'comparison.diff',
              createUnifiedDiff(original, modified),
            );
            break;
          case 'report':
            downloadTextFile('comparison-report.txt', reportText);
            break;
        }
        showToast('Download started', 'success');
      } catch {
        showToast('Download failed', 'error');
      }
    },
    [original, modified, settings.language, reportText, showToast],
  );

  const captureTabState = useCallback(
    (tabId: string, extras: {
      scrollRatio: number;
      activeChangeIndex: number;
      splitRatio: number;
      title?: string;
      titleCustomized?: boolean;
    }): ComparisonTabState => ({
      id: tabId,
      title: extras.title ?? DEFAULT_TAB_TITLE,
      titleCustomized: extras.titleCustomized ?? false,
      original,
      modified,
      phase,
      snapshot,
      compareVersion,
      settings,
      scrollRatio: extras.scrollRatio,
      activeChangeIndex: extras.activeChangeIndex,
      splitRatio: extras.splitRatio,
    }),
    [
      original,
      modified,
      phase,
      snapshot,
      compareVersion,
      settings,
    ],
  );

  return {
    original,
    modified,
    setOriginal,
    setModified,
    settings,
    updateSettings,
    compareVersion,
    phase,
    showComparisonResults,
    showAlignedComparison,
    showCompareBar,
    compareBarMode,
    canRunCompare,
    compare,
    swap,
    clear,
    format,
    share,
    getShareLink,
    copyShareLink,
    download,
    startNew,
    dismissSharedBanner,
    editorRef,
    diffResult,
    comparisonStats,
    reportData,
    reportText,
    reportCsv,
    sharedView,
    isLoadingShare,
    isEmpty,
    isLargeFile,
    isComparing,
    captureTabState,
  };
};
