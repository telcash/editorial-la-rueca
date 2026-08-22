import type { ContactRequestMonthlyAnalyticsItem } from '@/services/contact-request-analytics/contact-request-analytics.types';
import { formatAnalyticsNumber } from './contact-request-analytics-format';

export function ContactRequestMonthlyAnalytics({
  monthly,
}: {
  monthly: ContactRequestMonthlyAnalyticsItem[];
}) {
  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <h2 className="text-lg font-semibold text-foreground">Solicitudes por mes</h2>
      <p className="text-sm text-muted-foreground">
        Agrupación mensual en zona horaria Europe/Madrid.
      </p>

      {monthly.length > 0 ? (
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[420px] text-left text-sm">
            <thead className="border-b border-border text-xs uppercase text-muted-foreground">
              <tr>
                <th className="py-2 pr-3">Mes</th>
                <th className="px-3 py-2 text-right">Total</th>
                <th className="px-3 py-2 text-right">Ganadas</th>
                <th className="py-2 pl-3 text-right">Perdidas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {monthly.map((item) => (
                <tr key={item.month}>
                  <td className="py-3 pr-3 font-medium text-foreground">{item.month}</td>
                  <td className="px-3 py-3 text-right">{formatAnalyticsNumber(item.total)}</td>
                  <td className="px-3 py-3 text-right">{formatAnalyticsNumber(item.won)}</td>
                  <td className="py-3 pl-3 text-right">{formatAnalyticsNumber(item.lost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-5 rounded-md bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          Aún no hay evolución temporal para este período.
        </p>
      )}
    </section>
  );
}
