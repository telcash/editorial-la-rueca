import Link from 'next/link';

import type { ContactRequestAnalyticsData } from '@/services/contact-request-analytics/contact-request-analytics.types';
import { formatAnalyticsNumber, formatAnalyticsPercent } from './contact-request-analytics-format';

interface ContactRequestAnalyticsMetricsProps {
  analytics: ContactRequestAnalyticsData;
}

export function ContactRequestAnalyticsMetrics({ analytics }: ContactRequestAnalyticsMetricsProps) {
  const metrics = [
    { label: 'Solicitudes', value: formatAnalyticsNumber(analytics.summary.total) },
    { label: 'Nuevos', value: formatAnalyticsNumber(analytics.summary.new) },
    {
      label: 'En seguimiento',
      value: formatAnalyticsNumber(analytics.summary.contacted + analytics.summary.inProgress),
    },
    { label: 'Ganados', value: formatAnalyticsNumber(analytics.summary.won) },
    { label: 'Perdidos', value: formatAnalyticsNumber(analytics.summary.lost) },
    {
      label: 'Conversión general',
      value: formatAnalyticsPercent(analytics.summary.generalConversionRate),
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
      {metrics.map((metric) => (
        <div key={metric.label} className="rounded-lg border border-border bg-card px-4 py-3">
          <p className="text-sm text-muted-foreground">{metric.label}</p>
          <p className="mt-1 text-2xl font-semibold text-foreground">{metric.value}</p>
        </div>
      ))}
      <div className="rounded-lg border border-border bg-card px-4 py-3 sm:col-span-2 xl:col-span-3">
        <p className="text-sm text-muted-foreground">Conversión sobre casos cerrados</p>
        <p className="mt-1 text-2xl font-semibold text-foreground">
          {formatAnalyticsPercent(analytics.summary.closedConversionRate)}
        </p>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">
          Calculada únicamente sobre solicitudes con resultado ganado o perdido.
        </p>
      </div>
      <div className="rounded-lg border border-border bg-card px-4 py-3 sm:col-span-2 xl:col-span-3">
        <p className="text-sm text-muted-foreground">Problemas de notificación</p>
        <p className="mt-1 text-2xl font-semibold text-foreground">
          {formatAnalyticsNumber(analytics.summary.notificationProblems)}
        </p>
        <Link
          href="/admin/contact-requests?emailStatus=problem"
          className="mt-2 inline-flex text-xs font-medium text-primary hover:underline"
        >
          Ver solicitudes con error o pendientes
        </Link>
      </div>
    </div>
  );
}
