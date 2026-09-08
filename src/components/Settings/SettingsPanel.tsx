import { useEffect, useState } from 'react';

interface SettingsPanelProps {
  open: boolean;
  wordWrap: boolean;
  locationPaneVisible: boolean;
  shortcutButtonsVisible: boolean;
  onClose: () => void;
  onWordWrapChange: (enabled: boolean) => void;
  onLocationPaneVisibleChange: (visible: boolean) => void;
  onShortcutButtonsVisibleChange: (visible: boolean) => void;
}

export function SettingsPanel({
  open,
  wordWrap,
  locationPaneVisible,
  shortcutButtonsVisible,
  onClose,
  onWordWrapChange,
  onLocationPaneVisibleChange,
  onShortcutButtonsVisibleChange,
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

        <div className="space-y-3 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={wordWrap}
              onChange={(event) => onWordWrapChange(event.target.checked)}
            />
            Word wrap (Alt+Z)
          </label>

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
        </div>
      </aside>
    </div>
  );
}
