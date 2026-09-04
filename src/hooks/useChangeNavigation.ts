import { useCallback, useEffect, useMemo, useState } from 'react';
import { buildAlignedView } from '../diff/alignTexts';
import { buildChangeGroups } from '../diff/changeGroups';
import type { LineDiffResult } from '../diff/diffTypes';

export function useChangeNavigation(
  rawResult: LineDiffResult,
  compareVersion: number,
  enabled = true,
) {
  const alignedResult = useMemo(
    () => (enabled ? buildAlignedView(rawResult).result : rawResult),
    [rawResult, compareVersion, enabled],
  );

  const groups = useMemo(
    () => (enabled ? buildChangeGroups(alignedResult) : []),
    [alignedResult, enabled],
  );

  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    if (!enabled) {
      setActiveIndex(-1);
      return;
    }

    setActiveIndex((current) => {
      if (groups.length === 0) return -1;
      if (current >= 0 && current < groups.length) return current;
      return 0;
    });
  }, [groups.length, compareVersion, enabled]);

  const goNext = useCallback(() => {
    if (!enabled || groups.length === 0) return;
    setActiveIndex((current) => (current + 1) % groups.length);
  }, [enabled, groups.length]);

  const goPrev = useCallback(() => {
    if (!enabled || groups.length === 0) return;
    setActiveIndex(
      (current) => (current - 1 + groups.length) % groups.length,
    );
  }, [enabled, groups.length]);

  const activeAlignedLine =
    enabled && activeIndex >= 0
      ? groups[activeIndex]?.alignedLine ?? null
      : null;

  return {
    alignedResult,
    groups,
    activeIndex,
    activeAlignedLine,
    totalChanges: enabled ? groups.length : 0,
    goNext,
    goPrev,
    setActiveIndex,
  };
}
