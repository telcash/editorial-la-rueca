import type { ContactRequestCampaignAnalyticsItem } from '@/services/contact-request-analytics/contact-request-analytics.types';
import { formatAnalyticsNumber, formatAnalyticsPercent } from './contact-request-analytics-format';

export function ContactRequestCampaignAnalytics({
  campaigns,
}: {
  campaigns: ContactRequestCampaignAnalyticsItem[];
}) {
  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <h2 className="text-lg font-semibold text-foreground">Campañas</h2>
      <p className="text-sm text-muted-foreground">Primera lectura basada en UTM campaign.</p>

      {campaigns.length > 0 ? (
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="border-b border-border text-xs uppercase text-muted-foreground">
              <tr>
                <th className="py-2 pr-3">Campaña</th>
                <th className="px-3 py-2 text-right">Solicitudes</th>
                <th className="px-3 py-2 text-right">Ganadas</th>
                <th className="py-2 pl-3 text-right">Conversión</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {campaigns.map((campaign) => (
                <tr key={campaign.campaign}>
                  <td className="py-3 pr-3 font-medium text-foreground">{campaign.campaign}</td>
                  <td className="px-3 py-3 text-right">{formatAnalyticsNumber(campaign.total)}</td>
                  <td className="px-3 py-3 text-right">{formatAnalyticsNumber(campaign.won)}</td>
                  <td className="py-3 pl-3 text-right">
                    {formatAnalyticsPercent(campaign.generalConversionRate)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-5 rounded-md bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          Aún no hay datos de campañas.
        </p>
      )}
    </section>
  );
}
