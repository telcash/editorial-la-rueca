import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import type { BookSalesAdminConfiguration } from '@/services/sales/sales.types';

vi.mock('../actions/update-book-sales', () => ({
  updateBookSalesAction: vi.fn(),
}));

import { BookSalesForm } from './book-sales-form';

const configuration: BookSalesAdminConfiguration = {
  quares: {
    channel: { slug: 'quares', name: 'Quares', isActive: true },
    enabled: true,
    status: 'available',
    externalProductId: '67778',
    purchaseUrl: '',
    marketIds: ['97fe21b2-1f6c-4e29-ae02-e6d57d87c037'],
    markets: [
      {
        id: '97fe21b2-1f6c-4e29-ae02-e6d57d87c037',
        name: 'España',
        countryCode: 'ES',
        isActive: true,
        sortOrder: 0,
      },
      {
        id: '7185f789-16f4-42b7-bb8d-42ad5384f326',
        name: 'México',
        countryCode: 'MX',
        isActive: true,
        sortOrder: 10,
      },
    ],
  },
  amazon: {
    channel: { slug: 'amazon', name: 'Amazon', isActive: true },
    enabled: true,
    status: 'available',
    externalProductId: '',
    purchaseUrl: 'https://www.amazon.es/dp/example',
    marketIds: [],
  },
};

describe('BookSalesForm', () => {
  it('renders hydrated channel values and markets in read-model order', () => {
    const html = renderToStaticMarkup(
      <BookSalesForm bookId="820b7f59-4578-4d3e-a9ce-bc3edb9b4186" configuration={configuration} />,
    );

    expect(html).toContain('Venta y distribución');
    expect(html).toContain('value="67778"');
    expect(html).toContain('value="https://www.amazon.es/dp/example"');
    expect(html.indexOf('España')).toBeLessThan(html.indexOf('México'));
    expect(html).toContain('Guardar venta y distribución');
  });
});
