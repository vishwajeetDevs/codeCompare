import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'codecompare-shortcut-buttons-visible';

function readStoredVisibility(): boolean {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'false') return false;
    if (stored === 'true') return true;
  } catch {
    /* ignore */
  }
  return true;
}

export function useShortcutButtonsVisibility() {
  const [visible, setVisible] = useState(readStoredVisibility);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(visible));
    } catch {
      /* ignore */
    }
  }, [visible]);

  const show = useCallback(() => setVisible(true), []);
  const hide = useCallback(() => setVisible(false), []);

  return { visible, setVisible, show, hide };
}
