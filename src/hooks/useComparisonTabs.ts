import { useCallback, useEffect, useRef, useState } from 'react';
import type { ComparisonTabState } from '../types/comparisonTab';
import { createComparisonTab, normalizeTabTitle } from '../types/comparisonTab';
import {
  createInitialTabsFromDraft,
  loadComparisonTabs,
  saveComparisonTabs,
} from '../utils/comparisonTabsStorage';

export function useComparisonTabs(enabled: boolean) {
  const initial = loadComparisonTabs() ?? createInitialTabsFromDraft();
  const [tabs, setTabs] = useState<ComparisonTabState[]>(initial.tabs);
  const [activeTabId, setActiveTabId] = useState(initial.activeTabId);
  const tabsRef = useRef(tabs);
  tabsRef.current = tabs;

  useEffect(() => {
    if (!enabled) return;

    const timer = window.setTimeout(() => {
      saveComparisonTabs(activeTabId, tabsRef.current);
    }, 400);

    return () => window.clearTimeout(timer);
  }, [enabled, activeTabId, tabs]);

  const updateTab = useCallback(
    (tabId: string, patch: Partial<ComparisonTabState>) => {
      setTabs((current) =>
        current.map((tab) => {
          if (tab.id !== tabId) return tab;
          return createComparisonTab({ ...tab, ...patch, id: tabId });
        }),
      );
    },
    [],
  );

  const renameTab = useCallback((tabId: string, title: string) => {
    const nextTitle = normalizeTabTitle(title);
    setTabs((current) =>
      current.map((tab) =>
        tab.id === tabId
          ? createComparisonTab({
              ...tab,
              id: tabId,
              title: nextTitle,
              titleCustomized: true,
            })
          : tab,
      ),
    );
  }, []);

  const replaceTab = useCallback((tabId: string, nextTab: ComparisonTabState) => {
    setTabs((current) =>
      current.map((tab) =>
        tab.id === tabId ? createComparisonTab({ ...nextTab, id: tabId }) : tab,
      ),
    );
  }, []);

  const addTab = useCallback(() => {
    const tab = createComparisonTab();
    setTabs((current) => [...current, tab]);
    setActiveTabId(tab.id);
    return tab.id;
  }, []);

  const closeTab = useCallback(
    (tabId: string) => {
      setTabs((current) => {
        if (current.length <= 1) {
          const reset = createComparisonTab();
          setActiveTabId(reset.id);
          return [reset];
        }

        const index = current.findIndex((tab) => tab.id === tabId);
        if (index === -1) return current;

        const nextTabs = current.filter((tab) => tab.id !== tabId);
        setActiveTabId((currentActive) => {
          if (currentActive !== tabId) return currentActive;
          const nextIndex = Math.min(index, nextTabs.length - 1);
          return nextTabs[nextIndex]?.id ?? nextTabs[0].id;
        });

        return nextTabs;
      });
    },
    [],
  );

  const selectTab = useCallback((tabId: string) => {
    setActiveTabId(tabId);
  }, []);

  const activeTab =
    tabs.find((tab) => tab.id === activeTabId) ?? tabs[0] ?? createComparisonTab();

  const importSingleTab = useCallback((tab: ComparisonTabState) => {
    setTabs([tab]);
    setActiveTabId(tab.id);
  }, []);

  const resetToSingleEmpty = useCallback(() => {
    const tab = createComparisonTab();
    setTabs([tab]);
    setActiveTabId(tab.id);
  }, []);

  return {
    tabs,
    activeTabId,
    activeTab,
    updateTab,
    replaceTab,
    renameTab,
    addTab,
    closeTab,
    selectTab,
    importSingleTab,
    resetToSingleEmpty,
  };
}
