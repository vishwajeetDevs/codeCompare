import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'codecompare-multiple-tabs-enabled';

function readStoredEnabled(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function useMultipleTabsEnabled() {
  const [enabled, setEnabledState] = useState(readStoredEnabled);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(enabled));
    } catch {
      /* ignore */
    }
  }, [enabled]);

  const setEnabled = useCallback((value: boolean) => {
    setEnabledState(value);
  }, []);

  return { enabled, setEnabled };
}
