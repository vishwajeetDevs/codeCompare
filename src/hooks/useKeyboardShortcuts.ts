import { useEffect } from 'react';

interface ShortcutHandlers {
  onCompare: () => void;
  onSwap: () => void;
  onClear: () => void;
  onShare: () => void;
  onToggleSettings: () => void;
  onPrevChange?: () => void;
  onNextChange?: () => void;
  onToggleWordWrap?: () => void;
}

export function useKeyboardShortcuts(handlers: ShortcutHandlers, enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (event: KeyboardEvent) => {
      const mod = event.ctrlKey || event.metaKey;

      if (mod && event.key === 'Enter') {
        event.preventDefault();
        handlers.onCompare();
        return;
      }

      if (mod && event.shiftKey && event.key.toLowerCase() === 's') {
        event.preventDefault();
        handlers.onSwap();
        return;
      }

      if (mod && event.shiftKey && event.key.toLowerCase() === 'c') {
        event.preventDefault();
        handlers.onClear();
        return;
      }

      if (mod && event.shiftKey && event.key.toLowerCase() === 'l') {
        event.preventDefault();
        handlers.onShare();
        return;
      }

      if (mod && event.key === ',') {
        event.preventDefault();
        handlers.onToggleSettings();
        return;
      }

      if (event.altKey && event.key === 'ArrowUp') {
        event.preventDefault();
        handlers.onPrevChange?.();
        return;
      }

      if (event.altKey && event.key === 'ArrowDown') {
        event.preventDefault();
        handlers.onNextChange?.();
        return;
      }

      if (event.altKey && !event.ctrlKey && !event.metaKey && event.key.toLowerCase() === 'z') {
        const target = event.target;
        if (target instanceof Node && (target as Element).closest?.('.monaco-editor')) {
          return;
        }
        event.preventDefault();
        handlers.onToggleWordWrap?.();
        return;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [enabled, handlers]);
}

export const KEYBOARD_SHORTCUTS = [
  { keys: 'Ctrl+Enter', action: 'Compare' },
  { keys: 'Ctrl+Shift+S', action: 'Swap' },
  { keys: 'Ctrl+Shift+C', action: 'Clear' },
  { keys: 'Ctrl+Shift+L', action: 'Share' },
  { keys: 'Ctrl+,', action: 'Settings' },
  { keys: 'Alt+↑', action: 'Previous change' },
  { keys: 'Alt+↓', action: 'Next change' },
  { keys: 'Alt+Z', action: 'Toggle word wrap' },
] as const;
