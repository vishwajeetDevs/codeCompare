import type { MobileEditorView } from '../../types';
import { SPLIT_DIVIDER_WIDTH_PX } from './ResizableSplitPane';

interface MobileEditorTabsProps {
  active: MobileEditorView;
  onChange: (view: MobileEditorView) => void;
}

const TABS: { id: MobileEditorView; label: string }[] = [
  { id: 'original', label: 'Original' },
  { id: 'modified', label: 'Modified' },
  { id: 'diff', label: 'Diff' },
];

export function MobileEditorTabs({ active, onChange }: MobileEditorTabsProps) {
  return (
    <div
      className="flex border-b border-[var(--border)] bg-[var(--surface-2)] md:hidden"
      role="tablist"
      aria-label="Editor view"
    >
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={active === tab.id}
          className={`flex-1 cursor-pointer px-3 py-2.5 text-sm font-medium transition-colors ${
            active === tab.id
              ? 'border-b-2 border-[var(--accent)] text-[var(--text-primary)]'
              : 'text-[var(--text-muted)]'
          }`}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export function EmptyState() {
  return (
    <div className="pointer-events-none absolute inset-0 z-[5] flex items-center justify-center p-6">
      <div className="max-w-sm rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-2)]/90 px-6 py-8 text-center backdrop-blur-sm">
        <p className="text-sm font-medium text-[var(--text-primary)]">
          Paste code to compare
        </p>
        <p className="mt-2 text-xs text-[var(--text-muted)]">
          Original on the left, modified on the right. Indentation is preserved
          exactly when you paste.
        </p>
      </div>
    </div>
  );
}

export function LoadingOverlay({ label = 'Comparing…' }: { label?: string }) {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-[var(--surface-1)]/60 backdrop-blur-[1px]">
      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-sm text-[var(--text-secondary)]">
        <span className="mr-2 inline-block h-3 w-3 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
        {label}
      </div>
    </div>
  );
}

export function LargeFileBanner() {
  return (
    <div className="border-b border-amber-600/30 bg-amber-500/10 px-4 py-2 text-xs text-[var(--text-secondary)] md:px-6">
      Large file detected — line diff optimizations are enabled. Comparison may
      take a moment.
    </div>
  );
}

export function DesktopPaneLabels({ splitRatio = 0.5 }: { splitRatio?: number }) {
  const leftWidth = `calc(${splitRatio * 100}% - ${splitRatio * SPLIT_DIVIDER_WIDTH_PX}px)`;

  return (
    <div className="hidden border-b border-[var(--border)] bg-[var(--surface-2)] md:flex">
      <div
        className="shrink-0 border-r border-[var(--border)] px-4 py-2 text-center text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] md:px-6"
        style={{ width: leftWidth }}
      >
        Original
      </div>
      <div
        className="shrink-0"
        style={{ width: SPLIT_DIVIDER_WIDTH_PX }}
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1 px-4 py-2 text-center text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] md:px-6">
        Modified
      </div>
    </div>
  );
}
