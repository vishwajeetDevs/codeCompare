export interface ChangeNavControlsProps {
  changeIndex: number;
  totalChanges: number;
  onPrevChange: () => void;
  onNextChange: () => void;
  onCloseFind?: () => void;
}

const btnClass =
  'flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface-1)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-3)] disabled:cursor-not-allowed disabled:opacity-40';

export function ChangeNavControls({
  changeIndex,
  totalChanges,
  onPrevChange,
  onNextChange,
}: ChangeNavControlsProps) {
  const label =
    totalChanges === 0
      ? 'No changes'
      : `Change ${changeIndex + 1} of ${totalChanges}`;

  return (
    <>
      <button
        type="button"
        onClick={onPrevChange}
        className={btnClass}
        disabled={totalChanges === 0}
        aria-label="Previous change"
        title="Previous change"
      >
        ↑
      </button>
      <span
        className="min-w-[8.5rem] rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-3 py-1.5 text-center text-sm tabular-nums text-[var(--text-secondary)]"
        aria-live="polite"
      >
        {label}
      </span>
      <button
        type="button"
        onClick={onNextChange}
        className={btnClass}
        disabled={totalChanges === 0}
        aria-label="Next change"
        title="Next change"
      >
        ↓
      </button>
    </>
  );
}

export function MobileChangeNav({
  onCloseFind,
  onPrevChange,
  onNextChange,
  ...props
}: ChangeNavControlsProps) {
  const handlePrev = () => {
    onCloseFind?.();
    onPrevChange();
  };
  const handleNext = () => {
    onCloseFind?.();
    onNextChange();
  };

  return (
    <div className="flex items-center justify-center gap-1.5 border-b border-[var(--border)] bg-[var(--surface-2)] px-4 py-2 md:hidden">
      <ChangeNavControls
        {...props}
        onPrevChange={handlePrev}
        onNextChange={handleNext}
      />
    </div>
  );
}
