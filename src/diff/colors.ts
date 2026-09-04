export const DIFF_COLORS = {
  added: {
    bg: 'rgba(74, 222, 128, 0.48)',
    marker: '#22c55e',
    overview: '#16a34a',
    connector: '#16a34a',
  },
  removed: {
    bg: 'rgba(255, 120, 120, 0.5)',
    marker: '#ff5555',
    overview: '#ef4444',
    connector: '#ef4444',
  },
  modified: {
    bg: 'rgba(255, 230, 100, 0.72)',
    marker: '#f59e0b',
    overview: '#eab308',
    connector: '#eab308',
  },
  unchanged: {
    marker: '#858585',
    overview: '#85858533',
  },
} as const;
