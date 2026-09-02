import { describe, expect, it } from 'vitest';

import { SALES_PRODUCT_EXTERNAL_ID_PLACEHOLDER } from '@/services/sales/purchase-url-resolver';
import { initialSalesChannels } from './initial-sales-config';

describe('initialSalesChannels', () => {
  it('contains exactly Quares and Amazon channels', () => {
    expect(initialSalesChannels).toHaveLength(2);
    expect(initialSalesChannels.map(({ channel }) => channel.slug)).toEqual(['quares', 'amazon']);
  });

  it('defines Quares and Amazon configuration', () => {
    expect(initialSalesChannels[0]?.channel).toEqual({
      name: 'Quares',
      slug: 'quares',
      websiteUrl: 'https://tienda.editoriallarueca.com',
      isActive: true,
      sortOrder: 0,
    });
    expect(initialSalesChannels[1]?.channel).toEqual({
      name: 'Amazon',
      slug: 'amazon',
      websiteUrl: 'https://www.amazon.es',
      isActive: true,
      sortOrder: 10,
    });
  });

  it('defines exactly 11 Quares markets and no Amazon markets', () => {
    const [quares, amazon] = initialSalesChannels;

    expect(quares?.markets).toHaveLength(11);
    expect(amazon?.markets).toHaveLength(0);
  });

  it('places España first and keeps the rest in the configured order', () => {
    const quaresMarkets = initialSalesChannels[0]?.markets ?? [];

    expect(quaresMarkets.map((market) => `${market.countryCode}:${market.sortOrder}`)).toEqual([
      'ES:0',
      'AR:10',
      'BO:20',
      'CL:30',
      'CO:40',
      'CR:50',
      'EC:60',
      'GT:70',
      'MX:80',
      'US:90',
      'VE:100',
    ]);
  });

  it('uses unique country codes and templates with externalId', () => {
    const quaresMarkets = initialSalesChannels[0]?.markets ?? [];
    const countryCodes = quaresMarkets.map((market) => market.countryCode);

    expect(new Set(countryCodes).size).toBe(countryCodes.length);

    for (const market of quaresMarkets) {
      expect(() => new URL(market.baseUrl)).not.toThrow();
      expect(
        () =>
          new URL(market.productUrlTemplate.replace(SALES_PRODUCT_EXTERNAL_ID_PLACEHOLDER, '1')),
      ).not.toThrow();
      expect(market.productUrlTemplate).toContain(SALES_PRODUCT_EXTERNAL_ID_PLACEHOLDER);
    }
  });
});
