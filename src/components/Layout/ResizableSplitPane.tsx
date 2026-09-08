import { useCallback, useRef, type ReactNode } from 'react';
import { clampSplitRatio } from '../../hooks/useSplitRatio';

const DIVIDER_WIDTH_PX = 4;

export interface BlockMoveControlMarker {
  groupIndex: number;
  topPx: number;
  canMoveLeft: boolean;
  canMoveRight: boolean;
  isActive: boolean;
}

interface ResizableSplitPaneProps {
  ratio: number;
  onRatioChange: (ratio: number) => void;
  left: ReactNode;
  right: ReactNode;
  className?: string;
  blockMoveControls?: BlockMoveControlMarker[];
  onMoveBlockLeft?: (groupIndex: number) => void;
  onMoveBlockRight?: (groupIndex: number) => void;
}

export function ResizableSplitPane({
  ratio,
  onRatioChange,
  left,
  right,
  className = '',
  blockMoveControls = [],
  onMoveBlockLeft,
  onMoveBlockRight,
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
      if ((event.target as HTMLElement).closest('.split-divider-move-btn')) {
        return;
      }

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
  const moveLayerLeft = `calc(${ratio * 100}% - ${ratio * DIVIDER_WIDTH_PX}px + ${DIVIDER_WIDTH_PX / 2}px)`;

  return (
    <div
      ref={containerRef}
      className={`relative flex h-full min-h-0 w-full ${className}`}
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

      {blockMoveControls.length > 0 && (
        <div
          className="split-divider-move-layer"
          style={{ left: moveLayerLeft }}
          aria-hidden={false}
        >
          {blockMoveControls.map((control) => (
            <div
              key={control.groupIndex}
              className={`split-divider-move-controls${
                control.isActive ? ' is-active' : ''
              }`}
              aria-label={`Move change ${control.groupIndex + 1}`}
              style={{ top: `${control.topPx}px` }}
            >
              <button
                type="button"
                className="split-divider-move-btn"
                disabled={!control.canMoveLeft}
                aria-label="Move block to left"
                title="Move block to left"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onMoveBlockLeft?.(control.groupIndex);
                }}
              >
                ←
              </button>
              <button
                type="button"
                className="split-divider-move-btn"
                disabled={!control.canMoveRight}
                aria-label="Move block to right"
                title="Move block to right"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onMoveBlockRight?.(control.groupIndex);
                }}
              >
                →
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export { DIVIDER_WIDTH_PX as SPLIT_DIVIDER_WIDTH_PX };
