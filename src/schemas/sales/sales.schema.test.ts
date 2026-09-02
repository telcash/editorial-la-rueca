import { describe, expect, it } from 'vitest';

import {
  bookSalesMarketAvailabilitySchema,
  bookSalesProductSchema,
  salesChannelMarketSchema,
  salesChannelSchema,
  updateBookSalesConfigurationSchema,
} from './sales.schema';

const salesChannelId = 'be428823-9f04-4fe1-9303-a41e5ef9d04e';
const bookId = '820b7f59-4578-4d3e-a9ce-bc3edb9b4186';
const productId = 'ae63c7a8-75e3-4082-8c09-a69955f8f167';
const marketId = '97fe21b2-1f6c-4e29-ae02-e6d57d87c037';

describe('sales schemas', () => {
  it('validates and normalizes a sales channel', () => {
    expect(
      salesChannelSchema.parse({
        name: ' Quares ',
        slug: 'quares',
        websiteUrl: '',
        isActive: true,
        sortOrder: '1',
      }),
    ).toEqual({
      name: 'Quares',
      slug: 'quares',
      websiteUrl: null,
      isActive: true,
      sortOrder: 1,
    });
  });

  it('validates a sales channel market with product URL template', () => {
    expect(
      salesChannelMarketSchema.parse({
        salesChannelId,
        name: 'España',
        countryCode: 'ES',
        baseUrl: 'https://tienda.editoriallarueca.com',
        productUrlTemplate: 'https://tienda.editoriallarueca.com/q/detalle?p2_id={externalId}',
      }),
    ).toEqual({
      salesChannelId,
      name: 'España',
      countryCode: 'ES',
      baseUrl: 'https://tienda.editoriallarueca.com',
      productUrlTemplate: 'https://tienda.editoriallarueca.com/q/detalle?p2_id={externalId}',
      isActive: true,
      sortOrder: 0,
    });
  });

  it('rejects product URL templates without externalId', () => {
    expect(() =>
      salesChannelMarketSchema.parse({
        salesChannelId,
        name: 'España',
        baseUrl: 'https://tienda.editoriallarueca.com',
        productUrlTemplate: 'https://tienda.editoriallarueca.com/q/detalle',
      }),
    ).toThrow();
  });

  it('validates a book sales product for Amazon without markets', () => {
    expect(
      bookSalesProductSchema.parse({
        bookId,
        salesChannelId,
        externalProductId: '',
        purchaseUrl: 'https://www.amazon.es/libro',
      }),
    ).toEqual({
      bookId,
      salesChannelId,
      externalProductId: null,
      purchaseUrl: 'https://www.amazon.es/libro',
      status: 'available',
      isActive: true,
      sortOrder: 0,
    });
  });

  it('accepts non purchasable product statuses as domain data', () => {
    expect(
      bookSalesProductSchema.parse({
        bookId,
        salesChannelId,
        status: 'external_account',
      }).status,
    ).toBe('external_account');
  });

  it('validates market availability ids', () => {
    expect(
      bookSalesMarketAvailabilitySchema.parse({
        bookSalesProductId: productId,
        salesChannelMarketId: marketId,
      }),
    ).toEqual({
      bookSalesProductId: productId,
      salesChannelMarketId: marketId,
    });
  });

  it('normalizes the Quares external id and removes duplicate markets', () => {
    const result = updateBookSalesConfigurationSchema.parse({
      quares: {
        enabled: true,
        externalProductId: ' 0067778 ',
        status: 'available',
        marketIds: [marketId, marketId],
      },
      amazon: {
        enabled: false,
        purchaseUrl: '',
        status: 'available',
      },
    });

    expect(result.quares.externalProductId).toBe('0067778');
    expect(result.quares.marketIds).toEqual([marketId]);
    expect(result.amazon.purchaseUrl).toBeNull();
  });

  it('requires an external id and a market for an available Quares product', () => {
    const result = updateBookSalesConfigurationSchema.safeParse({
      quares: {
        enabled: true,
        externalProductId: '',
        status: 'available',
        marketIds: [],
      },
      amazon: { enabled: false, purchaseUrl: '', status: 'available' },
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.path.join('.'))).toEqual([
      'quares.externalProductId',
      'quares.marketIds',
    ]);
  });

  it.each(['unavailable', 'external_account', 'pending'] as const)(
    'allows Quares %s without an external id or markets',
    (status) => {
      expect(
        updateBookSalesConfigurationSchema.safeParse({
          quares: { enabled: true, externalProductId: '', status, marketIds: [] },
          amazon: { enabled: false, purchaseUrl: '', status: 'available' },
        }).success,
      ).toBe(true);
    },
  );

  it('requires a valid HTTP purchase URL for available Amazon', () => {
    const result = updateBookSalesConfigurationSchema.safeParse({
      quares: { enabled: false, externalProductId: '', status: 'available', marketIds: [] },
      amazon: { enabled: true, purchaseUrl: 'ftp://amazon.example/book', status: 'available' },
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path.join('.')).toBe('amazon.purchaseUrl');
  });

  it.each(['unavailable', 'external_account', 'pending'] as const)(
    'allows Amazon %s without a purchase URL',
    (status) => {
      expect(
        updateBookSalesConfigurationSchema.safeParse({
          quares: { enabled: false, externalProductId: '', status: 'available', marketIds: [] },
          amazon: { enabled: true, purchaseUrl: '', status },
        }).success,
      ).toBe(true);
    },
  );
});
