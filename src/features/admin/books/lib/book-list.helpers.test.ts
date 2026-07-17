import { describe, expect, it } from 'vitest';

import {
  formatAuthorsSummary,
  formatEditionCount,
  formatEditionFormats,
  formatEditionFormatLabel,
  getBookPriceSummary,
} from './book-list.helpers';

const availableEdition = {
  format: 'paperback',
  price: '18.90',
  currency: 'EUR',
  isAvailable: true,
};

describe('formatAuthorsSummary', () => {
  it('formats zero, one, two, three and more authors', () => {
    expect(formatAuthorsSummary([])).toBe('Sin autores');
    expect(formatAuthorsSummary([{ name: 'Ana' }])).toBe('Ana');
    expect(formatAuthorsSummary([{ name: 'Ana' }, { name: 'Bea' }])).toBe('Ana y Bea');
    expect(formatAuthorsSummary([{ name: 'Ana' }, { name: 'Bea' }, { name: 'Carla' }])).toBe(
      'Ana, Bea y Carla',
    );
    expect(
      formatAuthorsSummary([
        { name: 'Ana' },
        { name: 'Bea' },
        { name: 'Carla' },
        { name: 'Diana' },
      ]),
    ).toBe('Ana, Bea y 2 más');
  });
});

describe('edition summary helpers', () => {
  it('formats edition counts', () => {
    expect(formatEditionCount([])).toBe('Sin ediciones');
    expect(formatEditionCount([availableEdition])).toBe('1 edición');
    expect(formatEditionCount([availableEdition, { ...availableEdition, format: 'ebook' }])).toBe(
      '2 ediciones',
    );
  });

  it('formats edition labels with duplicate removal and fallback', () => {
    expect(formatEditionFormatLabel('unknown')).toBe('unknown');
    expect(
      formatEditionFormats([
        availableEdition,
        { ...availableEdition, format: 'paperback' },
        { ...availableEdition, format: 'ebook' },
      ]),
    ).toBe('Tapa blanda · Ebook');
    expect(
      formatEditionFormats([
        availableEdition,
        { ...availableEdition, format: 'ebook' },
        { ...availableEdition, format: 'hardcover' },
      ]),
    ).toBe('Tapa blanda · Ebook · +1');
  });
});

describe('getBookPriceSummary', () => {
  it('returns none when there are no usable prices', () => {
    expect(getBookPriceSummary([])).toEqual({ label: 'Sin precio', kind: 'none' });
    expect(getBookPriceSummary([{ ...availableEdition, isAvailable: false }])).toEqual({
      label: 'Sin precio',
      kind: 'none',
    });
    expect(getBookPriceSummary([{ ...availableEdition, price: null }])).toEqual({
      label: 'Sin precio',
      kind: 'none',
    });
  });

  it('formats a single EUR price and repeated equal prices', () => {
    expect(getBookPriceSummary([availableEdition])).toEqual({
      label: '18,90 €',
      kind: 'single',
    });
    expect(getBookPriceSummary([availableEdition, { ...availableEdition }])).toEqual({
      label: '18,90 €',
      kind: 'single',
    });
  });

  it('formats from the minimum price regardless of order', () => {
    expect(
      getBookPriceSummary([
        { ...availableEdition, price: '18.90' },
        { ...availableEdition, price: '7,99' },
      ]),
    ).toEqual({
      label: 'Desde 7,99 €',
      kind: 'from',
    });
  });

  it('detects multiple currencies', () => {
    expect(
      getBookPriceSummary([
        availableEdition,
        { ...availableEdition, price: '12.00', currency: 'USD' },
      ]),
    ).toEqual({
      label: 'Varios precios',
      kind: 'multiple-currencies',
    });
  });
});
