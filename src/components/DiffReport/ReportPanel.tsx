import { useState } from 'react';
import type { ComparisonReportData } from '../../diff/report';
import { downloadTextFile } from '../../utils/download';
import { useToast } from '../../hooks/useToast';

interface ReportPanelProps {
  report: ComparisonReportData;
  reportText: string;
  reportCsv: string;
}

export function ReportPanel({ report, reportText, reportCsv }: ReportPanelProps) {
  const [open, setOpen] = useState(false);
  const { showToast } = useToast();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(reportText);
      showToast('Report copied to clipboard', 'success');
    } catch {
      showToast('Could not copy report', 'error');
    }
  };

  const handleDownloadCsv = () => {
    downloadTextFile('comparison-report.csv', reportCsv);
    showToast('CSV download started', 'success');
  };

  return (
    <section className="hidden border-b border-[var(--border)] bg-[var(--surface-1)] md:block">
      <button
        type="button"
        className="flex w-full items-center justify-between px-4 py-2 text-left text-sm font-medium text-[var(--text-secondary)] md:px-6"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        Comparison Report
        <span className="text-[var(--text-muted)]">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="grid gap-4 border-t border-[var(--border)] px-4 py-3 md:grid-cols-[14rem_1fr_auto] md:px-6">
          <div className="space-y-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3 text-sm">
            <Row label="Total lines" value={report.totalLines} />
            <Row label="Added" value={report.added} />
            <Row label="Removed" value={report.removed} />
            <Row label="Modified" value={report.modified} />
            <Row label="Unchanged" value={report.unchanged} />
          </div>

          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase text-[var(--text-muted)]">
              Most changes
            </h3>
            {report.mostChangedLines.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)]">No line changes.</p>
            ) : (
              <ul className="flex flex-wrap gap-2">
                {report.mostChangedLines.map((item) => (
                  <li
                    key={`${item.type}-${item.line}`}
                    className="rounded border border-[var(--border)] px-2 py-1 text-sm tabular-nums"
                  >
                    Line {item.line}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <button type="button" className="btn-secondary" onClick={handleCopy}>
              Copy Report
            </button>
            <button type="button" className="btn-secondary" onClick={handleDownloadCsv}>
              Download CSV
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-[var(--text-muted)]">{label}</span>
      <span className="tabular-nums font-medium">{value}</span>
    </div>
  );
}
