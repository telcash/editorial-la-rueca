import { describe, expect, it } from 'vitest';

import type { SalesChannel, SalesChannelMarket } from '@/db/schema';
import { initialSalesChannels } from './initial-sales-config';
import { planInitialSalesSeed } from './planner';

const now = new Date('2026-01-01T00:00:00.000Z');

function createChannel(overrides: Partial<SalesChannel>): SalesChannel {
  return {
    id: 'be428823-9f04-4fe1-9303-a41e5ef9d04e',
    name: 'Quares',
    slug: 'quares',
    websiteUrl: 'https://tienda.editoriallarueca.com',
    isActive: true,
    sortOrder: 0,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function createMarket(overrides: Partial<SalesChannelMarket>): SalesChannelMarket {
  return {
    id: '97fe21b2-1f6c-4e29-ae02-e6d57d87c037',
    salesChannelId: 'be428823-9f04-4fe1-9303-a41e5ef9d04e',
    name: 'España',
    countryCode: 'ES',
    baseUrl: 'https://tienda.editoriallarueca.com',
    productUrlTemplate: 'https://tienda.editoriallarueca.com/q/detalle?p2_id={externalId}',
    isActive: true,
    sortOrder: 0,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe('planInitialSalesSeed', () => {
  it('classifies missing channels and markets as create', () => {
    const plan = planInitialSalesSeed({
      config: initialSalesChannels,
      existingChannelsBySlug: new Map(),
      existingMarketsByChannelSlug: new Map(),
      mode: 'dry-run',
    });

    expect(plan.summary).toMatchObject({
      channelsCreate: 2,
      marketsCreate: 11,
      conflicts: 0,
    });
  });

  it('classifies identical records as unchanged and avoids duplicates on second run', () => {
    const quaresChannel = createChannel({});
    const amazonChannel = createChannel({
      id: 'bd67695b-4c3d-4c31-9a62-c64a0f0bf4f9',
      name: 'Amazon',
      slug: 'amazon',
      websiteUrl: 'https://www.amazon.es',
      sortOrder: 10,
    });
    const quaresMarkets = initialSalesChannels[0]?.markets.map((market, index) =>
      createMarket({
        id: `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
        name: market.name,
        countryCode: market.countryCode,
        baseUrl: market.baseUrl,
        productUrlTemplate: market.productUrlTemplate,
        sortOrder: market.sortOrder,
      }),
    );

    const plan = planInitialSalesSeed({
      config: initialSalesChannels,
      existingChannelsBySlug: new Map([
        ['quares', quaresChannel],
        ['amazon', amazonChannel],
      ]),
      existingMarketsByChannelSlug: new Map([['quares', quaresMarkets ?? []]]),
      mode: 'dry-run',
    });

    expect(plan.summary).toMatchObject({
      channelsUnchanged: 2,
      marketsUnchanged: 11,
      channelsCreate: 0,
      marketsCreate: 0,
      conflicts: 0,
    });
  });

  it('classifies safe configuration drift as update', () => {
    const plan = planInitialSalesSeed({
      config: initialSalesChannels,
      existingChannelsBySlug: new Map([['quares', createChannel({ sortOrder: 99 })]]),
      existingMarketsByChannelSlug: new Map([
        [
          'quares',
          [
            createMarket({
              baseUrl: 'https://old.example.com',
            }),
          ],
        ],
      ]),
      mode: 'dry-run',
    });

    expect(plan.channels.find((item) => item.slug === 'quares')?.operation).toBe('update');
    expect(plan.markets.find((item) => item.countryCode === 'ES')?.operation).toBe('update');
  });

  it('detects conflicting channel slug and market country', () => {
    const plan = planInitialSalesSeed({
      config: initialSalesChannels,
      existingChannelsBySlug: new Map([
        [
          'quares',
          createChannel({
            name: 'Otro canal',
          }),
        ],
      ]),
      existingMarketsByChannelSlug: new Map([
        [
          'quares',
          [
            createMarket({
              name: 'Otro país',
            }),
          ],
        ],
      ]),
      mode: 'dry-run',
    });

    expect(plan.channels.find((item) => item.slug === 'quares')?.operation).toBe('conflict');
    expect(plan.markets.find((item) => item.countryCode === 'ES')?.operation).toBe('conflict');
    expect(plan.summary.conflicts).toBe(2);
  });

  it('rejects duplicated country codes in the dataset', () => {
    const [quares, amazon] = initialSalesChannels;

    expect(() =>
      planInitialSalesSeed({
        config: quares
          ? [
              {
                ...quares,
                markets: [quares.markets[0]!, quares.markets[0]!],
              },
              ...(amazon ? [amazon] : []),
            ]
          : initialSalesChannels,
        existingChannelsBySlug: new Map(),
        existingMarketsByChannelSlug: new Map(),
        mode: 'dry-run',
      }),
    ).toThrow('countryCode duplicado');
  });
});
