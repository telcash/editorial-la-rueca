import type { ContactRequestServiceAnalyticsItem } from '@/services/contact-request-analytics/contact-request-analytics.types';
import { formatAnalyticsNumber, formatAnalyticsPercent } from './contact-request-analytics-format';

interface ContactRequestServiceAnalyticsProps {
  services: ContactRequestServiceAnalyticsItem[];
}

export function ContactRequestServiceAnalytics({ services }: ContactRequestServiceAnalyticsProps) {
  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <h2 className="text-lg font-semibold text-foreground">Solicitudes por servicio</h2>
      <p className="text-sm text-muted-foreground">
        Incluye servicios históricos aunque estén archivados.
      </p>

      {services.length > 0 ? (
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-border text-xs uppercase text-muted-foreground">
              <tr>
                <th className="py-2 pr-3">Servicio</th>
                <th className="px-3 py-2 text-right">Solicitudes</th>
                <th className="px-3 py-2 text-right">Abiertas</th>
                <th className="px-3 py-2 text-right">Ganadas</th>
                <th className="px-3 py-2 text-right">Perdidas</th>
                <th className="px-3 py-2 text-right">Conv. general</th>
                <th className="py-2 pl-3 text-right">Conv. cerrada</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {services.map((service) => (
                <tr key={service.serviceId}>
                  <td className="py-3 pr-3">
                    <div className="font-medium text-foreground">{service.serviceName}</div>
                    <div className="text-xs text-muted-foreground">{service.serviceSlug}</div>
                  </td>
                  <td className="px-3 py-3 text-right">{formatAnalyticsNumber(service.total)}</td>
                  <td className="px-3 py-3 text-right">{formatAnalyticsNumber(service.open)}</td>
                  <td className="px-3 py-3 text-right">{formatAnalyticsNumber(service.won)}</td>
                  <td className="px-3 py-3 text-right">{formatAnalyticsNumber(service.lost)}</td>
                  <td className="px-3 py-3 text-right">
                    {formatAnalyticsPercent(service.generalConversionRate)}
                  </td>
                  <td className="py-3 pl-3 text-right">
                    {formatAnalyticsPercent(service.closedConversionRate)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-5 rounded-md bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          Aún no hay solicitudes por servicio en este período.
        </p>
      )}
    </section>
  );
}
