import { useEffect, useRef, useState } from 'react';

interface ComparisonTabBarProps {
  tabs: Array<{ id: string; title: string }>;
  activeTabId: string;
  onSelectTab: (tabId: string) => void;
  onAddTab: () => void;
  onCloseTab: (tabId: string) => void;
  onRenameTab: (tabId: string, title: string) => void;
}

export function ComparisonTabBar({
  tabs,
  activeTabId,
  onSelectTab,
  onAddTab,
  onCloseTab,
  onRenameTab,
}: ComparisonTabBarProps) {
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editingTabId) return;
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [editingTabId]);

  const commitRename = (tabId: string) => {
    onRenameTab(tabId, draftTitle);
    setEditingTabId(null);
  };

  const startRename = (tabId: string, currentTitle: string) => {
    onSelectTab(tabId);
    setEditingTabId(tabId);
    setDraftTitle(currentTitle);
  };

  return (
    <div
      className="comparison-tab-bar flex shrink-0 items-center gap-1 overflow-x-auto border-b border-[var(--border)] bg-[var(--surface-2)] px-2 py-1 md:px-4"
      role="tablist"
      aria-label="Comparison tabs"
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        const isEditing = editingTabId === tab.id;

        return (
          <div
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            className={`comparison-tab group flex h-7 w-36 shrink-0 items-center gap-1 rounded-md border px-1.5 text-xs ${
              isActive
                ? 'border-[var(--accent)] bg-[var(--accent-muted)] text-[var(--text-primary)]'
                : 'border-[var(--border)] bg-[var(--surface-1)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
            }`}
          >
            {isEditing ? (
              <input
                ref={inputRef}
                value={draftTitle}
                onChange={(event) => setDraftTitle(event.target.value)}
                onBlur={() => commitRename(tab.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    commitRename(tab.id);
                  }
                  if (event.key === 'Escape') {
                    event.preventDefault();
                    setEditingTabId(null);
                  }
                }}
                className="comparison-tab-name-input min-w-0 flex-1 bg-transparent px-0.5 text-xs text-[var(--text-primary)] outline-none"
                aria-label="Tab name"
              />
            ) : (
              <button
                type="button"
                className="comparison-tab-name min-w-0 flex-1 truncate text-left"
                onClick={() => {
                  if (isActive) {
                    startRename(tab.id, tab.title);
                    return;
                  }
                  onSelectTab(tab.id);
                }}
                onDoubleClick={(event) => {
                  event.preventDefault();
                  startRename(tab.id, tab.title);
                }}
                title={tab.title}
              >
                {tab.title}
              </button>
            )}
            <button
              type="button"
              className="comparison-tab-close flex h-5 w-5 shrink-0 items-center justify-center rounded text-[var(--text-muted)] opacity-70 transition-opacity hover:bg-[var(--surface-3)] hover:text-[var(--text-primary)] group-hover:opacity-100"
              onClick={(event) => {
                event.stopPropagation();
                if (editingTabId === tab.id) setEditingTabId(null);
                onCloseTab(tab.id);
              }}
              aria-label={`Close ${tab.title}`}
              title="Close tab"
            >
              ×
            </button>
          </div>
        );
      })}

      <button
        type="button"
        className="comparison-tab-add flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface-1)] text-base leading-none text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-3)] hover:text-[var(--text-primary)]"
        onClick={onAddTab}
        aria-label="New comparison tab"
        title="New tab"
      >
        +
      </button>
    </div>
  );
}
