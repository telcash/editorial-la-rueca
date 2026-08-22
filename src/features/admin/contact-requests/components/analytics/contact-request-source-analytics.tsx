import type { ContactRequestSourceAnalyticsItem } from '@/services/contact-request-analytics/contact-request-analytics.types';
import { formatAnalyticsNumber, formatAnalyticsPercent } from './contact-request-analytics-format';

export function ContactRequestSourceAnalytics({
  sources,
}: {
  sources: ContactRequestSourceAnalyticsItem[];
}) {
  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <h2 className="text-lg font-semibold text-foreground">Origen de las solicitudes</h2>
      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead className="border-b border-border text-xs uppercase text-muted-foreground">
            <tr>
              <th className="py-2 pr-3">Origen</th>
              <th className="px-3 py-2 text-right">Solicitudes</th>
              <th className="px-3 py-2 text-right">Porcentaje</th>
              <th className="px-3 py-2 text-right">Ganadas</th>
              <th className="py-2 pl-3 text-right">Conversión</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sources.map((source) => (
              <tr key={source.source}>
                <td className="py-3 pr-3 font-medium text-foreground">{source.label}</td>
                <td className="px-3 py-3 text-right">{formatAnalyticsNumber(source.total)}</td>
                <td className="px-3 py-3 text-right">
                  {formatAnalyticsPercent(source.percentage)}
                </td>
                <td className="px-3 py-3 text-right">{formatAnalyticsNumber(source.won)}</td>
                <td className="py-3 pl-3 text-right">
                  {formatAnalyticsPercent(source.generalConversionRate)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
