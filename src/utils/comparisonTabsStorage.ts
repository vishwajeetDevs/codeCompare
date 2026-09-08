import type { ComparisonTabState } from '../types/comparisonTab';
import { createComparisonTab } from '../types/comparisonTab';
import { loadComparisonDraft } from './comparisonStorage';

const STORAGE_KEY = 'codecompare-tabs-v1';

interface StoredTabsPayload {
  activeTabId: string;
  tabs: ComparisonTabState[];
}

export function loadComparisonTabs(): StoredTabsPayload | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const data = JSON.parse(raw) as Partial<StoredTabsPayload>;
    if (!Array.isArray(data.tabs) || data.tabs.length === 0) return null;

    const tabs = data.tabs
      .map((tab) => createComparisonTab(tab))
      .filter((tab) => typeof tab.id === 'string');

    if (tabs.length === 0) return null;

    const activeTabId =
      typeof data.activeTabId === 'string' &&
      tabs.some((tab) => tab.id === data.activeTabId)
        ? data.activeTabId
        : tabs[0].id;

    return { activeTabId, tabs };
  } catch {
    return null;
  }
}

export function saveComparisonTabs(activeTabId: string, tabs: ComparisonTabState[]): void {
  try {
    if (tabs.length === 0) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ activeTabId, tabs } satisfies StoredTabsPayload),
    );
  } catch {
    /* ignore */
  }
}

export function clearComparisonTabsStorage(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function createInitialTabsFromDraft(): StoredTabsPayload {
  const draft = loadComparisonDraft();
  const tab = createComparisonTab({
    original: draft.original,
    modified: draft.modified,
    phase:
      draft.original.trim() && draft.modified.trim() ? ('compared' as const) : ('idle' as const),
  });

  return {
    activeTabId: tab.id,
    tabs: [tab],
  };
}
