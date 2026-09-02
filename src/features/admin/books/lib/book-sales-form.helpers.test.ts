import { describe, expect, it } from 'vitest';

import type { BookSalesAdminConfiguration } from '@/services/sales/sales.types';
import {
  getBookSalesFormErrors,
  mapBookSalesConfigurationToFormValues,
  toggleBookSalesMarket,
} from './book-sales-form.helpers';

const marketId = '97fe21b2-1f6c-4e29-ae02-e6d57d87c037';

const configuration: BookSalesAdminConfiguration = {
  quares: {
    channel: { slug: 'quares', name: 'Quares', isActive: true },
    enabled: false,
    status: 'pending',
    externalProductId: '0067778',
    purchaseUrl: '',
    marketIds: [marketId],
    markets: [
      {
        id: marketId,
        name: 'España',
        countryCode: 'ES',
        isActive: true,
        sortOrder: 0,
      },
    ],
  },
  amazon: {
    channel: { slug: 'amazon', name: 'Amazon', isActive: true },
    enabled: true,
    status: 'external_account',
    externalProductId: '',
    purchaseUrl: '',
    marketIds: [],
  },
};

describe('book sales form helpers', () => {
  it('maps inactive and non-public products into editable values', () => {
    expect(mapBookSalesConfigurationToFormValues(configuration)).toEqual({
      quares: {
        enabled: false,
        status: 'pending',
        externalProductId: '0067778',
        marketIds: [marketId],
      },
      amazon: {
        enabled: true,
        status: 'external_account',
        purchaseUrl: '',
      },
    });
  });

  it('adds and removes a market without duplicates', () => {
    expect(toggleBookSalesMarket([], marketId)).toEqual([marketId]);
    expect(toggleBookSalesMarket([marketId], marketId)).toEqual([]);
  });

  it('returns client field errors from the shared Zod contract', () => {
    expect(
      getBookSalesFormErrors({
        quares: { enabled: true, status: 'available', externalProductId: '', marketIds: [] },
        amazon: { enabled: true, status: 'available', purchaseUrl: '' },
      }),
    ).toMatchObject({
      'quares.externalProductId': expect.any(String),
      'quares.marketIds': expect.any(String),
      'amazon.purchaseUrl': expect.any(String),
    });
  });
});
