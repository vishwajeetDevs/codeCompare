import { useEffect, useRef, useState } from 'react';
import type { MobileEditorView } from '../../types';
import {
  DEFAULT_MODIFIED_LABEL,
  DEFAULT_ORIGINAL_LABEL,
  normalizePaneLabel,
} from '../../types/comparisonTab';
import { SPLIT_DIVIDER_WIDTH_PX } from './ResizableSplitPane';

interface MobileEditorTabsProps {
  active: MobileEditorView;
  onChange: (view: MobileEditorView) => void;
  originalLabel?: string;
  modifiedLabel?: string;
}

export function MobileEditorTabs({
  active,
  onChange,
  originalLabel = DEFAULT_ORIGINAL_LABEL,
  modifiedLabel = DEFAULT_MODIFIED_LABEL,
}: MobileEditorTabsProps) {
  const tabs: { id: MobileEditorView; label: string }[] = [
    { id: 'original', label: originalLabel },
    { id: 'modified', label: modifiedLabel },
    { id: 'diff', label: 'Diff' },
  ];

  return (
    <div
      className="flex border-b border-[var(--border)] bg-[var(--surface-2)] md:hidden"
      role="tablist"
      aria-label="Editor view"
    >
      {tabs.map((tab) => (
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

export function PaneFormatLoadingBar({ label = 'Formatting…' }: { label?: string }) {
  return (
    <div
      className="pane-format-status absolute inset-x-0 top-0 z-10 border-b border-[var(--border)] bg-[var(--surface-2)]/95"
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <div className="pane-format-bar">
        <div className="pane-format-bar-fill" />
      </div>
      <p className="px-3 py-1 text-[11px] text-[var(--text-muted)]">{label}</p>
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

interface EditablePaneLabelProps {
  value: string;
  fallback: string;
  onChange: (value: string) => void;
}

function EditablePaneLabel({
  value,
  fallback,
  onChange,
}: EditablePaneLabelProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) setDraft(value);
  }, [editing, value]);

  useEffect(() => {
    if (!editing) return;
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [editing]);

  const commit = () => {
    onChange(normalizePaneLabel(draft, fallback));
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            commit();
          }
          if (event.key === 'Escape') {
            event.preventDefault();
            setDraft(value);
            setEditing(false);
          }
        }}
        className="w-full min-w-0 bg-transparent text-center text-xs font-semibold tracking-wider text-[var(--text-primary)] outline-none"
        aria-label={`Rename ${fallback} pane`}
      />
    );
  }

  return (
    <button
      type="button"
      className="flex w-full cursor-text items-center justify-center gap-1.5 truncate text-center"
      onClick={() => setEditing(true)}
      title={`${value} — click to rename`}
      aria-label={`${value} pane — click to rename`}
    >
      <span className="truncate">{value}</span>
      <svg
        className="h-3 w-3 shrink-0 opacity-70"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="m4 20 4.25-1 10.5-10.5a2.12 2.12 0 0 0-3-3L5.25 16 4 20Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="m14.5 6.5 3 3"
          stroke="currentColor"
          strokeWidth="2"
        />
      </svg>
    </button>
  );
}

interface DesktopPaneLabelsProps {
  splitRatio?: number;
  originalLabel?: string;
  modifiedLabel?: string;
  onOriginalLabelChange?: (value: string) => void;
  onModifiedLabelChange?: (value: string) => void;
}

export function DesktopPaneLabels({
  splitRatio = 0.5,
  originalLabel = DEFAULT_ORIGINAL_LABEL,
  modifiedLabel = DEFAULT_MODIFIED_LABEL,
  onOriginalLabelChange = () => undefined,
  onModifiedLabelChange = () => undefined,
}: DesktopPaneLabelsProps) {
  const leftWidth = `calc(${splitRatio * 100}% - ${splitRatio * SPLIT_DIVIDER_WIDTH_PX}px)`;

  return (
    <div className="hidden border-b border-[var(--border)] bg-[var(--surface-2)] md:flex">
      <div
        className="shrink-0 border-r border-[var(--border)] px-4 py-2 text-center text-xs font-semibold tracking-wider text-[var(--text-muted)] md:px-6"
        style={{ width: leftWidth }}
      >
        <EditablePaneLabel
          value={originalLabel}
          fallback={DEFAULT_ORIGINAL_LABEL}
          onChange={onOriginalLabelChange}
        />
      </div>
      <div
        className="shrink-0"
        style={{ width: SPLIT_DIVIDER_WIDTH_PX }}
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1 px-4 py-2 text-center text-xs font-semibold tracking-wider text-[var(--text-muted)] md:px-6">
        <EditablePaneLabel
          value={modifiedLabel}
          fallback={DEFAULT_MODIFIED_LABEL}
          onChange={onModifiedLabelChange}
        />
      </div>
    </div>
  );
}
