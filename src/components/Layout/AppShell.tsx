import { useCallback, useRef, useState } from 'react';
import {
  ComparisonWorkspace,
  type ComparisonWorkspaceHandle,
} from '../Layout/ComparisonWorkspace';
import { SettingsPanel } from '../Settings/SettingsPanel';
import { ComparisonTabBar } from '../Tabs/ComparisonTabBar';
import { ToastContainer } from '../Toast/ToastContainer';
import { useComparisonTabs } from '../../hooks/useComparisonTabs';
import { useLocationPaneVisibility } from '../../hooks/useLocationPaneVisibility';
import { useMultipleTabsEnabled } from '../../hooks/useMultipleTabsEnabled';
import { useShortcutButtonsVisibility } from '../../hooks/useShortcutButtonsVisibility';
import {
  KEYBOARD_SHORTCUTS,
  useKeyboardShortcuts,
} from '../../hooks/useKeyboardShortcuts';
import { useTheme } from '../../hooks/useTheme';
import { saveComparisonDraft, loadComparisonDraft } from '../../utils/comparisonStorage';
import { createComparisonTab } from '../../types/comparisonTab';

function createSingleTabFromDraft() {
  const draft = loadComparisonDraft();
  return createComparisonTab({
    original: draft.original,
    modified: draft.modified,
    phase:
      draft.original.trim() && draft.modified.trim() ? ('compared' as const) : ('idle' as const),
  });
}

export function AppShell() {
  const { theme, toggleTheme, setTheme } = useTheme();
  const { enabled: multipleTabsEnabled, setEnabled: setMultipleTabsEnabled } =
    useMultipleTabsEnabled();
  const comparisonTabs = useComparisonTabs(multipleTabsEnabled);
  const { visible: locationPaneVisible, setVisible: setLocationPaneVisible } =
    useLocationPaneVisibility();
  const {
    visible: shortcutButtonsVisible,
    setVisible: setShortcutButtonsVisible,
  } = useShortcutButtonsVisibility();

  const [settingsOpen, setSettingsOpen] = useState(false);
  const workspaceRefs = useRef<Map<string, ComparisonWorkspaceHandle>>(new Map());
  const singleTabStateRef = useRef(createSingleTabFromDraft());

  const getActiveWorkspace = useCallback((): ComparisonWorkspaceHandle | undefined => {
    if (multipleTabsEnabled) {
      return workspaceRefs.current.get(comparisonTabs.activeTabId);
    }
    return workspaceRefs.current.get('single');
  }, [comparisonTabs.activeTabId, multipleTabsEnabled]);

  const flushActiveTab = useCallback(() => {
    if (!multipleTabsEnabled) {
      const single = workspaceRefs.current.get('single');
      if (single) singleTabStateRef.current = single.flushTabState();
      return;
    }

    const active = workspaceRefs.current.get(comparisonTabs.activeTabId);
    if (!active) return;
    comparisonTabs.replaceTab(comparisonTabs.activeTabId, active.flushTabState());
  }, [comparisonTabs, multipleTabsEnabled]);

  const handlePersistTab = useCallback(
    (tab: Parameters<typeof comparisonTabs.replaceTab>[1]) => {
      comparisonTabs.replaceTab(tab.id, tab);
    },
    [comparisonTabs.replaceTab],
  );

  const handleSelectTab = useCallback(
    (tabId: string) => {
      if (tabId === comparisonTabs.activeTabId) return;
      flushActiveTab();
      comparisonTabs.selectTab(tabId);
    },
    [comparisonTabs, flushActiveTab],
  );

  const handleCloseTab = useCallback(
    (tabId: string) => {
      if (tabId === comparisonTabs.activeTabId) {
        flushActiveTab();
      }
      workspaceRefs.current.delete(tabId);
      comparisonTabs.closeTab(tabId);
    },
    [comparisonTabs, flushActiveTab],
  );

  const handleAddTab = useCallback(() => {
    flushActiveTab();
    comparisonTabs.addTab();
  }, [comparisonTabs, flushActiveTab]);

  const handleRenameTab = useCallback(
    (tabId: string, title: string) => {
      comparisonTabs.renameTab(tabId, title);
    },
    [comparisonTabs.renameTab],
  );

  const handleMultipleTabsChange = useCallback(
    (enabled: boolean) => {
      if (enabled === multipleTabsEnabled) return;

      if (enabled) {
        const active = workspaceRefs.current.get('single');
        const tabState = active?.flushTabState() ?? singleTabStateRef.current;
        comparisonTabs.importSingleTab(tabState);
        setMultipleTabsEnabled(true);
        return;
      }

      const active = workspaceRefs.current.get(comparisonTabs.activeTabId);
      const tabState =
        active?.flushTabState() ?? comparisonTabs.activeTab ?? createComparisonTab();
      singleTabStateRef.current = tabState;
      saveComparisonDraft(tabState.original, tabState.modified);
      workspaceRefs.current.clear();
      setMultipleTabsEnabled(false);
    },
    [comparisonTabs, multipleTabsEnabled, setMultipleTabsEnabled],
  );

  const openSettings = useCallback(() => setSettingsOpen(true), []);
  const closeSettings = useCallback(() => setSettingsOpen(false), []);

  const toggleWordWrap = useCallback(() => {
    const workspace = getActiveWorkspace();
    if (!workspace) return;
    workspace.updateSettings({
      wordWrap: workspace.settings.wordWrap === 'on' ? 'off' : 'on',
    });
  }, [getActiveWorkspace]);

  useKeyboardShortcuts({
    onCompare: () => void getActiveWorkspace()?.compare(),
    onSwap: () => getActiveWorkspace()?.swap(),
    onClear: () => getActiveWorkspace()?.clear(),
    onShare: () => void getActiveWorkspace()?.share(),
    onToggleSettings: () => setSettingsOpen((open) => !open),
    onToggleWordWrap: toggleWordWrap,
    onPrevChange: () => getActiveWorkspace()?.goPrev(),
    onNextChange: () => getActiveWorkspace()?.goNext(),
  });

  const activeWorkspace = getActiveWorkspace();

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[var(--surface-1)]">
      <div className="flex min-h-0 flex-1 flex-col">
        {multipleTabsEnabled ? (
          <ComparisonWorkspace
            key={comparisonTabs.activeTab.id}
            ref={(handle) => {
              if (handle) {
                workspaceRefs.current.set(comparisonTabs.activeTab.id, handle);
              } else {
                workspaceRefs.current.delete(comparisonTabs.activeTab.id);
              }
            }}
            tabState={comparisonTabs.activeTab}
            isActive
            theme={theme}
            setTheme={setTheme}
            persistDraft={false}
            loadSharedFromUrl={false}
            locationPaneVisible={locationPaneVisible}
            hideLocationPane={() => setLocationPaneVisible(false)}
            shortcutButtonsVisible={shortcutButtonsVisible}
            onOpenSettings={openSettings}
            onToggleTheme={toggleTheme}
            onPersistTab={handlePersistTab}
            tabBar={
              <ComparisonTabBar
                tabs={comparisonTabs.tabs.map((item) => ({
                  id: item.id,
                  title: item.title,
                }))}
                activeTabId={comparisonTabs.activeTabId}
                onSelectTab={handleSelectTab}
                onAddTab={handleAddTab}
                onCloseTab={handleCloseTab}
                onRenameTab={handleRenameTab}
              />
            }
          />
        ) : (
          <ComparisonWorkspace
            key="single"
            ref={(handle) => {
              if (handle) workspaceRefs.current.set('single', handle);
              else workspaceRefs.current.delete('single');
            }}
            tabState={singleTabStateRef.current}
            isActive
            theme={theme}
            setTheme={setTheme}
            persistDraft
            loadSharedFromUrl
            locationPaneVisible={locationPaneVisible}
            hideLocationPane={() => setLocationPaneVisible(false)}
            shortcutButtonsVisible={shortcutButtonsVisible}
            onOpenSettings={openSettings}
            onToggleTheme={toggleTheme}
            onPersistTab={(tab) => {
              singleTabStateRef.current = tab;
            }}
          />
        )}
      </div>

      <SettingsPanel
        open={settingsOpen}
        wordWrap={activeWorkspace?.settings.wordWrap === 'on' || false}
        locationPaneVisible={locationPaneVisible}
        shortcutButtonsVisible={shortcutButtonsVisible}
        multipleTabsEnabled={multipleTabsEnabled}
        onClose={closeSettings}
        onSwap={() => getActiveWorkspace()?.swap()}
        onWordWrapChange={(enabled) =>
          activeWorkspace?.updateSettings({ wordWrap: enabled ? 'on' : 'off' })
        }
        onLocationPaneVisibleChange={setLocationPaneVisible}
        onShortcutButtonsVisibleChange={setShortcutButtonsVisible}
        onMultipleTabsEnabledChange={handleMultipleTabsChange}
      />

      <ToastContainer />

      <footer className="sr-only" aria-hidden="true">
        Shortcuts: {KEYBOARD_SHORTCUTS.map((s) => `${s.keys} ${s.action}`).join('; ')}
      </footer>
    </div>
  );
}
