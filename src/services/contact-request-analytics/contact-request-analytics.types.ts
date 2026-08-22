import type {
  ContactRequestSource,
  ContactRequestStatus,
} from '@/schemas/contact-requests/contact-request.schema';

export const contactRequestAnalyticsPeriods = ['30d', '90d', 'year', 'all'] as const;
export const contactRequestOpenStatuses = ['new', 'contacted', 'in_progress'] as const;
export const contactRequestClosedStatuses = ['won', 'lost'] as const;

export type ContactRequestAnalyticsPeriod = (typeof contactRequestAnalyticsPeriods)[number];

export interface ContactRequestAnalyticsRange {
  period: ContactRequestAnalyticsPeriod;
  label: string;
  startAt: Date | null;
  endAt: Date;
  previousStartAt: Date | null;
  previousEndAt: Date | null;
}

export interface ContactRequestStatusCounts {
  total: number;
  new: number;
  contacted: number;
  inProgress: number;
  won: number;
  lost: number;
  open: number;
  notificationProblems: number;
}

export interface ContactRequestConversionMetrics {
  generalConversionRate: number;
  closedConversionRate: number | null;
}

export interface ContactRequestServiceAnalyticsItem extends ContactRequestConversionMetrics {
  serviceId: string;
  serviceName: string;
  serviceSlug: string;
  total: number;
  won: number;
  lost: number;
  open: number;
}

export interface ContactRequestSourceAnalyticsItem extends ContactRequestConversionMetrics {
  source: ContactRequestSource;
  label: string;
  total: number;
  won: number;
  lost: number;
  percentage: number;
}

export interface ContactRequestCampaignAnalyticsItem extends ContactRequestConversionMetrics {
  campaign: string;
  total: number;
  won: number;
  lost: number;
}

export interface ContactRequestMonthlyAnalyticsItem {
  month: string;
  total: number;
  won: number;
  lost: number;
}

export interface PendingContactRequestAnalyticsItem {
  id: string;
  name: string;
  serviceName: string;
  createdAt: Date;
}

export interface ContactRequestComparisonMetric {
  current: number;
  previous: number | null;
  changeRate: number | null;
}

export interface ContactRequestAnalyticsComparison {
  total: ContactRequestComparisonMetric | null;
  won: ContactRequestComparisonMetric | null;
}

export interface ContactRequestAnalyticsData {
  range: ContactRequestAnalyticsRange;
  summary: ContactRequestStatusCounts & ContactRequestConversionMetrics;
  pipeline: Array<{
    status: ContactRequestStatus;
    label: string;
    count: number;
    percentage: number;
  }>;
  services: ContactRequestServiceAnalyticsItem[];
  sources: ContactRequestSourceAnalyticsItem[];
  campaigns: ContactRequestCampaignAnalyticsItem[];
  monthly: ContactRequestMonthlyAnalyticsItem[];
  pending: PendingContactRequestAnalyticsItem[];
  comparison: ContactRequestAnalyticsComparison;
}

export interface ContactRequestAnalyticsRepository {
  getStatusCounts(range: ContactRequestAnalyticsRange): Promise<ContactRequestStatusCounts>;
  getServiceAnalytics(
    range: ContactRequestAnalyticsRange,
  ): Promise<
    Array<Omit<ContactRequestServiceAnalyticsItem, keyof ContactRequestConversionMetrics>>
  >;
  getSourceAnalytics(
    range: ContactRequestAnalyticsRange,
  ): Promise<
    Array<
      Omit<
        ContactRequestSourceAnalyticsItem,
        keyof ContactRequestConversionMetrics | 'label' | 'percentage'
      >
    >
  >;
  getCampaignAnalytics(
    range: ContactRequestAnalyticsRange,
  ): Promise<
    Array<Omit<ContactRequestCampaignAnalyticsItem, keyof ContactRequestConversionMetrics>>
  >;
  getMonthlyAnalytics(
    range: ContactRequestAnalyticsRange,
  ): Promise<ContactRequestMonthlyAnalyticsItem[]>;
  findPendingContactRequests(
    range: ContactRequestAnalyticsRange,
    limit: number,
  ): Promise<PendingContactRequestAnalyticsItem[]>;
}
