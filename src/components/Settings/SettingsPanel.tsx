import { useEffect, useState } from 'react';

interface SettingsPanelProps {
  open: boolean;
  wordWrap: boolean;
  locationPaneVisible: boolean;
  shortcutButtonsVisible: boolean;
  multipleTabsEnabled: boolean;
  onClose: () => void;
  onSwap: () => void;
  onWordWrapChange: (enabled: boolean) => void;
  onLocationPaneVisibleChange: (visible: boolean) => void;
  onShortcutButtonsVisibleChange: (visible: boolean) => void;
  onMultipleTabsEnabledChange: (enabled: boolean) => void;
}

export function SettingsPanel({
  open,
  wordWrap,
  locationPaneVisible,
  shortcutButtonsVisible,
  multipleTabsEnabled,
  onClose,
  onSwap,
  onWordWrapChange,
  onLocationPaneVisibleChange,
  onShortcutButtonsVisibleChange,
  onMultipleTabsEnabledChange,
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

        <div className="space-y-5 text-sm">
          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              This comparison
            </h3>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={wordWrap}
                onChange={(event) => onWordWrapChange(event.target.checked)}
              />
              Word wrap (Alt+Z)
            </label>
            <button
              type="button"
              className="btn-secondary flex w-full items-center justify-between !py-2"
              onClick={onSwap}
            >
              <span>Swap panes</span>
              <span className="text-xs font-normal text-[var(--text-muted)]">
                Ctrl+Shift+S
              </span>
            </button>
          </section>

          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              Application
            </h3>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={locationPaneVisible}
                onChange={(event) =>
                  onLocationPaneVisibleChange(event.target.checked)
                }
              />
              Location pane visibility
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={shortcutButtonsVisible}
                onChange={(event) =>
                  onShortcutButtonsVisibleChange(event.target.checked)
                }
              />
              Shortcut buttons
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={multipleTabsEnabled}
                onChange={(event) =>
                  onMultipleTabsEnabledChange(event.target.checked)
                }
              />
              Enable multiple tabs
            </label>
          </section>
        </div>
      </aside>
    </div>
  );
}
