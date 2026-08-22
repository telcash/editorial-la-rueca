import type { ContactRequestAnalyticsComparison } from '@/services/contact-request-analytics/contact-request-analytics.types';
import { formatAnalyticsNumber, formatAnalyticsPercent } from './contact-request-analytics-format';

function formatChange(value: number | null): string {
  if (value === null) {
    return '—';
  }

  return `${value > 0 ? '+' : ''}${formatAnalyticsPercent(value)}`;
}

export function ContactRequestPeriodComparison({
  comparison,
}: {
  comparison: ContactRequestAnalyticsComparison;
}) {
  if (!comparison.total || !comparison.won) {
    return (
      <section className="rounded-lg border border-border bg-card p-4">
        <h2 className="text-lg font-semibold text-foreground">Comparación con período anterior</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Disponible para últimos 30 días y últimos 90 días.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <h2 className="text-lg font-semibold text-foreground">Comparación con período anterior</h2>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-md bg-muted/40 px-4 py-3">
          <p className="text-sm text-muted-foreground">Solicitudes</p>
          <p className="mt-1 text-xl font-semibold text-foreground">
            {formatChange(comparison.total.changeRate)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatAnalyticsNumber(comparison.total.current)} ahora ·{' '}
            {formatAnalyticsNumber(comparison.total.previous ?? 0)} antes
          </p>
        </div>
        <div className="rounded-md bg-muted/40 px-4 py-3">
          <p className="text-sm text-muted-foreground">Ganadas</p>
          <p className="mt-1 text-xl font-semibold text-foreground">
            {formatChange(comparison.won.changeRate)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatAnalyticsNumber(comparison.won.current)} ahora ·{' '}
            {formatAnalyticsNumber(comparison.won.previous ?? 0)} antes
          </p>
        </div>
      </div>
    </section>
  );
}
