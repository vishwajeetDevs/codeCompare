import { useCallback, useRef, type ReactNode } from 'react';
import { clampSplitRatio } from '../../hooks/useSplitRatio';

const DIVIDER_WIDTH_PX = 4;

interface ResizableSplitPaneProps {
  ratio: number;
  onRatioChange: (ratio: number) => void;
  left: ReactNode;
  right: ReactNode;
  className?: string;
}

export function ResizableSplitPane({
  ratio,
  onRatioChange,
  left,
  right,
  className = '',
}: ResizableSplitPaneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  const updateRatioFromPointer = useCallback(
    (clientX: number) => {
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const usableWidth = rect.width - DIVIDER_WIDTH_PX;
      if (usableWidth <= 0) return;

      const offset = clientX - rect.left;
      const next = clampSplitRatio(offset / usableWidth);
      onRatioChange(next);
    },
    [onRatioChange],
  );

  const stopDragging = useCallback(() => {
    draggingRef.current = false;
    document.body.style.removeProperty('cursor');
    document.body.style.removeProperty('user-select');
  }, []);

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      draggingRef.current = true;
      event.currentTarget.setPointerCapture(event.pointerId);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      updateRatioFromPointer(event.clientX);
    },
    [updateRatioFromPointer],
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!draggingRef.current) return;
      updateRatioFromPointer(event.clientX);
    },
    [updateRatioFromPointer],
  );

  const handlePointerUp = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!draggingRef.current) return;
      event.currentTarget.releasePointerCapture(event.pointerId);
      stopDragging();
    },
    [stopDragging],
  );

  const leftWidth = `calc(${ratio * 100}% - ${ratio * DIVIDER_WIDTH_PX}px)`;

  return (
    <div
      ref={containerRef}
      className={`flex h-full min-h-0 w-full ${className}`}
    >
      <div
        className="min-h-0 min-w-0"
        style={{ width: leftWidth }}
      >
        {left}
      </div>

      <div
        role="separator"
        aria-orientation="vertical"
        aria-valuemin={20}
        aria-valuemax={80}
        aria-valuenow={Math.round(ratio * 100)}
        aria-label="Resize panes"
        className="split-divider shrink-0"
        style={{ width: DIVIDER_WIDTH_PX }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onLostPointerCapture={stopDragging}
      />

      <div className="min-h-0 min-w-0 flex-1">{right}</div>
    </div>
  );
}

export { DIVIDER_WIDTH_PX as SPLIT_DIVIDER_WIDTH_PX };
