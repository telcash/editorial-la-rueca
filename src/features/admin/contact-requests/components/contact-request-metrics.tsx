import type { ContactRequestCounts } from '@/services/contact-requests/contact-request.types';

interface ContactRequestMetricsProps {
  counts: ContactRequestCounts;
}

export function ContactRequestMetrics({ counts }: ContactRequestMetricsProps) {
  const metrics = [
    { label: 'Total', value: counts.total },
    { label: 'Nuevos', value: counts.new },
    { label: 'En seguimiento', value: counts.inProgress },
    { label: 'Ganados', value: counts.won },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {metrics.map((metric) => (
        <div key={metric.label} className="rounded-lg border border-border bg-card px-4 py-3">
          <p className="text-sm text-muted-foreground">{metric.label}</p>
          <p className="mt-1 text-2xl font-semibold text-foreground">{metric.value}</p>
        </div>
      ))}
    </div>
  );
}
