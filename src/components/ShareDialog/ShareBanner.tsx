interface ShareBannerProps {
  displayId?: string;
  localOnly?: boolean;
  hosted?: boolean;
  onStartNew: () => void;
  onDismiss: () => void;
}

export function ShareBanner({
  displayId,
  onStartNew,
  onDismiss,
}: ShareBannerProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--accent)] bg-[var(--accent-muted)] px-4 py-2 text-sm md:px-6">
      <div className="text-[var(--text-primary)]">
        <span className="font-medium">Shared comparison</span>
        {displayId && (
          <span className="ml-2 font-mono text-xs">{displayId}</span>
        )}
        <span className="ml-2 text-xs text-[var(--text-muted)]">
          (database share link)
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button type="button" className="btn-secondary text-xs" onClick={onStartNew}>
          New comparison
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface-1)] text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-3)] hover:text-[var(--text-primary)]"
          aria-label="Dismiss shared comparison banner"
          title="Dismiss"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
