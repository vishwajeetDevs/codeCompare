import type { ReactNode } from 'react';
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { CompareActionBar } from '../CompareActionBar/CompareActionBar';
import { CompareEditor } from '../DiffEditor/DiffEditor';
import {
  DesktopPaneLabels,
  LargeFileBanner,
  LoadingOverlay,
  MobileEditorTabs,
} from '../Layout/Layout';
import { LocationPane } from '../LocationPane/LocationPane';
import { ShareBanner } from '../ShareDialog/ShareBanner';
import { Toolbar } from '../Toolbar/Toolbar';
import { MobileChangeNav } from '../Toolbar/ChangeNavBar';
import { useChangeNavigation } from '../../hooks/useChangeNavigation';
import { useComparison } from '../../hooks/useComparison';
import { useIsMobile } from '../../hooks/useMediaQuery';
import type { ThemeMode } from '../../types';
import type { ComparisonTabState } from '../../types/comparisonTab';
import type { EditorScrollMetrics } from '../../types/editor';
import type { MobileEditorView } from '../../types';
import { clampSplitRatio } from '../../hooks/useSplitRatio';

export interface ComparisonWorkspaceHandle {
  flushTabState: () => ComparisonTabState;
  settings: ReturnType<typeof useComparison>['settings'];
  updateSettings: ReturnType<typeof useComparison>['updateSettings'];
  compare: ReturnType<typeof useComparison>['compare'];
  swap: ReturnType<typeof useComparison>['swap'];
  clear: ReturnType<typeof useComparison>['clear'];
  share: ReturnType<typeof useComparison>['share'];
  getShareLink: ReturnType<typeof useComparison>['getShareLink'];
  copyShareLink: ReturnType<typeof useComparison>['copyShareLink'];
  showAlignedComparison: boolean;
  changeIndex: number;
  totalChanges: number;
  goPrev: () => void;
  goNext: () => void;
  closeFindWidgets: () => void;
  splitRatio: number;
  isLargeFile: boolean;
  sharedView: ReturnType<typeof useComparison>['sharedView'];
  isLoadingShare: boolean;
  startNew: ReturnType<typeof useComparison>['startNew'];
  dismissSharedBanner: ReturnType<typeof useComparison>['dismissSharedBanner'];
}

interface ComparisonWorkspaceProps {
  tabState: ComparisonTabState;
  isActive: boolean;
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  persistDraft: boolean;
  loadSharedFromUrl: boolean;
  locationPaneVisible: boolean;
  hideLocationPane: () => void;
  shortcutButtonsVisible: boolean;
  autoFormatEnabled: boolean;
  onOpenSettings: () => void;
  onToggleTheme: () => void;
  onPersistTab: (tab: ComparisonTabState) => void;
  tabBar?: ReactNode;
}

export const ComparisonWorkspace = forwardRef<
  ComparisonWorkspaceHandle,
  ComparisonWorkspaceProps
>(function ComparisonWorkspace(
  {
    tabState,
    isActive,
    theme,
    setTheme,
    persistDraft,
    loadSharedFromUrl,
    locationPaneVisible,
    hideLocationPane,
    shortcutButtonsVisible,
    autoFormatEnabled,
    onOpenSettings,
    onToggleTheme,
    onPersistTab,
    tabBar,
  },
  ref,
) {
  const comparison = useComparison(theme, {
    applySharedTheme: setTheme,
    persistDraft,
    loadSharedFromUrl,
    initialTabState: tabState,
  });

  const changeNav = useChangeNavigation(
    comparison.diffResult,
    comparison.compareVersion,
    comparison.showComparisonResults,
    tabState.activeChangeIndex,
  );

  const isMobile = useIsMobile();
  const [splitRatio, setSplitRatioState] = useState(tabState.splitRatio);
  const [originalLabel, setOriginalLabel] = useState(tabState.originalLabel);
  const [modifiedLabel, setModifiedLabel] = useState(tabState.modifiedLabel);
  const [mobileView, setMobileView] = useState<MobileEditorView>('diff');
  const [scrollMetrics, setScrollMetrics] = useState<EditorScrollMetrics | null>(
    null,
  );
  const restoredScrollRef = useRef(false);

  const setSplitRatio = useCallback((ratio: number) => {
    setSplitRatioState(clampSplitRatio(ratio));
  }, []);

  const shouldAlign =
    comparison.showAlignedComparison &&
    comparison.original.trim().length > 0 &&
    comparison.modified.trim().length > 0;

  const locationResult = useMemo(
    () => (shouldAlign ? changeNav.alignedResult : comparison.diffResult),
    [shouldAlign, changeNav.alignedResult, comparison.diffResult],
  );

  const buildPersistedTab = useCallback((): ComparisonTabState => {
    return comparison.captureTabState(tabState.id, {
      scrollRatio: comparison.editorRef.current?.getScrollRatio() ?? tabState.scrollRatio,
      activeChangeIndex: changeNav.activeIndex,
      splitRatio,
      title: tabState.title,
      titleCustomized: tabState.titleCustomized,
      originalLabel,
      modifiedLabel,
    });
  }, [
    changeNav.activeIndex,
    comparison,
    splitRatio,
    tabState.id,
    tabState.scrollRatio,
    tabState.title,
    tabState.titleCustomized,
    originalLabel,
    modifiedLabel,
  ]);

  const persistLatestRef = useRef(buildPersistedTab);
  persistLatestRef.current = buildPersistedTab;
  const onPersistTabRef = useRef(onPersistTab);
  onPersistTabRef.current = onPersistTab;

  useEffect(() => {
    if (!isActive) return;

    const timer = window.setTimeout(() => {
      onPersistTabRef.current(persistLatestRef.current());
    }, 400);

    return () => window.clearTimeout(timer);
  }, [
    isActive,
    comparison.original,
    comparison.modified,
    comparison.phase,
    comparison.compareVersion,
    comparison.settings,
    changeNav.activeIndex,
    splitRatio,
    originalLabel,
    modifiedLabel,
  ]);

  useEffect(() => {
    return () => {
      onPersistTabRef.current(persistLatestRef.current());
    };
  }, []);

  useEffect(() => {
    if (!isActive || restoredScrollRef.current) return;

    const ratio = tabState.scrollRatio;
    if (ratio <= 0) {
      restoredScrollRef.current = true;
      return;
    }

    const frame = requestAnimationFrame(() => {
      comparison.editorRef.current?.scrollToRatio(ratio);
      restoredScrollRef.current = true;
    });

    return () => cancelAnimationFrame(frame);
  }, [comparison.editorRef, isActive, tabState.scrollRatio]);

  const handleSelectLocationChange = useCallback(
    (changeIndex: number) => {
      comparison.editorRef.current?.closeFindWidgets();
      changeNav.setActiveIndex(changeIndex);

      if (!shouldAlign) {
        const group = changeNav.groups[changeIndex];
        if (group) {
          const ratio = Math.max(
            (group.alignedLine - 1) / locationResult.entries.length,
            0,
          );
          comparison.editorRef.current?.scrollToRatio(ratio);
        }
      }
    },
    [changeNav, comparison.editorRef, locationResult.entries.length, shouldAlign],
  );

  const handleScrollToRatio = useCallback(
    (ratio: number) => {
      comparison.editorRef.current?.scrollToRatio(ratio);
    },
    [comparison.editorRef],
  );

  const closeFindWidgets = useCallback(() => {
    comparison.editorRef.current?.closeFindWidgets();
  }, [comparison.editorRef]);

  const toggleWordWrap = useCallback(() => {
    comparison.updateSettings({
      wordWrap: comparison.settings.wordWrap === 'on' ? 'off' : 'on',
    });
  }, [comparison.settings.wordWrap, comparison.updateSettings]);

  useImperativeHandle(
    ref,
    () => ({
      flushTabState: buildPersistedTab,
      settings: comparison.settings,
      updateSettings: comparison.updateSettings,
      compare: comparison.compare,
      swap: comparison.swap,
      clear: comparison.clear,
      share: comparison.share,
      getShareLink: comparison.getShareLink,
      copyShareLink: comparison.copyShareLink,
      showAlignedComparison: comparison.showAlignedComparison,
      changeIndex: comparison.showAlignedComparison
        ? Math.max(changeNav.activeIndex, 0)
        : 0,
      totalChanges: comparison.showAlignedComparison ? changeNav.totalChanges : 0,
      goPrev: () => {
        closeFindWidgets();
        changeNav.goPrev();
      },
      goNext: () => {
        closeFindWidgets();
        changeNav.goNext();
      },
      closeFindWidgets,
      splitRatio,
      isLargeFile: comparison.isLargeFile,
      sharedView: comparison.sharedView,
      isLoadingShare: comparison.isLoadingShare,
      startNew: comparison.startNew,
      dismissSharedBanner: comparison.dismissSharedBanner,
    }),
    [
      buildPersistedTab,
      changeNav,
      closeFindWidgets,
      comparison,
      splitRatio,
    ],
  );

  return (
    <div className={isActive ? 'flex min-h-0 flex-1 flex-col' : 'hidden'}>
      <Toolbar
        theme={theme}
        splitRatio={splitRatio}
        changeIndex={
          comparison.showAlignedComparison ? Math.max(changeNav.activeIndex, 0) : 0
        }
        totalChanges={
          comparison.showAlignedComparison ? changeNav.totalChanges : 0
        }
        onSwap={comparison.swap}
        onToggleTheme={onToggleTheme}
        onOpenSettings={onOpenSettings}
        onClear={comparison.clear}
        onPrevChange={() => {
          closeFindWidgets();
          changeNav.goPrev();
        }}
        onNextChange={() => {
          closeFindWidgets();
          changeNav.goNext();
        }}
        onCloseFind={closeFindWidgets}
        showShortcutButtons={shortcutButtonsVisible}
        onGetShareLink={comparison.getShareLink}
        onCopyShareLink={comparison.copyShareLink}
      />

      {tabBar}

      {comparison.sharedView && (
        <ShareBanner
          displayId={comparison.sharedView.displayId}
          localOnly={comparison.sharedView.localOnly}
          hosted={comparison.sharedView.hosted}
          onStartNew={comparison.startNew}
          onDismiss={comparison.dismissSharedBanner}
        />
      )}

      {comparison.isLoadingShare && (
        <LoadingOverlay label="Loading shared comparison…" />
      )}

      {comparison.isLargeFile && <LargeFileBanner />}

      {shortcutButtonsVisible && (
        <MobileChangeNav
          changeIndex={
            comparison.showAlignedComparison ? Math.max(changeNav.activeIndex, 0) : 0
          }
          totalChanges={
            comparison.showAlignedComparison ? changeNav.totalChanges : 0
          }
          onPrevChange={() => {
            closeFindWidgets();
            changeNav.goPrev();
          }}
          onNextChange={() => {
            closeFindWidgets();
            changeNav.goNext();
          }}
          onCloseFind={closeFindWidgets}
        />
      )}

      <DesktopPaneLabels
        splitRatio={splitRatio}
        originalLabel={originalLabel}
        modifiedLabel={modifiedLabel}
        onOriginalLabelChange={setOriginalLabel}
        onModifiedLabelChange={setModifiedLabel}
      />

      {isMobile && (
        <MobileEditorTabs
          active={mobileView}
          onChange={setMobileView}
          originalLabel={originalLabel}
          modifiedLabel={modifiedLabel}
        />
      )}

      <main className="relative flex min-h-0 flex-1 overflow-hidden">
        <div className="relative min-h-0 min-w-0 flex-1">
          <CompareEditor
            ref={comparison.editorRef}
            instanceId={tabState.id}
            original={comparison.original}
            modified={comparison.modified}
            settings={comparison.settings}
            theme={theme}
            compareVersion={comparison.compareVersion}
            showDiffHighlights={comparison.showAlignedComparison}
            displayDiffResult={comparison.diffResult}
            activeChangeIndex={changeNav.activeIndex}
            activeChangeAlignedLine={changeNav.activeAlignedLine}
            activeChangeBlock={changeNav.activeChangeBlock}
            isMobile={isMobile}
            mobileView={isMobile ? mobileView : null}
            onOriginalChange={comparison.setOriginal}
            onModifiedChange={comparison.setModified}
            onBlockMove={comparison.applyBlockMove}
            splitRatio={splitRatio}
            onSplitRatioChange={setSplitRatio}
            onScrollMetrics={setScrollMetrics}
            onToggleWordWrap={toggleWordWrap}
            autoFormatEnabled={autoFormatEnabled}
          />
          <CompareActionBar
            visible={comparison.showCompareBar}
            mode={comparison.compareBarMode}
            disabled={!comparison.canRunCompare}
            loading={comparison.isComparing}
            onAction={() => void comparison.compare()}
          />
        </div>

        {locationPaneVisible && !isMobile && comparison.showAlignedComparison && (
          <LocationPane
            alignedResult={locationResult}
            groups={changeNav.groups}
            activeChangeIndex={changeNav.activeIndex}
            scrollMetrics={scrollMetrics}
            alignedMode={shouldAlign}
            onSelectChange={handleSelectLocationChange}
            onScrollToRatio={handleScrollToRatio}
            onClose={hideLocationPane}
          />
        )}
      </main>
    </div>
  );
});
