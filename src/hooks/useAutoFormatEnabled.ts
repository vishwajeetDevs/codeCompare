import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'codecompare-auto-detect-format-enabled';

function readStoredEnabled(): boolean {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === null ? false : stored === 'true';
  } catch {
    return false;
  }
}

export function useAutoFormatEnabled() {
  const [enabled, setEnabledState] = useState(readStoredEnabled);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(enabled));
    } catch {
      /* Ignore unavailable storage. */
    }
  }, [enabled]);

  const setEnabled = useCallback((value: boolean) => {
    setEnabledState(value);
  }, []);

  return { enabled, setEnabled };
}
