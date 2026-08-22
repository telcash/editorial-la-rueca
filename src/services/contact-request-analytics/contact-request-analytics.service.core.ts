import {
  contactRequestAnalyticsPeriods,
  type ContactRequestAnalyticsData,
  type ContactRequestAnalyticsPeriod,
  type ContactRequestAnalyticsRange,
  type ContactRequestAnalyticsRepository,
  type ContactRequestCampaignAnalyticsItem,
  type ContactRequestComparisonMetric,
  type ContactRequestServiceAnalyticsItem,
  type ContactRequestSourceAnalyticsItem,
  type ContactRequestStatusCounts,
} from './contact-request-analytics.types';
import {
  contactRequestSources,
  type ContactRequestSource,
  type ContactRequestStatus,
} from '@/schemas/contact-requests/contact-request.schema';

const PENDING_CONTACT_REQUESTS_LIMIT = 5;
const MADRID_TIME_ZONE = 'Europe/Madrid';

const statusLabels: Record<ContactRequestStatus, string> = {
  new: 'Nuevo',
  contacted: 'Contactado',
  in_progress: 'En seguimiento',
  won: 'Ganado',
  lost: 'Perdido',
};

const sourceLabels: Record<ContactRequestSource, string> = {
  website: 'Web',
  instagram: 'Instagram',
  facebook: 'Facebook',
  direct: 'Directo',
  other: 'Otro',
};

function getMadridYear(date: Date): number {
  const year = new Intl.DateTimeFormat('en-CA', {
    timeZone: MADRID_TIME_ZONE,
    year: 'numeric',
  }).format(date);

  return Number(year);
}

function getMadridYearStartUtc(year: number): Date {
  return new Date(Date.UTC(year, 0, 1, -1, 0, 0, 0));
}

export function parseContactRequestAnalyticsPeriod(
  value: string | undefined,
): ContactRequestAnalyticsPeriod {
  return contactRequestAnalyticsPeriods.includes(value as ContactRequestAnalyticsPeriod)
    ? (value as ContactRequestAnalyticsPeriod)
    : '30d';
}

export function getContactRequestAnalyticsRange(
  period: ContactRequestAnalyticsPeriod,
  now: Date = new Date(),
): ContactRequestAnalyticsRange {
  if (period === 'all') {
    return {
      period,
      label: 'Todo el histórico',
      startAt: null,
      endAt: now,
      previousStartAt: null,
      previousEndAt: null,
    };
  }

  if (period === 'year') {
    return {
      period,
      label: 'Este año',
      startAt: getMadridYearStartUtc(getMadridYear(now)),
      endAt: now,
      previousStartAt: null,
      previousEndAt: null,
    };
  }

  const days = period === '90d' ? 90 : 30;
  const durationMs = days * 24 * 60 * 60 * 1000;
  const startAt = new Date(now.getTime() - durationMs);

  return {
    period,
    label: period === '90d' ? 'Últimos 90 días' : 'Últimos 30 días',
    startAt,
    endAt: now,
    previousStartAt: new Date(startAt.getTime() - durationMs),
    previousEndAt: startAt,
  };
}

export function calculatePercentage(value: number, total: number): number {
  if (total <= 0) {
    return 0;
  }

  return Math.round((value / total) * 1000) / 10;
}

export function calculateClosedConversionRate(won: number, lost: number): number | null {
  const closed = won + lost;

  if (closed === 0) {
    return null;
  }

  return calculatePercentage(won, closed);
}

function withConversions<TItem extends { total: number; won: number; lost?: number }>(
  item: TItem,
): TItem & {
  generalConversionRate: number;
  closedConversionRate: number | null;
} {
  return {
    ...item,
    generalConversionRate: calculatePercentage(item.won, item.total),
    closedConversionRate: calculateClosedConversionRate(item.won, item.lost ?? 0),
  };
}

function calculateComparisonMetric(
  current: number,
  previous: number,
): ContactRequestComparisonMetric {
  return {
    current,
    previous,
    changeRate: previous === 0 ? null : Math.round(((current - previous) / previous) * 1000) / 10,
  };
}

async function getComparison(
  repository: ContactRequestAnalyticsRepository,
  range: ContactRequestAnalyticsRange,
  current: ContactRequestStatusCounts,
) {
  if (!range.previousStartAt || !range.previousEndAt) {
    return {
      total: null,
      won: null,
    };
  }

  const previousCounts = await repository.getStatusCounts({
    ...range,
    startAt: range.previousStartAt,
    endAt: range.previousEndAt,
    previousStartAt: null,
    previousEndAt: null,
  });

  return {
    total: calculateComparisonMetric(current.total, previousCounts.total),
    won: calculateComparisonMetric(current.won, previousCounts.won),
  };
}

function createPipeline(summary: ContactRequestStatusCounts) {
  return [
    { status: 'new', label: statusLabels.new, count: summary.new },
    { status: 'contacted', label: statusLabels.contacted, count: summary.contacted },
    { status: 'in_progress', label: statusLabels.in_progress, count: summary.inProgress },
    { status: 'won', label: statusLabels.won, count: summary.won },
    { status: 'lost', label: statusLabels.lost, count: summary.lost },
  ].map((item) => ({
    ...item,
    status: item.status as ContactRequestStatus,
    percentage: calculatePercentage(item.count, summary.total),
  }));
}

function completeSources(
  rows: Array<
    Omit<
      ContactRequestSourceAnalyticsItem,
      'label' | 'percentage' | 'generalConversionRate' | 'closedConversionRate'
    >
  >,
  total: number,
): ContactRequestSourceAnalyticsItem[] {
  const rowBySource = new Map(rows.map((row) => [row.source, row]));

  return contactRequestSources.map((source) => {
    const row = rowBySource.get(source) ?? {
      source,
      total: 0,
      won: 0,
      lost: 0,
    };

    return {
      ...withConversions(row),
      label: sourceLabels[source],
      percentage: calculatePercentage(row.total, total),
    };
  });
}

export function createContactRequestAnalyticsService(
  repository: ContactRequestAnalyticsRepository,
) {
  return {
    async getAnalytics(
      period: ContactRequestAnalyticsPeriod,
      now: Date = new Date(),
    ): Promise<ContactRequestAnalyticsData> {
      const range = getContactRequestAnalyticsRange(period, now);
      const [summaryCounts, services, sources, campaigns, monthly, pending] = await Promise.all([
        repository.getStatusCounts(range),
        repository.getServiceAnalytics(range),
        repository.getSourceAnalytics(range),
        repository.getCampaignAnalytics(range),
        repository.getMonthlyAnalytics(range),
        repository.findPendingContactRequests(range, PENDING_CONTACT_REQUESTS_LIMIT),
      ]);
      const summary = withConversions(summaryCounts);

      return {
        range,
        summary,
        pipeline: createPipeline(summaryCounts),
        services: services.map((item): ContactRequestServiceAnalyticsItem => withConversions(item)),
        sources: completeSources(sources, summaryCounts.total),
        campaigns: campaigns.map((item): ContactRequestCampaignAnalyticsItem =>
          withConversions(item),
        ),
        monthly,
        pending,
        comparison: await getComparison(repository, range, summaryCounts),
      };
    },
  };
}
