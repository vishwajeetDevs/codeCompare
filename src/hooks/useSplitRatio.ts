import { useCallback, useState } from 'react';

const STORAGE_KEY = 'codecompare-split-ratio';
const DEFAULT_RATIO = 0.5;
const MIN_RATIO = 0.2;
const MAX_RATIO = 0.8;

function clampRatio(value: number): number {
  return Math.min(MAX_RATIO, Math.max(MIN_RATIO, value));
}

function readStoredRatio(): number {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return DEFAULT_RATIO;
    const parsed = Number.parseFloat(stored);
    if (Number.isNaN(parsed)) return DEFAULT_RATIO;
    return clampRatio(parsed);
  } catch {
    return DEFAULT_RATIO;
  }
}

export function useSplitRatio() {
  const [splitRatio, setSplitRatioState] = useState(readStoredRatio);

  const setSplitRatio = useCallback((ratio: number) => {
    const next = clampRatio(ratio);
    setSplitRatioState(next);
    try {
      localStorage.setItem(STORAGE_KEY, String(next));
    } catch {
      // ignore storage failures
    }
  }, []);

  return { splitRatio, setSplitRatio, minSplitRatio: MIN_RATIO, maxSplitRatio: MAX_RATIO };
}

export { clampRatio as clampSplitRatio };
