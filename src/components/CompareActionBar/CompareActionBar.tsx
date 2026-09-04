interface CompareActionBarProps {
  visible: boolean;
  mode: 'compare' | 'refresh';
  disabled: boolean;
  loading: boolean;
  onAction: () => void;
}

function CompareIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M20 12a8 8 0 1 1-2.34-5.66M20 4v5h-5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CompareActionBar({
  visible,
  mode,
  disabled,
  loading,
  onAction,
}: CompareActionBarProps) {
  const label = mode === 'refresh' ? 'Refresh Compare' : 'Compare';
  const hint =
    mode === 'refresh'
      ? 'Re-run comparison with latest edits'
      : 'Compare original and modified panes';

  return (
    <div
      className={`compare-action-bar pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-center px-4 pb-10 md:pb-12${
        visible ? ' compare-action-bar--visible' : ''
      }`}
      aria-hidden={!visible}
    >
      <button
        type="button"
        onClick={onAction}
        disabled={disabled || loading}
        title={hint}
        aria-label={label}
        className={`compare-action-bar__btn pointer-events-auto flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold disabled:cursor-not-allowed${
          mode === 'refresh' ? ' compare-action-bar__btn--refresh' : ''
        }`}
      >
        {loading ? (
          <span
            className="compare-action-bar__spinner inline-block h-[18px] w-[18px] animate-spin rounded-full border-2 border-white/40 border-t-white"
            aria-hidden="true"
          />
        ) : mode === 'refresh' ? (
          <RefreshIcon />
        ) : (
          <CompareIcon />
        )}
        <span className="compare-action-bar__label">{label}</span>
      </button>
    </div>
  );
}
