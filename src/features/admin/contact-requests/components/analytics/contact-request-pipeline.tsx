import type { ContactRequestAnalyticsData } from '@/services/contact-request-analytics/contact-request-analytics.types';
import { formatAnalyticsNumber, formatAnalyticsPercent } from './contact-request-analytics-format';

export function ContactRequestPipeline({ analytics }: { analytics: ContactRequestAnalyticsData }) {
  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Estado de las solicitudes</h2>
        <p className="text-sm text-muted-foreground">Distribución del pipeline en el período.</p>
      </div>

      <div className="mt-5 space-y-3">
        {analytics.pipeline.map((item) => (
          <div
            key={item.status}
            className="grid gap-2 sm:grid-cols-[8rem_1fr_7rem] sm:items-center"
          >
            <div className="text-sm font-medium text-foreground">{item.label}</div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${item.percentage}%` }}
                aria-hidden="true"
              />
            </div>
            <div className="text-sm text-muted-foreground sm:text-right">
              {formatAnalyticsNumber(item.count)} · {formatAnalyticsPercent(item.percentage)}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
