export function Header() {
  return (
    <div className="flex items-center gap-2 px-4 py-3 md:px-6">
      <div
        className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent)] text-sm font-bold text-white"
        aria-hidden="true"
      >
        CC
      </div>
      <div>
        <h1 className="text-base font-semibold tracking-tight text-[var(--text-primary)] md:text-lg">
          CodeCompare
        </h1>
        <p className="hidden text-xs text-[var(--text-muted)] sm:block">
          WinMerge-style code diff
        </p>
      </div>
    </div>
  );
}
