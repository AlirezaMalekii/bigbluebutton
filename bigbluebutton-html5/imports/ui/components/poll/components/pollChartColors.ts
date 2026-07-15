export const POLL_CHART_COLORS = [
  'var(--skyroom-brand-400, #14A99E)',
  '#0C57A7',
  '#6366F1',
  '#F59E0B',
  '#EC4899',
  '#8B5CF6',
  '#10B981',
  '#EF4444',
  '#06B6D4',
  '#A855F7',
] as const;

export function getPollChartColor(index: number): string {
  return POLL_CHART_COLORS[index % POLL_CHART_COLORS.length];
}
