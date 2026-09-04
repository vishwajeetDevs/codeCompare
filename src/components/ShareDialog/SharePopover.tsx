import { useCallback, useEffect, useRef, useState } from 'react';
import type { ShareLinkResult } from '../../types/share';
import { formatShareUrlForDisplay } from '../../utils/share/shareLink';

interface SharePopoverProps {
  open: boolean;
  shareLink: ShareLinkResult | null;
  loading?: boolean;
  onClose: () => void;
  onCopy: (link?: ShareLinkResult) => Promise<boolean>;
}

function LinkIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M10 13a5 5 0 0 0 7.54.54l2.92-2.92a5 5 0 0 0-7.07-7.07l-1.54 1.55M14 11a5 5 0 0 0-7.54-.54L3.54 13.4a5 5 0 0 0 7.07 7.07l1.55-1.55"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="9" y="9" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="2" />
      <path
        d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}

export function SharePopover({
  open,
  shareLink,
  loading = false,
  onClose,
  onCopy,
}: SharePopoverProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) {
      setCopied(false);
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (panelRef.current?.contains(event.target as Node)) return;
      onClose();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  const handleCopy = useCallback(async () => {
    if (!shareLink) return;
    const ok = await onCopy(shareLink);
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }
  }, [onCopy, shareLink]);

  if (!open) return null;

  return (
    <div
      ref={panelRef}
      className="share-popover absolute right-0 top-[calc(100%+10px)] z-50 w-[min(100vw-2rem,22rem)]"
      role="dialog"
      aria-label="Share comparison"
    >
      <div className="share-popover-arrow" aria-hidden="true" />
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4 shadow-xl">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 text-[var(--text-primary)]">
            <span className="text-[var(--accent)]">
              <LinkIcon />
            </span>
            <h2 className="text-base font-semibold">Share comparison</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded p-1 text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-3)] hover:text-[var(--text-primary)]"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <p className="mb-3 text-sm leading-relaxed text-[var(--text-muted)]">
          {loading ? (
            'Creating a share link…'
          ) : (
            <>
              Anyone with this link can open both panes and review the differences.
              {shareLink?.hosted && (
                <span className="mt-1 block text-xs">
                  Short link — comparison stored for 90 days.
                </span>
              )}
              {shareLink?.localOnly && (
                <span className="mt-1 block text-xs">
                  Large comparison — full link is copied; it includes data in the URL
                  hash.
                </span>
              )}
            </>
          )}
        </p>

        <div
          className="mb-4 rounded-lg border border-[var(--border)] bg-[var(--accent-muted)] px-3 py-2.5"
          title={shareLink?.url}
        >
          <p className="truncate font-mono text-xs text-[var(--text-secondary)]">
            {loading
              ? '…'
              : shareLink
                ? formatShareUrlForDisplay(shareLink)
                : 'Could not create link'}
          </p>
        </div>

        <button
          type="button"
          onClick={() => void handleCopy()}
          disabled={loading || !shareLink}
          className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <CopyIcon />
          {copied ? 'Copied!' : 'Copy link'}
        </button>
      </div>
    </div>
  );
}

export function ShareIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="18" cy="5" r="3" stroke="currentColor" strokeWidth="2" />
      <circle cx="6" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
      <circle cx="18" cy="19" r="3" stroke="currentColor" strokeWidth="2" />
      <path
        d="M8.59 13.51 15.42 17.49M15.41 6.51 8.59 10.49"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
