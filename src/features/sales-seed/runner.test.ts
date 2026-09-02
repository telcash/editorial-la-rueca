import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

import type { SalesChannel, SalesChannelMarket } from '@/db/schema';
import { runSalesSeed } from './runner';
import type { SalesSeedRepository } from './types';

type MockSalesSeedRepository = {
  [Key in keyof SalesSeedRepository]: Mock<SalesSeedRepository[Key]>;
};

const now = new Date('2026-01-01T00:00:00.000Z');

function createRepositoryMock(): MockSalesSeedRepository {
  return {
    findChannelBySlug: vi.fn<SalesSeedRepository['findChannelBySlug']>(),
    findMarketsByChannelId: vi.fn<SalesSeedRepository['findMarketsByChannelId']>(),
    applyInitialSalesConfiguration: vi.fn<SalesSeedRepository['applyInitialSalesConfiguration']>(),
  };
}

function createChannel(slug: 'quares' | 'amazon'): SalesChannel {
  return {
    id:
      slug === 'quares'
        ? 'be428823-9f04-4fe1-9303-a41e5ef9d04e'
        : 'bd67695b-4c3d-4c31-9a62-c64a0f0bf4f9',
    name: slug === 'quares' ? 'Quares' : 'Amazon',
    slug,
    websiteUrl: slug === 'quares' ? 'https://tienda.editoriallarueca.com' : 'https://www.amazon.es',
    isActive: true,
    sortOrder: slug === 'quares' ? 0 : 10,
    createdAt: now,
    updatedAt: now,
  };
}

describe('runSalesSeed', () => {
  let repository: MockSalesSeedRepository;

  beforeEach(() => {
    repository = createRepositoryMock();
  });

  it('runs dry-run without applying writes', async () => {
    repository.findChannelBySlug.mockResolvedValue(null);
    repository.findMarketsByChannelId.mockResolvedValue([]);

    const result = await runSalesSeed(repository, { mode: 'dry-run' });

    expect(result.plan.summary.channelsCreate).toBe(2);
    expect(result.plan.summary.marketsCreate).toBe(11);
    expect(result.applyResult).toBeNull();
    expect(repository.applyInitialSalesConfiguration).not.toHaveBeenCalled();
  });

  it('requires explicit confirmation for apply', async () => {
    await expect(runSalesSeed(repository, { mode: 'apply' })).rejects.toThrow('Apply protegido');

    expect(repository.findChannelBySlug).not.toHaveBeenCalled();
  });

  it('applies a conflict-free plan through the repository', async () => {
    repository.findChannelBySlug.mockResolvedValue(null);
    repository.findMarketsByChannelId.mockResolvedValue([]);
    repository.applyInitialSalesConfiguration.mockResolvedValue({
      channelsCreated: 2,
      channelsUpdated: 0,
      channelsUnchanged: 0,
      marketsCreated: 11,
      marketsUpdated: 0,
      marketsUnchanged: 0,
    });

    const result = await runSalesSeed(repository, {
      mode: 'apply',
      confirm: 'SALES_SEED',
    });

    expect(repository.applyInitialSalesConfiguration).toHaveBeenCalledWith(
      expect.objectContaining({
        channels: expect.any(Array),
        markets: expect.any(Array),
      }),
    );
    expect(result.applyResult?.channelsCreated).toBe(2);
  });

  it('blocks apply when an existing slug is conflicting', async () => {
    repository.findChannelBySlug.mockImplementation(async (slug) =>
      slug === 'quares' ? { ...createChannel('quares'), name: 'Otro canal' } : null,
    );
    repository.findMarketsByChannelId.mockResolvedValue([]);

    await expect(
      runSalesSeed(repository, {
        mode: 'apply',
        confirm: 'SALES_SEED',
      }),
    ).rejects.toThrow('conflicto');

    expect(repository.applyInitialSalesConfiguration).not.toHaveBeenCalled();
  });

  it('loads existing markets by channel id to avoid market duplicates', async () => {
    const quares = createChannel('quares');
    const amazon = createChannel('amazon');
    const spainMarket: SalesChannelMarket = {
      id: '97fe21b2-1f6c-4e29-ae02-e6d57d87c037',
      salesChannelId: quares.id,
      name: 'España',
      countryCode: 'ES',
      baseUrl: 'https://tienda.editoriallarueca.com',
      productUrlTemplate: 'https://tienda.editoriallarueca.com/q/detalle?p2_id={externalId}',
      isActive: true,
      sortOrder: 0,
      createdAt: now,
      updatedAt: now,
    };

    repository.findChannelBySlug.mockImplementation(async (slug) =>
      slug === 'quares' ? quares : amazon,
    );
    repository.findMarketsByChannelId.mockImplementation(async (channelId) =>
      channelId === quares.id ? [spainMarket] : [],
    );

    const result = await runSalesSeed(repository, { mode: 'dry-run' });

    expect(repository.findMarketsByChannelId).toHaveBeenCalledWith(quares.id);
    expect(result.plan.markets.find((market) => market.countryCode === 'ES')?.operation).toBe(
      'unchanged',
    );
  });
});
