import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

import {
  calculateClosedConversionRate,
  getContactRequestAnalyticsRange,
  parseContactRequestAnalyticsPeriod,
  createContactRequestAnalyticsService,
} from './contact-request-analytics.service.core';
import type {
  ContactRequestAnalyticsRepository,
  ContactRequestAnalyticsRange,
} from './contact-request-analytics.types';

type MockAnalyticsRepository = {
  [Key in keyof ContactRequestAnalyticsRepository]: Mock<ContactRequestAnalyticsRepository[Key]>;
};

const now = new Date('2026-08-21T10:00:00.000Z');

function createRepositoryMock(): MockAnalyticsRepository {
  return {
    getStatusCounts: vi.fn<ContactRequestAnalyticsRepository['getStatusCounts']>(),
    getServiceAnalytics: vi.fn<ContactRequestAnalyticsRepository['getServiceAnalytics']>(),
    getSourceAnalytics: vi.fn<ContactRequestAnalyticsRepository['getSourceAnalytics']>(),
    getCampaignAnalytics: vi.fn<ContactRequestAnalyticsRepository['getCampaignAnalytics']>(),
    getMonthlyAnalytics: vi.fn<ContactRequestAnalyticsRepository['getMonthlyAnalytics']>(),
    findPendingContactRequests:
      vi.fn<ContactRequestAnalyticsRepository['findPendingContactRequests']>(),
  };
}

describe('contact request analytics service', () => {
  let repository: MockAnalyticsRepository;
  let service: ReturnType<typeof createContactRequestAnalyticsService>;

  beforeEach(() => {
    repository = createRepositoryMock();
    service = createContactRequestAnalyticsService(repository);

    repository.getStatusCounts.mockImplementation(async (range: ContactRequestAnalyticsRange) => {
      if (range.previousStartAt === null && range.previousEndAt === null && range.startAt) {
        return {
          total: 5,
          new: 1,
          contacted: 1,
          inProgress: 1,
          won: 1,
          lost: 1,
          open: 3,
          notificationProblems: 0,
        };
      }

      return {
        total: 10,
        new: 2,
        contacted: 2,
        inProgress: 1,
        won: 3,
        lost: 2,
        open: 5,
        notificationProblems: 2,
      };
    });
    repository.getServiceAnalytics.mockResolvedValue([
      {
        serviceId: 'f3f6a49f-c418-4522-b311-a70b88aab7f4',
        serviceName: 'Corrección de manuscrito',
        serviceSlug: 'correccion-de-manuscrito',
        total: 6,
        won: 2,
        lost: 1,
        open: 3,
      },
    ]);
    repository.getSourceAnalytics.mockResolvedValue([
      {
        source: 'website',
        total: 7,
        won: 3,
        lost: 2,
      },
      {
        source: 'instagram',
        total: 3,
        won: 0,
        lost: 0,
      },
    ]);
    repository.getCampaignAnalytics.mockResolvedValue([
      {
        campaign: 'lanzamiento',
        total: 4,
        won: 1,
        lost: 1,
      },
    ]);
    repository.getMonthlyAnalytics.mockResolvedValue([
      {
        month: '2026-08',
        total: 10,
        won: 3,
        lost: 2,
      },
    ]);
    repository.findPendingContactRequests.mockResolvedValue([
      {
        id: '45aa8657-bf26-4b62-bc01-8ba7570d7bbb',
        name: 'Ana Pérez',
        serviceName: 'Corrección de manuscrito',
        createdAt: new Date('2026-08-01T10:00:00.000Z'),
      },
    ]);
  });

  it('normalizes invalid periods to 30d and creates expected ranges', () => {
    expect(parseContactRequestAnalyticsPeriod('invalid')).toBe('30d');
    expect(getContactRequestAnalyticsRange('30d', now).startAt?.toISOString()).toBe(
      '2026-07-22T10:00:00.000Z',
    );
    expect(getContactRequestAnalyticsRange('90d', now).startAt?.toISOString()).toBe(
      '2026-05-23T10:00:00.000Z',
    );
    expect(getContactRequestAnalyticsRange('year', now).startAt?.toISOString()).toBe(
      '2025-12-31T23:00:00.000Z',
    );
    expect(getContactRequestAnalyticsRange('all', now).startAt).toBeNull();
  });

  it('calculates summary counts, open pipeline and conversion rates', async () => {
    const analytics = await service.getAnalytics('30d', now);

    expect(analytics.summary).toMatchObject({
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
    });
    expect(analytics.pipeline).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ status: 'new', count: 2, percentage: 20 }),
        expect.objectContaining({ status: 'contacted', count: 2, percentage: 20 }),
        expect.objectContaining({ status: 'in_progress', count: 1, percentage: 10 }),
        expect.objectContaining({ status: 'won', count: 3, percentage: 30 }),
        expect.objectContaining({ status: 'lost', count: 2, percentage: 20 }),
      ]),
    );
  });

  it('calculates service, source, campaign and monthly read models', async () => {
    const analytics = await service.getAnalytics('30d', now);

    expect(analytics.services[0]).toMatchObject({
      serviceId: 'f3f6a49f-c418-4522-b311-a70b88aab7f4',
      total: 6,
      open: 3,
      generalConversionRate: 33.3,
      closedConversionRate: 66.7,
    });
    expect(analytics.sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: 'website',
          label: 'Web',
          total: 7,
          percentage: 70,
          generalConversionRate: 42.9,
          closedConversionRate: 60,
        }),
        expect.objectContaining({ source: 'facebook', label: 'Facebook', total: 0 }),
        expect.objectContaining({ source: 'direct', label: 'Directo', total: 0 }),
        expect.objectContaining({ source: 'other', label: 'Otro', total: 0 }),
      ]),
    );
    expect(analytics.campaigns[0]).toMatchObject({
      campaign: 'lanzamiento',
      total: 4,
      generalConversionRate: 25,
      closedConversionRate: 50,
    });
    expect(analytics.monthly[0]).toMatchObject({ month: '2026-08', total: 10, won: 3, lost: 2 });
  });

  it('returns pending leads without PII beyond the operational fields', async () => {
    const analytics = await service.getAnalytics('30d', now);

    expect(repository.findPendingContactRequests).toHaveBeenCalledWith(
      expect.objectContaining({ period: '30d' }),
      5,
    );
    expect(analytics.pending[0]).toEqual({
      id: '45aa8657-bf26-4b62-bc01-8ba7570d7bbb',
      name: 'Ana Pérez',
      serviceName: 'Corrección de manuscrito',
      createdAt: new Date('2026-08-01T10:00:00.000Z'),
    });
    expect(analytics.pending[0]).not.toHaveProperty('email');
    expect(analytics.pending[0]).not.toHaveProperty('phone');
  });

  it('compares 30d and 90d with the immediately previous period', async () => {
    const analytics = await service.getAnalytics('90d', now);

    expect(analytics.comparison.total).toEqual({
      current: 10,
      previous: 5,
      changeRate: 100,
    });
    expect(analytics.comparison.won).toEqual({
      current: 3,
      previous: 1,
      changeRate: 200,
    });
  });

  it('does not show misleading closed conversion or comparison percentages for empty data', async () => {
    repository.getStatusCounts.mockResolvedValue({
      total: 0,
      new: 0,
      contacted: 0,
      inProgress: 0,
      won: 0,
      lost: 0,
      open: 0,
      notificationProblems: 0,
    });
    repository.getServiceAnalytics.mockResolvedValue([]);
    repository.getSourceAnalytics.mockResolvedValue([]);
    repository.getCampaignAnalytics.mockResolvedValue([]);
    repository.getMonthlyAnalytics.mockResolvedValue([]);
    repository.findPendingContactRequests.mockResolvedValue([]);

    const analytics = await service.getAnalytics('all', now);

    expect(analytics.summary.generalConversionRate).toBe(0);
    expect(analytics.summary.closedConversionRate).toBeNull();
    expect(calculateClosedConversionRate(0, 0)).toBeNull();
    expect(analytics.comparison.total).toBeNull();
    expect(analytics.services).toEqual([]);
    expect(analytics.campaigns).toEqual([]);
  });
});
