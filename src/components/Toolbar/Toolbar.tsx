import { useCallback, useState } from 'react';
import { MONACO_LANGUAGES, type EditorSettings } from '../../types/editor';
import type { ThemeMode } from '../../types';
import type { ShareLinkResult } from '../../types/share';
import { ShareIcon, SharePopover } from '../ShareDialog/SharePopover';
import { ChangeNavControls } from './ChangeNavBar';
import { SPLIT_DIVIDER_WIDTH_PX } from '../Layout/ResizableSplitPane';

interface ToolbarProps {
  settings: EditorSettings;
  theme: ThemeMode;
  splitRatio: number;
  changeIndex: number;
  totalChanges: number;
  onSettingsChange: (partial: Partial<EditorSettings>) => void;
  onToggleTheme: () => void;
  onOpenSettings: () => void;
  onClear: () => void;
  onPrevChange: () => void;
  onNextChange: () => void;
  onCloseFind?: () => void;
  showShortcutButtons?: boolean;
  onGetShareLink: () => Promise<ShareLinkResult>;
  onCopyShareLink: (link?: ShareLinkResult) => Promise<boolean>;
}

const iconBtnClass =
  'flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface-1)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-3)] disabled:cursor-not-allowed disabled:opacity-40';

const iconBtnActiveClass =
  'border-[var(--accent)] bg-[var(--accent-muted)] text-[var(--accent)]';

const selectClass =
  'cursor-pointer rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-2 py-1.5 text-sm text-[var(--text-secondary)] outline-none focus:border-[var(--accent)]';

function SunIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" />
      <path
        d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M21 14.5A8.5 8.5 0 0 1 9.5 3 7 7 0 1 0 21 14.5Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.604.852.997 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M10 11v6M14 11v6M6 7l1 12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Toolbar({
  settings,
  theme,
  splitRatio,
  changeIndex,
  totalChanges,
  onSettingsChange,
  onToggleTheme,
  onOpenSettings,
  onClear,
  onPrevChange,
  onNextChange,
  onCloseFind,
  showShortcutButtons = true,
  onGetShareLink,
  onCopyShareLink,
}: ToolbarProps) {
  const [shareOpen, setShareOpen] = useState(false);
  const [shareLink, setShareLink] = useState<ShareLinkResult | null>(null);
  const [shareLoading, setShareLoading] = useState(false);

  const themeLabel =
    theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode';

  const handleShareClick = useCallback(async () => {
    setShareOpen(true);
    setShareLoading(true);
    setShareLink(null);

    try {
      const link = await onGetShareLink();
      setShareLink(link);
      await onCopyShareLink(link);
    } finally {
      setShareLoading(false);
    }
  }, [onGetShareLink, onCopyShareLink]);

  const closeShare = useCallback(() => setShareOpen(false), []);

  const dividerCenter = `calc(${splitRatio * 100}% - ${splitRatio * SPLIT_DIVIDER_WIDTH_PX}px + ${SPLIT_DIVIDER_WIDTH_PX / 2}px)`;

  const handlePrevChange = useCallback(() => {
    onCloseFind?.();
    onPrevChange();
  }, [onCloseFind, onPrevChange]);

  const handleNextChange = useCallback(() => {
    onCloseFind?.();
    onNextChange();
  }, [onCloseFind, onNextChange]);

  return (
    <header className="relative flex shrink-0 items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--surface-2)] px-4 py-2 md:px-6">
      <div className="relative z-10 flex min-w-0 items-center gap-2">
        <h1 className="truncate text-base font-semibold tracking-tight text-[var(--text-primary)] md:text-lg">
          CodeCompare
        </h1>
      </div>

      {showShortcutButtons && (
        <div
          className="pointer-events-none absolute top-1/2 hidden -translate-x-1/2 -translate-y-1/2 md:flex md:items-center md:gap-1.5"
          style={{ left: dividerCenter }}
        >
          <div className="pointer-events-auto flex items-center gap-1.5">
            <ChangeNavControls
              changeIndex={changeIndex}
              totalChanges={totalChanges}
              onPrevChange={handlePrevChange}
              onNextChange={handleNextChange}
            />
          </div>
        </div>
      )}

      <div className="relative z-10 ml-auto flex flex-wrap items-center justify-end gap-2">
        <select
          value={settings.language}
          onChange={(event) =>
            onSettingsChange({
              language: event.target.value as EditorSettings['language'],
            })
          }
          className={selectClass}
          aria-label="Language"
        >
          <option value="auto">Auto Detect</option>
          {MONACO_LANGUAGES.map((language) => (
            <option key={language.id} value={language.id}>
              {language.label}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={onToggleTheme}
          className={iconBtnClass}
          aria-label={themeLabel}
          title={themeLabel}
        >
          {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
        </button>

        <div className="relative">
          <button
            type="button"
            onClick={() => void handleShareClick()}
            className={`${iconBtnClass}${shareOpen ? ` ${iconBtnActiveClass}` : ''}`}
            aria-label="Share comparison"
            title="Share comparison"
            aria-expanded={shareOpen}
          >
            <ShareIcon />
          </button>
          <SharePopover
            open={shareOpen}
            shareLink={shareLink}
            loading={shareLoading}
            onClose={closeShare}
            onCopy={onCopyShareLink}
          />
        </div>

        <button
          type="button"
          onClick={onOpenSettings}
          className={iconBtnClass}
          aria-label="Settings"
          title="Settings"
        >
          <SettingsIcon />
        </button>

        <button
          type="button"
          onClick={onClear}
          className={iconBtnClass}
          aria-label="Clear panes"
          title="Clear panes"
        >
          <TrashIcon />
        </button>
      </div>
    </header>
  );
}
