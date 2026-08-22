import Link from 'next/link';
import { connection } from 'next/server';
import { ArrowLeft } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { AdminPageHeader } from '@/features/admin/components/admin-page-header';
import { ContactRequestAnalyticsMetrics } from '@/features/admin/contact-requests/components/analytics/contact-request-analytics-metrics';
import { ContactRequestCampaignAnalytics } from '@/features/admin/contact-requests/components/analytics/contact-request-campaign-analytics';
import { ContactRequestMonthlyAnalytics } from '@/features/admin/contact-requests/components/analytics/contact-request-monthly-analytics';
import { ContactRequestPeriodComparison } from '@/features/admin/contact-requests/components/analytics/contact-request-period-comparison';
import { ContactRequestPeriodFilter } from '@/features/admin/contact-requests/components/analytics/contact-request-period-filter';
import { ContactRequestPipeline } from '@/features/admin/contact-requests/components/analytics/contact-request-pipeline';
import { ContactRequestServiceAnalytics } from '@/features/admin/contact-requests/components/analytics/contact-request-service-analytics';
import { ContactRequestSourceAnalytics } from '@/features/admin/contact-requests/components/analytics/contact-request-source-analytics';
import { PendingContactRequests } from '@/features/admin/contact-requests/components/analytics/pending-contact-requests';
import { requireEditorialStaff } from '@/services/auth/access.service';
import {
  getAnalytics,
  type ContactRequestAnalyticsPeriod,
} from '@/services/contact-request-analytics/contact-request-analytics.service';
import { parseContactRequestAnalyticsPeriod } from '@/services/contact-request-analytics/contact-request-analytics.service.core';

interface ContactRequestAnalyticsPageProps {
  searchParams: Promise<{
    period?: string;
  }>;
}

export default async function ContactRequestAnalyticsPage({
  searchParams,
}: ContactRequestAnalyticsPageProps) {
  await connection();
  await requireEditorialStaff();

  const params = await searchParams;
  const period: ContactRequestAnalyticsPeriod = parseContactRequestAnalyticsPeriod(params.period);
  const analytics = await getAnalytics(period);

  return (
    <section className="space-y-6">
      <AdminPageHeader
        title="Analítica comercial"
        description="Volumen, pipeline, conversión, servicios, origen y solicitudes que necesitan atención."
        actions={
          <Button asChild variant="outline">
            <Link href="/admin/contact-requests">
              <ArrowLeft className="size-4" aria-hidden="true" />
              Volver a solicitudes
            </Link>
          </Button>
        }
      />

      <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">{analytics.range.label}</p>
          <p className="text-xs text-muted-foreground">
            Los rangos y meses se calculan con referencia operativa Europe/Madrid.
          </p>
        </div>
        <ContactRequestPeriodFilter period={period} />
      </div>

      <ContactRequestAnalyticsMetrics analytics={analytics} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(22rem,0.65fr)]">
        <div className="space-y-6">
          <ContactRequestPipeline analytics={analytics} />
          <ContactRequestServiceAnalytics services={analytics.services} />
          <ContactRequestMonthlyAnalytics monthly={analytics.monthly} />
        </div>
        <div className="space-y-6">
          <PendingContactRequests pending={analytics.pending} />
          <ContactRequestPeriodComparison comparison={analytics.comparison} />
          <ContactRequestSourceAnalytics sources={analytics.sources} />
          <ContactRequestCampaignAnalytics campaigns={analytics.campaigns} />
        </div>
      </div>
    </section>
  );
}
