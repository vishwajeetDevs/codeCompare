import { useEffect, useState } from 'react';
import { KEYBOARD_SHORTCUTS } from '../../hooks/useKeyboardShortcuts';
import type { DownloadKind } from '../../types';
import type { EditorSettings } from '../../types/editor';

interface SettingsPanelProps {
  open: boolean;
  settings: EditorSettings;
  onClose: () => void;
  onSettingsChange: (partial: Partial<EditorSettings>) => void;
  onShare: () => void;
  onSwap: () => void;
  onFormat: () => void;
  onDownload: (kind: DownloadKind) => void;
}

export function SettingsPanel({
  open,
  settings,
  onClose,
  onSettingsChange,
  onShare,
  onSwap,
  onFormat,
  onDownload,
}: SettingsPanelProps) {
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(open);

  useEffect(() => {
    if (open) {
      setMounted(true);
      const frame = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(frame);
    }

    setVisible(false);
    return undefined;
  }, [open]);

  if (!mounted) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex justify-end ${
        visible ? 'pointer-events-auto' : 'pointer-events-none'
      }`}
      role="dialog"
      aria-modal="true"
      aria-label="Settings"
      aria-hidden={!visible}
    >
      <div
        className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ease-out ${
          visible ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
      />
      <aside
        className={`relative h-full w-full max-w-sm overflow-y-auto border-l border-[var(--border)] bg-[var(--surface-2)] p-4 shadow-2xl transition-transform duration-300 ease-out ${
          visible ? 'translate-x-0' : 'translate-x-full'
        }`}
        onClick={(event) => event.stopPropagation()}
        onTransitionEnd={(event) => {
          if (event.propertyName === 'transform' && !visible) {
            setMounted(false);
          }
        }}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            Settings
          </h2>
          <button
            type="button"
            className="cursor-pointer rounded p-1 text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-3)] hover:text-[var(--text-primary)]"
            onClick={onClose}
            aria-label="Close settings"
          >
            ✕
          </button>
        </div>

        <div className="space-y-6 text-sm">
          <section className="space-y-3">
            <h3 className="font-medium text-[var(--text-primary)]">Editor</h3>
            <label className="flex items-center justify-between gap-4">
              <span className="text-[var(--text-muted)]">Tab size</span>
              <select
                value={settings.tabSize}
                onChange={(e) =>
                  onSettingsChange({ tabSize: Number(e.target.value) })
                }
                className="rounded border border-[var(--border)] bg-[var(--surface-1)] px-2 py-1"
              >
                {[2, 4, 8].map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.insertSpaces}
                onChange={(e) =>
                  onSettingsChange({ insertSpaces: e.target.checked })
                }
              />
              Use spaces for indent
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.wordWrap === 'on'}
                onChange={(e) =>
                  onSettingsChange({
                    wordWrap: e.target.checked ? 'on' : 'off',
                  })
                }
              />
              Word wrap
            </label>
          </section>

          <section className="space-y-2">
            <h3 className="font-medium text-[var(--text-primary)]">Share</h3>
            <button
              type="button"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 text-left transition-colors hover:bg-[var(--surface-3)]"
              onClick={onShare}
            >
              Copy share link
            </button>
          </section>

          <section className="space-y-2">
            <h3 className="font-medium text-[var(--text-primary)]">Download</h3>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" className="btn-secondary" onClick={() => onDownload('original')}>
                Original
              </button>
              <button type="button" className="btn-secondary" onClick={() => onDownload('modified')}>
                Modified
              </button>
              <button type="button" className="btn-secondary" onClick={() => onDownload('diff')}>
                Diff
              </button>
              <button type="button" className="btn-secondary" onClick={() => onDownload('report')}>
                Report
              </button>
            </div>
          </section>

          <section className="space-y-2">
            <h3 className="font-medium text-[var(--text-primary)]">Actions</h3>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" className="rounded-lg border border-[var(--border)] px-3 py-2" onClick={onSwap}>
                Swap
              </button>
              <button type="button" className="rounded-lg border border-[var(--border)] px-3 py-2" onClick={onFormat}>
                Format
              </button>
            </div>
          </section>

          <section className="space-y-2">
            <h3 className="font-medium text-[var(--text-primary)]">Keyboard shortcuts</h3>
            <ul className="space-y-1 text-[var(--text-muted)]">
              {KEYBOARD_SHORTCUTS.map((item) => (
                <li key={item.keys} className="flex justify-between gap-4">
                  <span>{item.action}</span>
                  <kbd className="font-mono text-xs text-[var(--text-secondary)]">
                    {item.keys}
                  </kbd>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </aside>
    </div>
  );
}
