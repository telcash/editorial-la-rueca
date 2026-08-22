export function formatAnalyticsPercent(value: number | null): string {
  if (value === null) {
    return '—';
  }

  return `${new Intl.NumberFormat('es-ES', {
    maximumFractionDigits: 1,
    minimumFractionDigits: Number.isInteger(value) ? 0 : 1,
  }).format(value)} %`;
}

export function formatAnalyticsNumber(value: number): string {
  return new Intl.NumberFormat('es-ES').format(value);
}
