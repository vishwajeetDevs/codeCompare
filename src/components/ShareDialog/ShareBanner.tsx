interface ShareBannerProps {
  displayId?: string;
  onStartNew: () => void;
  onDismiss: () => void;
}

export function ShareBanner({
  displayId,
  onStartNew,
  onDismiss,
}: ShareBannerProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-1.5 border-b border-[var(--accent)] bg-[var(--accent-muted)] px-4 py-1 text-xs md:px-6">
      <div className="leading-tight text-[var(--text-primary)]">
        <span className="font-medium">Shared comparison</span>
        {displayId && (
          <span className="ml-2 font-mono">{displayId}</span>
        )}
      </div>
      <div className="flex items-center gap-1.5">
        <button type="button" className="btn-secondary !py-0.5 !text-xs" onClick={onStartNew}>
          New comparison
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface-1)] text-xs text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-3)] hover:text-[var(--text-primary)]"
          aria-label="Dismiss shared comparison banner"
          title="Dismiss"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
