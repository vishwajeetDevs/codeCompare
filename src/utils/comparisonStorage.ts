const STORAGE_KEY = 'codecompare-draft';

export interface ComparisonDraft {
  original: string;
  modified: string;
}

export function loadComparisonDraft(): ComparisonDraft {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { original: '', modified: '' };

    const data = JSON.parse(raw) as Partial<ComparisonDraft>;
    if (typeof data.original !== 'string' || typeof data.modified !== 'string') {
      return { original: '', modified: '' };
    }

    return { original: data.original, modified: data.modified };
  } catch {
    return { original: '', modified: '' };
  }
}

export function saveComparisonDraft(original: string, modified: string): void {
  try {
    if (!original && !modified) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ original, modified } satisfies ComparisonDraft),
    );
  } catch {
    // ignore quota / private mode errors
  }
}

export function clearComparisonDraft(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
