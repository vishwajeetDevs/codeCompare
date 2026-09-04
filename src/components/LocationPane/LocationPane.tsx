import { useCallback, useMemo, useRef } from 'react';
import {
  buildLocationPaneModel,
  buildLocationPaneModelRaw,
  ratioFromPointer,
  scrollRatioFromMetrics,
  type LocationMarker,
} from '../../diff/locationPane';
import type { ChangeGroup } from '../../diff/changeGroups';
import type { LineDiffResult } from '../../diff/diffTypes';
import type { EditorScrollMetrics } from '../../types/editor';

interface LocationPaneProps {
  alignedResult: LineDiffResult;
  groups: ChangeGroup[];
  activeChangeIndex: number;
  scrollMetrics: EditorScrollMetrics | null;
  alignedMode: boolean;
  onSelectChange: (changeIndex: number) => void;
  onScrollToRatio: (ratio: number) => void;
  onClose: () => void;
}

function markerClass(marker: LocationMarker, side: 'original' | 'modified'): string {
  if (marker.kind === 'blank') return 'loc-marker-blank';

  if (marker.type === 'modified') return 'loc-marker-modified';
  if (marker.type === 'added') {
    return side === 'modified' ? 'loc-marker-added' : 'loc-marker-blank';
  }
  if (marker.type === 'removed') {
    return side === 'original' ? 'loc-marker-removed' : 'loc-marker-blank';
  }

  return 'loc-marker-blank';
}

function MarkerTrack({
  markers,
  side,
  activeChangeIndex,
  onSelectChange,
  onScrollToRatio,
}: {
  markers: LocationMarker[];
  side: 'original' | 'modified';
  activeChangeIndex: number;
  onSelectChange: (changeIndex: number) => void;
  onScrollToRatio: (ratio: number) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);

  const handleTrackClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const rect = trackRef.current?.getBoundingClientRect();
      if (!rect) return;

      const target = event.target as HTMLElement;
      if (target.closest('[data-change-index]')) return;

      onScrollToRatio(ratioFromPointer(event.clientY, rect));
    },
    [onScrollToRatio],
  );

  return (
    <div
      ref={trackRef}
      className="loc-track relative flex-1 cursor-pointer"
      onClick={handleTrackClick}
      role="presentation"
    >
      {markers.map((marker) => (
        <button
          key={`${side}-${marker.alignedLine}-${marker.type}-${marker.kind}`}
          type="button"
          data-change-index={marker.changeIndex}
          className={`loc-marker absolute left-0 right-0 border-0 p-0 ${markerClass(marker, side)}${
            marker.changeIndex === activeChangeIndex ? ' loc-marker-active' : ''
          }`}
          style={{
            top: `${marker.topPercent}%`,
            height: `${marker.heightPercent}%`,
            minHeight: '2px',
          }}
          aria-label={`${marker.type} change at line ${marker.alignedLine}`}
          onClick={(event) => {
            event.stopPropagation();
            onSelectChange(marker.changeIndex);
          }}
        />
      ))}
    </div>
  );
}

export function LocationPane({
  alignedResult,
  groups,
  activeChangeIndex,
  scrollMetrics,
  alignedMode,
  onSelectChange,
  onScrollToRatio,
  onClose,
}: LocationPaneProps) {
  const model = useMemo(
    () =>
      alignedMode
        ? buildLocationPaneModel(alignedResult, groups)
        : buildLocationPaneModelRaw(alignedResult, groups),
    [alignedResult, groups, alignedMode],
  );

  const viewport = scrollMetrics
    ? scrollRatioFromMetrics(scrollMetrics)
    : { topPercent: 0, heightPercent: 100 };

  const handleViewportPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const container = event.currentTarget.parentElement?.parentElement;
      if (!container) return;

      event.currentTarget.setPointerCapture(event.pointerId);

      const scrollFromEvent = (clientY: number) => {
        const rect = container.getBoundingClientRect();
        onScrollToRatio(ratioFromPointer(clientY, rect));
      };

      scrollFromEvent(event.clientY);

      const handleMove = (moveEvent: PointerEvent) => {
        scrollFromEvent(moveEvent.clientY);
      };

      const handleUp = () => {
        window.removeEventListener('pointermove', handleMove);
        window.removeEventListener('pointerup', handleUp);
      };

      window.addEventListener('pointermove', handleMove);
      window.addEventListener('pointerup', handleUp);
    },
    [onScrollToRatio],
  );

  if (model.totalLines <= 1 && groups.length === 0) {
    return (
      <aside className="location-pane hidden w-14 shrink-0 flex-col border-l border-[var(--border)] bg-[var(--surface-2)] md:flex">
        <div className="flex items-center justify-between gap-1 border-b border-[var(--border)] px-1.5 py-1.5">
          <span className="truncate text-[9px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            Location
          </span>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded px-0.5 text-[10px] text-[var(--text-muted)] hover:bg-[var(--surface-3)] hover:text-[var(--text-primary)]"
            aria-label="Hide location pane"
          >
            ×
          </button>
        </div>
        <div className="flex flex-1 items-center justify-center p-2 text-center text-[10px] text-[var(--text-muted)]">
          No changes
        </div>
      </aside>
    );
  }

  return (
    <aside
      className="location-pane hidden w-14 shrink-0 flex-col border-l border-[var(--border)] bg-[var(--surface-2)] md:flex"
      aria-label="Location pane"
    >
      <div className="flex items-center justify-between gap-1 border-b border-[var(--border)] px-1.5 py-1.5">
        <span className="truncate text-[9px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
          Location
        </span>
        <button
          type="button"
          onClick={onClose}
          className="cursor-pointer rounded px-0.5 text-[10px] text-[var(--text-muted)] hover:bg-[var(--surface-3)] hover:text-[var(--text-primary)]"
          aria-label="Hide location pane"
          title="Hide location pane"
        >
          ×
        </button>
      </div>

      <div className="relative min-h-0 flex-1 p-1">
        <div className="relative flex h-full gap-0.5">
          <MarkerTrack
            markers={model.original}
            side="original"
            activeChangeIndex={activeChangeIndex}
            onSelectChange={onSelectChange}
            onScrollToRatio={onScrollToRatio}
          />
          <MarkerTrack
            markers={model.modified}
            side="modified"
            activeChangeIndex={activeChangeIndex}
            onSelectChange={onSelectChange}
            onScrollToRatio={onScrollToRatio}
          />

          <div
            className="loc-viewport pointer-events-none absolute inset-0"
            aria-hidden="true"
          >
            <div
              className="loc-viewport-thumb pointer-events-auto absolute left-0 right-0 cursor-grab active:cursor-grabbing"
              style={{
                top: `${viewport.topPercent}%`,
                height: `${viewport.heightPercent}%`,
                minHeight: '12px',
              }}
              onPointerDown={handleViewportPointerDown}
            />
          </div>
        </div>
      </div>
    </aside>
  );
}
