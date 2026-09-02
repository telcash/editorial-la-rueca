import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

import type {
  BookSalesMarketAvailability,
  BookSalesProduct,
  SalesChannel,
  SalesChannelMarket,
} from '@/db/schema';
import {
  SalesChannelNotFoundError,
  SalesMarketChannelMismatchError,
  SalesMarketInactiveError,
  SalesMarketNotFoundError,
} from './sales.errors';
import {
  buildPublicChannelMarkets,
  buildPublicPurchaseOptions,
  createSalesService,
} from './sales.service.core';
import type {
  BookSalesPublicRow,
  PublicSalesChannelMarketRow,
  SalesRepository,
} from './sales.types';

type MockSalesRepository = {
  [Key in keyof SalesRepository]: Mock<SalesRepository[Key]>;
};

const bookId = '820b7f59-4578-4d3e-a9ce-bc3edb9b4186';
const quaresChannelId = 'be428823-9f04-4fe1-9303-a41e5ef9d04e';
const amazonChannelId = 'bd67695b-4c3d-4c31-9a62-c64a0f0bf4f9';
const marketId = '97fe21b2-1f6c-4e29-ae02-e6d57d87c037';
const now = new Date('2026-01-01T00:00:00.000Z');

function createChannel(slug: 'quares' | 'amazon'): SalesChannel {
  return {
    id: slug === 'quares' ? quaresChannelId : amazonChannelId,
    name: slug === 'quares' ? 'Quares' : 'Amazon',
    slug,
    websiteUrl: `https://${slug}.example`,
    isActive: true,
    sortOrder: slug === 'quares' ? 0 : 10,
    createdAt: now,
    updatedAt: now,
  };
}

function createMarket(overrides: Partial<SalesChannelMarket> = {}): SalesChannelMarket {
  return {
    id: marketId,
    salesChannelId: quaresChannelId,
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

function createProduct(
  channel: 'quares' | 'amazon',
  overrides: Partial<BookSalesProduct> = {},
): BookSalesProduct {
  return {
    id:
      channel === 'quares'
        ? 'e61c3616-c4f5-4f31-a0d3-4941edb5a66d'
        : 'f8e4e4ef-221c-4931-ae5b-cd84706050de',
    bookId,
    salesChannelId: channel === 'quares' ? quaresChannelId : amazonChannelId,
    externalProductId: channel === 'quares' ? '67778' : null,
    purchaseUrl: channel === 'amazon' ? 'https://www.amazon.es/dp/example' : null,
    status: 'available',
    isActive: true,
    sortOrder: 0,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function createAvailability(): BookSalesMarketAvailability {
  return {
    id: '8667765a-84b4-4d03-a508-dd28bc47839f',
    bookSalesProductId: createProduct('quares').id,
    salesChannelMarketId: marketId,
    createdAt: now,
    updatedAt: now,
  };
}

const validConfiguration = {
  quares: {
    enabled: true,
    externalProductId: ' 0067778 ',
    status: 'available' as const,
    marketIds: [marketId],
  },
  amazon: {
    enabled: true,
    purchaseUrl: ' https://www.amazon.es/dp/example ',
    status: 'available' as const,
  },
};

function createBaseRow(overrides: Partial<BookSalesPublicRow> = {}): BookSalesPublicRow {
  return {
    productId: 'e61c3616-c4f5-4f31-a0d3-4941edb5a66d',
    productExternalProductId: '67778',
    productPurchaseUrl: null,
    productStatus: 'available',
    productIsActive: true,
    productSortOrder: 0,
    channelId: quaresChannelId,
    channelSlug: 'quares',
    channelName: 'Quares',
    channelIsActive: true,
    channelSortOrder: 0,
    marketId: '97fe21b2-1f6c-4e29-ae02-e6d57d87c037',
    marketName: 'España',
    marketCountryCode: 'ES',
    marketProductUrlTemplate: 'https://tienda.editoriallarueca.com/q/detalle?p2_id={externalId}',
    marketIsActive: true,
    marketSortOrder: 0,
    ...overrides,
  };
}

function createPublicMarketRow(
  overrides: Partial<PublicSalesChannelMarketRow> = {},
): PublicSalesChannelMarketRow {
  return {
    id: '97fe21b2-1f6c-4e29-ae02-e6d57d87c037',
    name: 'España',
    countryCode: 'ES',
    baseUrl: 'https://tienda.editoriallarueca.com',
    sortOrder: 0,
    channelIsActive: true,
    marketIsActive: true,
    ...overrides,
  };
}

function createRepositoryMock(): MockSalesRepository {
  return {
    findChannels: vi.fn<SalesRepository['findChannels']>(),
    findChannelBySlug: vi.fn<SalesRepository['findChannelBySlug']>(),
    findMarketsByChannelId: vi.fn<SalesRepository['findMarketsByChannelId']>(),
    findProductsByBookId: vi.fn<SalesRepository['findProductsByBookId']>(),
    findAvailabilityByProductId: vi.fn<SalesRepository['findAvailabilityByProductId']>(),
    findPublicPurchaseRowsByBookId: vi.fn<SalesRepository['findPublicPurchaseRowsByBookId']>(),
    findPublicMarketsByChannelSlug: vi.fn<SalesRepository['findPublicMarketsByChannelSlug']>(),
    saveBookSalesConfiguration: vi.fn<SalesRepository['saveBookSalesConfiguration']>(),
  };
}

describe('buildPublicPurchaseOptions', () => {
  it('builds Quares multi-market options and Amazon direct options', () => {
    expect(
      buildPublicPurchaseOptions([
        createBaseRow(),
        createBaseRow({
          marketId: '7185f789-16f4-42b7-bb8d-42ad5384f326',
          marketName: 'Colombia',
          marketCountryCode: 'CO',
          marketProductUrlTemplate:
            'https://colombia.editoriallarueca.com/q/detalle?p2_id={externalId}',
          marketSortOrder: 1,
        }),
        createBaseRow({
          productId: 'f8e4e4ef-221c-4931-ae5b-cd84706050de',
          productExternalProductId: null,
          productPurchaseUrl: 'https://www.amazon.es/cuando-el-rio-suena',
          channelId: amazonChannelId,
          channelSlug: 'amazon',
          channelName: 'Amazon',
          channelSortOrder: 1,
          marketId: null,
          marketName: null,
          marketCountryCode: null,
          marketProductUrlTemplate: null,
          marketIsActive: null,
          marketSortOrder: null,
        }),
      ]),
    ).toEqual([
      {
        channel: { slug: 'quares', name: 'Quares' },
        options: [
          {
            marketName: 'España',
            countryCode: 'ES',
            url: 'https://tienda.editoriallarueca.com/q/detalle?p2_id=67778',
          },
          {
            marketName: 'Colombia',
            countryCode: 'CO',
            url: 'https://colombia.editoriallarueca.com/q/detalle?p2_id=67778',
          },
        ],
      },
      {
        channel: { slug: 'amazon', name: 'Amazon' },
        options: [
          {
            marketName: null,
            countryCode: null,
            url: 'https://www.amazon.es/cuando-el-rio-suena',
          },
        ],
      },
    ]);
  });

  it('excludes non purchasable rows', () => {
    expect(
      buildPublicPurchaseOptions([
        createBaseRow({ productStatus: 'unavailable' }),
        createBaseRow({ productStatus: 'external_account' }),
        createBaseRow({ productStatus: 'pending' }),
        createBaseRow({ productIsActive: false }),
        createBaseRow({ channelIsActive: false }),
        createBaseRow({ marketIsActive: false }),
        createBaseRow({ productExternalProductId: null, marketProductUrlTemplate: null }),
      ]),
    ).toEqual([]);
  });

  it('uses explicit purchaseUrl before a market template', () => {
    expect(
      buildPublicPurchaseOptions([
        createBaseRow({
          productPurchaseUrl: 'https://www.amazon.es/preferida',
          marketProductUrlTemplate:
            'https://tienda.editoriallarueca.com/q/detalle?p2_id={externalId}',
        }),
      ])[0]?.options[0]?.url,
    ).toBe('https://www.amazon.es/preferida');
  });
});

describe('buildPublicChannelMarkets', () => {
  it('returns active Quares markets in repository order using base URLs', () => {
    expect(
      buildPublicChannelMarkets([
        createPublicMarketRow({
          id: '7185f789-16f4-42b7-bb8d-42ad5384f326',
          name: 'Argentina',
          countryCode: 'AR',
          baseUrl: 'https://argentina.editoriallarueca.com',
          sortOrder: 10,
        }),
        createPublicMarketRow(),
      ]),
    ).toEqual([
      {
        name: 'España',
        countryCode: 'ES',
        baseUrl: 'https://tienda.editoriallarueca.com',
        sortOrder: 0,
      },
      {
        name: 'Argentina',
        countryCode: 'AR',
        baseUrl: 'https://argentina.editoriallarueca.com',
        sortOrder: 10,
      },
    ]);
  });

  it('excludes inactive channels, inactive markets and unsafe URLs', () => {
    expect(
      buildPublicChannelMarkets([
        createPublicMarketRow({ channelIsActive: false }),
        createPublicMarketRow({ marketIsActive: false }),
        createPublicMarketRow({ baseUrl: 'javascript:alert(1)' }),
      ]),
    ).toEqual([]);
  });
});

describe('createSalesService', () => {
  let repository: MockSalesRepository;
  let service: ReturnType<typeof createSalesService>;

  beforeEach(() => {
    repository = createRepositoryMock();
    service = createSalesService(repository);
    repository.findChannelBySlug.mockImplementation(async (slug) =>
      slug === 'quares' ? createChannel('quares') : createChannel('amazon'),
    );
    repository.findMarketsByChannelId.mockResolvedValue([createMarket()]);
    repository.findProductsByBookId.mockResolvedValue([]);
    repository.findAvailabilityByProductId.mockResolvedValue([]);
    repository.findPublicMarketsByChannelSlug.mockResolvedValue([]);
    repository.saveBookSalesConfiguration.mockResolvedValue(undefined);
  });

  it('delegates read operations after validating UUIDs', async () => {
    repository.findPublicPurchaseRowsByBookId.mockResolvedValue([createBaseRow()]);

    await expect(service.getPublicPurchaseOptionsByBookId(bookId)).resolves.toHaveLength(1);
    expect(repository.findPublicPurchaseRowsByBookId).toHaveBeenCalledWith(bookId);
  });

  it('loads public markets by channel slug without exposing Amazon data', async () => {
    repository.findPublicMarketsByChannelSlug.mockResolvedValue([createPublicMarketRow()]);

    await expect(service.getPublicChannelMarkets('quares')).resolves.toHaveLength(1);
    expect(repository.findPublicMarketsByChannelSlug).toHaveBeenCalledWith('quares');
    expect(repository.findPublicMarketsByChannelSlug).not.toHaveBeenCalledWith('amazon');
  });

  it('rejects invalid public channel slugs before querying', async () => {
    await expect(service.getPublicChannelMarkets('../amazon')).rejects.toThrow();
    expect(repository.findPublicMarketsByChannelSlug).not.toHaveBeenCalled();
  });

  it('rejects invalid UUIDs before querying', async () => {
    await expect(service.getPublicPurchaseOptionsByBookId('not-a-uuid')).rejects.toThrow();
    expect(repository.findPublicPurchaseRowsByBookId).not.toHaveBeenCalled();
  });

  it('accepts a market that belongs to the product channel', () => {
    expect(() =>
      service.assertMarketBelongsToProductChannel(quaresChannelId, quaresChannelId),
    ).not.toThrow();
  });

  it('rejects a market from a different channel', () => {
    expect(() =>
      service.assertMarketBelongsToProductChannel(amazonChannelId, quaresChannelId),
    ).toThrow(SalesMarketChannelMismatchError);
  });

  it('hydrates default admin values when the book has no sales products', async () => {
    const configuration = await service.getBookSalesAdminConfiguration(bookId);

    expect(configuration.quares.enabled).toBe(false);
    expect(configuration.quares.status).toBe('available');
    expect(configuration.quares.externalProductId).toBe('');
    expect(configuration.quares.marketIds).toEqual([]);
    expect(configuration.amazon.enabled).toBe(false);
    expect(configuration.amazon.purchaseUrl).toBe('');
  });

  it('hydrates active and inactive products for administration', async () => {
    repository.findProductsByBookId.mockResolvedValue([
      createProduct('quares', { isActive: false, status: 'pending' }),
      createProduct('amazon', { isActive: true, status: 'external_account' }),
    ]);
    repository.findAvailabilityByProductId.mockResolvedValue([createAvailability()]);

    const configuration = await service.getBookSalesAdminConfiguration(bookId);

    expect(configuration.quares).toMatchObject({
      enabled: false,
      status: 'pending',
      externalProductId: '67778',
      marketIds: [marketId],
    });
    expect(configuration.amazon).toMatchObject({
      enabled: true,
      status: 'external_account',
      purchaseUrl: 'https://www.amazon.es/dp/example',
    });
  });

  it('keeps markets in repository order for the admin read model', async () => {
    const mexicoId = '7185f789-16f4-42b7-bb8d-42ad5384f326';
    repository.findMarketsByChannelId.mockResolvedValue([
      createMarket(),
      createMarket({ id: mexicoId, name: 'México', countryCode: 'MX', sortOrder: 10 }),
    ]);

    const configuration = await service.getBookSalesAdminConfiguration(bookId);

    expect(configuration.quares.markets.map((market) => market.name)).toEqual(['España', 'México']);
  });

  it('creates or updates both channels through one repository operation', async () => {
    await service.updateBookSalesConfiguration(bookId, validConfiguration);

    expect(repository.saveBookSalesConfiguration).toHaveBeenCalledWith({
      bookId,
      quares: {
        channelId: quaresChannelId,
        enabled: true,
        externalProductId: '0067778',
        purchaseUrl: null,
        status: 'available',
        marketIds: [marketId],
      },
      amazon: {
        channelId: amazonChannelId,
        enabled: true,
        externalProductId: null,
        purchaseUrl: 'https://www.amazon.es/dp/example',
        status: 'available',
        marketIds: [],
      },
    });
  });

  it('preserves disabled channel data by delegating an inactive configuration', async () => {
    await service.updateBookSalesConfiguration(bookId, {
      ...validConfiguration,
      quares: { ...validConfiguration.quares, enabled: false },
      amazon: { ...validConfiguration.amazon, enabled: false },
    });

    expect(repository.saveBookSalesConfiguration).toHaveBeenCalledWith(
      expect.objectContaining({
        quares: expect.objectContaining({ enabled: false, externalProductId: '0067778' }),
        amazon: expect.objectContaining({
          enabled: false,
          purchaseUrl: 'https://www.amazon.es/dp/example',
        }),
      }),
    );
  });

  it('rejects a market that does not exist', async () => {
    repository.findMarketsByChannelId.mockResolvedValue([]);

    await expect(
      service.updateBookSalesConfiguration(bookId, validConfiguration),
    ).rejects.toBeInstanceOf(SalesMarketNotFoundError);
    expect(repository.saveBookSalesConfiguration).not.toHaveBeenCalled();
  });

  it('rejects a market returned for a different channel', async () => {
    repository.findMarketsByChannelId.mockResolvedValue([
      createMarket({ salesChannelId: amazonChannelId }),
    ]);

    await expect(
      service.updateBookSalesConfiguration(bookId, validConfiguration),
    ).rejects.toBeInstanceOf(SalesMarketChannelMismatchError);
  });

  it('rejects a newly selected inactive market', async () => {
    repository.findMarketsByChannelId.mockResolvedValue([createMarket({ isActive: false })]);

    await expect(
      service.updateBookSalesConfiguration(bookId, validConfiguration),
    ).rejects.toBeInstanceOf(SalesMarketInactiveError);
  });

  it('allows preserving an inactive market that was already selected', async () => {
    repository.findMarketsByChannelId.mockResolvedValue([createMarket({ isActive: false })]);
    repository.findProductsByBookId.mockResolvedValue([createProduct('quares')]);
    repository.findAvailabilityByProductId.mockResolvedValue([createAvailability()]);

    await expect(
      service.updateBookSalesConfiguration(bookId, validConfiguration),
    ).resolves.toBeUndefined();
  });

  it('fails before persistence when a managed channel is missing', async () => {
    repository.findChannelBySlug.mockImplementation(async (slug) =>
      slug === 'quares' ? null : createChannel('amazon'),
    );

    await expect(
      service.updateBookSalesConfiguration(bookId, validConfiguration),
    ).rejects.toBeInstanceOf(SalesChannelNotFoundError);
    expect(repository.saveBookSalesConfiguration).not.toHaveBeenCalled();
  });

  it('propagates persistence failures so the repository transaction can roll back', async () => {
    const transactionError = new Error('transaction rolled back');
    repository.saveBookSalesConfiguration.mockRejectedValue(transactionError);

    await expect(service.updateBookSalesConfiguration(bookId, validConfiguration)).rejects.toBe(
      transactionError,
    );
  });
});
