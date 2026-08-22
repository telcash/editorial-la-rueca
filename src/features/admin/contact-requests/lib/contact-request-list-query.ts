import {
  contactRequestSources,
  contactRequestStatuses,
  type ContactRequestSource,
  type ContactRequestStatus,
} from '@/schemas/contact-requests/contact-request.schema';
import {
  parseAdminPageSize,
  normalizeListSearchQuery,
  type AdminPageSize,
} from '@/features/admin/lib/list-query';

export type ContactRequestStatusFilter = ContactRequestStatus | 'all';
export type ContactRequestSourceFilter = ContactRequestSource | 'all';
export type ContactRequestEmailStatusFilter = 'all' | 'sent' | 'problem';

export interface ContactRequestListQuery {
  query: string;
  status: ContactRequestStatusFilter;
  serviceId: string;
  source: ContactRequestSourceFilter;
  emailStatus: ContactRequestEmailStatusFilter;
  dateFrom: string;
  dateTo: string;
  page: number;
  pageSize: AdminPageSize;
}

interface RawContactRequestListSearchParams {
  q?: string;
  status?: string;
  serviceId?: string;
  source?: string;
  emailStatus?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: string;
  pageSize?: string;
}

function parsePage(value: string | undefined): number {
  if (!value) {
    return 1;
  }

  const parsedPage = Number(value);

  return Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
}

function parseStatus(value: string | undefined): ContactRequestStatusFilter {
  return contactRequestStatuses.includes(value as ContactRequestStatus)
    ? (value as ContactRequestStatus)
    : 'all';
}

function parseSource(value: string | undefined): ContactRequestSourceFilter {
  return contactRequestSources.includes(value as ContactRequestSource)
    ? (value as ContactRequestSource)
    : 'all';
}

function parseEmailStatus(value: string | undefined): ContactRequestEmailStatusFilter {
  return value === 'sent' || value === 'problem' ? value : 'all';
}

function parseDateString(value: string | undefined): string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return '';
  }

  return value;
}

export function parseContactRequestListQuery(
  params: RawContactRequestListSearchParams,
): ContactRequestListQuery {
  return {
    query: normalizeListSearchQuery(params.q),
    status: parseStatus(params.status),
    serviceId: typeof params.serviceId === 'string' ? params.serviceId.trim() : '',
    source: parseSource(params.source),
    emailStatus: parseEmailStatus(params.emailStatus),
    dateFrom: parseDateString(params.dateFrom),
    dateTo: parseDateString(params.dateTo),
    page: parsePage(params.page),
    pageSize: parseAdminPageSize(params.pageSize),
  };
}

export function toContactRequestFilters(query: ContactRequestListQuery) {
  return {
    query: query.query,
    status: query.status,
    serviceId: query.serviceId || undefined,
    source: query.source,
    emailStatus: query.emailStatus,
    dateFrom: query.dateFrom ? new Date(`${query.dateFrom}T00:00:00.000Z`) : undefined,
    dateTo: query.dateTo ? new Date(`${query.dateTo}T23:59:59.999Z`) : undefined,
  };
}
