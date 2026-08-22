import { describe, expect, it } from 'vitest';

import {
  parseContactRequestListQuery,
  toContactRequestFilters,
} from './contact-request-list-query';

describe('contact request list query helpers', () => {
  it('parses defaults', () => {
    expect(parseContactRequestListQuery({})).toEqual({
      query: '',
      status: 'all',
      serviceId: '',
      source: 'all',
      emailStatus: 'all',
      dateFrom: '',
      dateTo: '',
      page: 1,
      pageSize: 20,
    });
  });

  it('parses filters, search and pagination', () => {
    expect(
      parseContactRequestListQuery({
        q: '  ana  ',
        status: 'in_progress',
        serviceId: 'f3f6a49f-c418-4522-b311-a70b88aab7f4',
        source: 'instagram',
        emailStatus: 'problem',
        dateFrom: '2026-01-01',
        dateTo: '2026-01-31',
        page: '3',
        pageSize: '50',
      }),
    ).toEqual({
      query: 'ana',
      status: 'in_progress',
      serviceId: 'f3f6a49f-c418-4522-b311-a70b88aab7f4',
      source: 'instagram',
      emailStatus: 'problem',
      dateFrom: '2026-01-01',
      dateTo: '2026-01-31',
      page: 3,
      pageSize: 50,
    });
  });

  it('normalizes invalid status, source, dates and page', () => {
    expect(
      parseContactRequestListQuery({
        status: 'closed',
        source: 'ads',
        emailStatus: 'queued',
        dateFrom: '01-01-2026',
        dateTo: 'tomorrow',
        page: '-1',
        pageSize: '999',
      }),
    ).toMatchObject({
      status: 'all',
      source: 'all',
      emailStatus: 'all',
      dateFrom: '',
      dateTo: '',
      page: 1,
      pageSize: 20,
    });
  });

  it('converts date filters to inclusive day ranges', () => {
    const filters = toContactRequestFilters(
      parseContactRequestListQuery({
        dateFrom: '2026-01-01',
        dateTo: '2026-01-31',
      }),
    );

    expect(filters.dateFrom?.toISOString()).toBe('2026-01-01T00:00:00.000Z');
    expect(filters.dateTo?.toISOString()).toBe('2026-01-31T23:59:59.999Z');
  });

  it('passes email notification filters to the repository layer', () => {
    const filters = toContactRequestFilters(
      parseContactRequestListQuery({
        emailStatus: 'sent',
      }),
    );

    expect(filters.emailStatus).toBe('sent');
  });
});
