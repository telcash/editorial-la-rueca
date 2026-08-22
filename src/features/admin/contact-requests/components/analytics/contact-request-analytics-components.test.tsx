import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import type { ContactRequestAnalyticsData } from '@/services/contact-request-analytics/contact-request-analytics.types';
import { ContactRequestAnalyticsMetrics } from './contact-request-analytics-metrics';
import { ContactRequestCampaignAnalytics } from './contact-request-campaign-analytics';
import { ContactRequestMonthlyAnalytics } from './contact-request-monthly-analytics';
import { ContactRequestPeriodComparison } from './contact-request-period-comparison';
import { ContactRequestPeriodFilter } from './contact-request-period-filter';
import { ContactRequestPipeline } from './contact-request-pipeline';
import { ContactRequestServiceAnalytics } from './contact-request-service-analytics';
import { ContactRequestSourceAnalytics } from './contact-request-source-analytics';
import { PendingContactRequests } from './pending-contact-requests';

const analytics: ContactRequestAnalyticsData = {
  range: {
    period: '30d',
    label: 'Últimos 30 días',
    startAt: new Date('2026-07-22T10:00:00.000Z'),
    endAt: new Date('2026-08-21T10:00:00.000Z'),
    previousStartAt: new Date('2026-06-22T10:00:00.000Z'),
    previousEndAt: new Date('2026-07-22T10:00:00.000Z'),
  },
  summary: {
    total: 10,
    new: 2,
    contacted: 2,
    inProgress: 1,
    won: 3,
    lost: 2,
    open: 5,
    notificationProblems: 2,
    generalConversionRate: 30,
    closedConversionRate: 60,
  },
  pipeline: [
    { status: 'new', label: 'Nuevo', count: 2, percentage: 20 },
    { status: 'contacted', label: 'Contactado', count: 2, percentage: 20 },
    { status: 'in_progress', label: 'En seguimiento', count: 1, percentage: 10 },
    { status: 'won', label: 'Ganado', count: 3, percentage: 30 },
    { status: 'lost', label: 'Perdido', count: 2, percentage: 20 },
  ],
  services: [
    {
      serviceId: 'f3f6a49f-c418-4522-b311-a70b88aab7f4',
      serviceName: 'Corrección de manuscrito',
      serviceSlug: 'correccion-de-manuscrito',
      total: 6,
      open: 3,
      won: 2,
      lost: 1,
      generalConversionRate: 33.3,
      closedConversionRate: 66.7,
    },
  ],
  sources: [
    {
      source: 'website',
      label: 'Web',
      total: 7,
      won: 3,
      lost: 2,
      percentage: 70,
      generalConversionRate: 42.9,
      closedConversionRate: 60,
    },
  ],
  campaigns: [
    {
      campaign: 'lanzamiento',
      total: 4,
      won: 1,
      lost: 1,
      generalConversionRate: 25,
      closedConversionRate: 50,
    },
  ],
  monthly: [{ month: '2026-08', total: 10, won: 3, lost: 2 }],
  pending: [
    {
      id: '45aa8657-bf26-4b62-bc01-8ba7570d7bbb',
      name: 'Ana Pérez',
      serviceName: 'Corrección de manuscrito',
      createdAt: new Date('2026-08-01T10:00:00.000Z'),
    },
  ],
  comparison: {
    total: { current: 10, previous: 5, changeRate: 100 },
    won: { current: 3, previous: 1, changeRate: 200 },
  },
};

describe('contact request analytics components', () => {
  it('renders metric cards without NaN values and links notification problems to the list', () => {
    const html = renderToStaticMarkup(<ContactRequestAnalyticsMetrics analytics={analytics} />);

    expect(html).toContain('Solicitudes');
    expect(html).toContain('Conversión general');
    expect(html).toContain('Conversión sobre casos cerrados');
    expect(html).toContain('Problemas de notificación');
    expect(html).toContain('/admin/contact-requests?emailStatus=problem');
    expect(html).not.toContain('NaN');
    expect(html).not.toContain('Infinity');
  });

  it('renders pipeline, service analytics, source labels and campaign data', () => {
    const html = [
      renderToStaticMarkup(<ContactRequestPipeline analytics={analytics} />),
      renderToStaticMarkup(<ContactRequestServiceAnalytics services={analytics.services} />),
      renderToStaticMarkup(<ContactRequestSourceAnalytics sources={analytics.sources} />),
      renderToStaticMarkup(<ContactRequestCampaignAnalytics campaigns={analytics.campaigns} />),
    ].join('');

    expect(html).toContain('Estado de las solicitudes');
    expect(html).toContain('Nuevo');
    expect(html).toContain('Corrección de manuscrito');
    expect(html).toContain('Web');
    expect(html).toContain('lanzamiento');
  });

  it('renders monthly evolution and pending leads with only operational fields', () => {
    const html = [
      renderToStaticMarkup(<ContactRequestMonthlyAnalytics monthly={analytics.monthly} />),
      renderToStaticMarkup(<PendingContactRequests pending={analytics.pending} />),
    ].join('');

    expect(html).toContain('Solicitudes por mes');
    expect(html).toContain('2026-08');
    expect(html).toContain('Pendientes de atención');
    expect(html).toContain('Ana Pérez');
    expect(html).toContain('/admin/contact-requests/45aa8657-bf26-4b62-bc01-8ba7570d7bbb');
    expect(html).not.toContain('ana@example.com');
  });

  it('renders empty states for campaigns, services, monthly data and pending leads', () => {
    const html = [
      renderToStaticMarkup(<ContactRequestServiceAnalytics services={[]} />),
      renderToStaticMarkup(<ContactRequestCampaignAnalytics campaigns={[]} />),
      renderToStaticMarkup(<ContactRequestMonthlyAnalytics monthly={[]} />),
      renderToStaticMarkup(<PendingContactRequests pending={[]} />),
    ].join('');

    expect(html).toContain('Aún no hay solicitudes por servicio');
    expect(html).toContain('Aún no hay datos de campañas');
    expect(html).toContain('Aún no hay evolución temporal');
    expect(html).toContain('No hay leads nuevos pendientes');
  });

  it('renders period filter and comparison fallback safely', () => {
    const filterHtml = renderToStaticMarkup(<ContactRequestPeriodFilter period="30d" />);
    const comparisonHtml = renderToStaticMarkup(
      <ContactRequestPeriodComparison comparison={{ total: null, won: null }} />,
    );

    expect(filterHtml).toContain('Últimos 30 días');
    expect(filterHtml).toContain('/admin/contact-requests/analytics?period=90d');
    expect(comparisonHtml).toContain('Disponible para últimos 30 días y últimos 90 días');
  });
});
