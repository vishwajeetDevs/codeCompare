import { useCallback, useMemo, useState } from 'react';
import { CompareActionBar } from '../CompareActionBar/CompareActionBar';
import { CompareEditor } from '../DiffEditor/DiffEditor';
import {
  DesktopPaneLabels,
  LargeFileBanner,
  LoadingOverlay,
  MobileEditorTabs,
} from '../Layout/Layout';
import { LocationPane } from '../LocationPane/LocationPane';
import { SettingsPanel } from '../Settings/SettingsPanel';
import { ShareBanner } from '../ShareDialog/ShareBanner';
import { ToastContainer } from '../Toast/ToastContainer';
import { Toolbar } from '../Toolbar/Toolbar';
import { MobileChangeNav } from '../Toolbar/ChangeNavBar';
import { useChangeNavigation } from '../../hooks/useChangeNavigation';
import { useLocationPaneVisibility } from '../../hooks/useLocationPaneVisibility';
import { useShortcutButtonsVisibility } from '../../hooks/useShortcutButtonsVisibility';
import { useComparison } from '../../hooks/useComparison';
import {
  KEYBOARD_SHORTCUTS,
  useKeyboardShortcuts,
} from '../../hooks/useKeyboardShortcuts';
import { useIsMobile } from '../../hooks/useMediaQuery';
import { useTheme } from '../../hooks/useTheme';
import { useSplitRatio } from '../../hooks/useSplitRatio';
import type { EditorScrollMetrics } from '../../types/editor';
import type { MobileEditorView } from '../../types';

export function AppShell() {
  const { theme, toggleTheme, setTheme } = useTheme();
  const comparison = useComparison(theme, setTheme);
  const changeNav = useChangeNavigation(
    comparison.diffResult,
    comparison.compareVersion,
    comparison.showComparisonResults,
  );
  const isMobile = useIsMobile();
  const { splitRatio, setSplitRatio } = useSplitRatio();
  const { visible: locationPaneVisible, setVisible: setLocationPaneVisible, hide: hideLocationPane } =
    useLocationPaneVisibility();
  const {
    visible: shortcutButtonsVisible,
    setVisible: setShortcutButtonsVisible,
  } = useShortcutButtonsVisibility();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mobileView, setMobileView] = useState<MobileEditorView>('diff');
  const [scrollMetrics, setScrollMetrics] = useState<EditorScrollMetrics | null>(
    null,
  );

  const shouldAlign =
    comparison.showComparisonResults &&
    comparison.original.trim().length > 0 &&
    comparison.modified.trim().length > 0;

  const locationResult = useMemo(
    () => (shouldAlign ? changeNav.alignedResult : comparison.diffResult),
    [shouldAlign, changeNav.alignedResult, comparison.diffResult],
  );

  const handleSelectLocationChange = useCallback(
    (changeIndex: number) => {
      comparison.editorRef.current?.closeFindWidgets();
      changeNav.setActiveIndex(changeIndex);

      if (!shouldAlign) {
        const group = changeNav.groups[changeIndex];
        if (group) {
          const ratio = Math.max((group.alignedLine - 1) / locationResult.entries.length, 0);
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

  const openSettings = useCallback(() => setSettingsOpen(true), []);
  const closeSettings = useCallback(() => setSettingsOpen(false), []);

  const closeFindWidgets = useCallback(() => {
    comparison.editorRef.current?.closeFindWidgets();
  }, [comparison.editorRef]);

  const toggleWordWrap = useCallback(() => {
    comparison.updateSettings({
      wordWrap: comparison.settings.wordWrap === 'on' ? 'off' : 'on',
    });
  }, [comparison.updateSettings, comparison.settings.wordWrap]);

  useKeyboardShortcuts({
    onCompare: comparison.compare,
    onSwap: comparison.swap,
    onClear: comparison.clear,
    onShare: comparison.share,
    onToggleSettings: () => setSettingsOpen((open) => !open),
    onToggleWordWrap: toggleWordWrap,
    onPrevChange: () => {
      closeFindWidgets();
      changeNav.goPrev();
    },
    onNextChange: () => {
      closeFindWidgets();
      changeNav.goNext();
    },
  });

  return (
    <div className="flex h-full flex-col bg-[var(--surface-1)]">
      <Toolbar
        settings={comparison.settings}
        theme={theme}
        splitRatio={splitRatio}
        changeIndex={
          comparison.showComparisonResults ? Math.max(changeNav.activeIndex, 0) : 0
        }
        totalChanges={
          comparison.showComparisonResults ? changeNav.totalChanges : 0
        }
        onSettingsChange={comparison.updateSettings}
        onToggleTheme={toggleTheme}
        onOpenSettings={openSettings}
        onClear={comparison.clear}
        onPrevChange={changeNav.goPrev}
        onNextChange={changeNav.goNext}
        onCloseFind={closeFindWidgets}
        showShortcutButtons={shortcutButtonsVisible}
        onGetShareLink={comparison.getShareLink}
        onCopyShareLink={comparison.copyShareLink}
      />

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
          changeIndex={comparison.showComparisonResults ? Math.max(changeNav.activeIndex, 0) : 0}
          totalChanges={comparison.showComparisonResults ? changeNav.totalChanges : 0}
          onPrevChange={changeNav.goPrev}
          onNextChange={changeNav.goNext}
          onCloseFind={closeFindWidgets}
        />
      )}

      <DesktopPaneLabels splitRatio={splitRatio} />

      {isMobile && (
        <MobileEditorTabs active={mobileView} onChange={setMobileView} />
      )}

      <main className="relative flex min-h-0 flex-1">
        <div className="relative min-h-0 min-w-0 flex-1">
          <CompareEditor
            ref={comparison.editorRef}
            original={comparison.original}
            modified={comparison.modified}
            settings={comparison.settings}
            theme={theme}
            compareVersion={comparison.compareVersion}
            showDiffHighlights={comparison.showComparisonResults}
            displayDiffResult={comparison.diffResult}
            activeChangeIndex={changeNav.activeIndex}
            activeChangeAlignedLine={changeNav.activeAlignedLine}
            activeChangeBlock={changeNav.activeChangeBlock}
            isMobile={isMobile}
            mobileView={isMobile ? mobileView : null}
            onOriginalChange={comparison.setOriginal}
            onModifiedChange={comparison.setModified}
            splitRatio={splitRatio}
            onSplitRatioChange={setSplitRatio}
            onScrollMetrics={setScrollMetrics}
            onToggleWordWrap={toggleWordWrap}
          />
          <CompareActionBar
            visible={comparison.showCompareBar}
            mode={comparison.compareBarMode}
            disabled={!comparison.canRunCompare}
            loading={comparison.isComparing}
            onAction={() => void comparison.compare()}
          />
        </div>

        {locationPaneVisible && !isMobile && comparison.showComparisonResults && (
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

      <SettingsPanel
        open={settingsOpen}
        wordWrap={comparison.settings.wordWrap === 'on'}
        locationPaneVisible={locationPaneVisible}
        shortcutButtonsVisible={shortcutButtonsVisible}
        onClose={closeSettings}
        onWordWrapChange={(enabled) =>
          comparison.updateSettings({ wordWrap: enabled ? 'on' : 'off' })
        }
        onLocationPaneVisibleChange={setLocationPaneVisible}
        onShortcutButtonsVisibleChange={setShortcutButtonsVisible}
      />

      <ToastContainer />

      <footer className="sr-only" aria-hidden="true">
        Shortcuts: {KEYBOARD_SHORTCUTS.map((s) => `${s.keys} ${s.action}`).join('; ')}
      </footer>
    </div>
  );
}
