import { DIFF_COLORS } from '../../diff/colors';
import type { ComparisonStats } from '../../diff/diffTypes';

export function StatsBar({ stats }: { stats: ComparisonStats }) {
  const totalChanges = stats.added + stats.removed + stats.modified;
  const items = [
    { key: 'added' as const, label: 'Added', color: DIFF_COLORS.added.marker },
    { key: 'removed' as const, label: 'Removed', color: DIFF_COLORS.removed.marker },
    { key: 'modified' as const, label: 'Modified', color: DIFF_COLORS.modified.marker },
    { key: 'unchanged' as const, label: 'Unchanged', color: DIFF_COLORS.unchanged.marker },
  ];

  return (
    <section
      className="hidden border-b border-[var(--border)] bg-[var(--surface-2)] px-4 py-2 md:block md:px-6"
      aria-label="Comparison statistics"
    >
      <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
        Comparison Result
        {totalChanges === 0 && (
          <span className="ml-2 font-normal normal-case">— no differences</span>
        )}
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
        {items.map((item) => (
          <span key={item.key} className="flex items-center gap-2 text-[var(--text-secondary)]">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="tabular-nums font-medium">{stats[item.key]}</span>
            <span className="text-[var(--text-muted)]">{item.label}</span>
          </span>
        ))}
      </div>
    </section>
  );
}

export function DiffLegend() {
  const items = [
    { label: 'Added', color: DIFF_COLORS.added.marker },
    { label: 'Removed', color: DIFF_COLORS.removed.marker },
    { label: 'Modified', color: DIFF_COLORS.modified.marker },
    { label: 'Unchanged', color: DIFF_COLORS.unchanged.marker },
  ];

  return (
    <div className="hidden flex-wrap items-center gap-4 border-b border-[var(--border)] bg-[var(--surface-1)] px-4 py-1.5 text-xs md:flex md:px-6">
      {items.map((item) => (
        <span key={item.label} className="flex items-center gap-1.5 text-[var(--text-muted)]">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: item.color }}
          />
          {item.label}
        </span>
      ))}
    </div>
  );
}
