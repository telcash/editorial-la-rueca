import { describe, expect, it } from 'vitest';

import type { BookEditionDetails } from '@/services/books/book.types';
import {
  computeBookPreviewPosition,
  getBookPreviewDescription,
  getBookMetaSummary,
  isHoverPreviewAvailable,
  selectPrimaryBookEdition,
} from './book-card.helpers';

const baseEdition: BookEditionDetails = {
  id: 'a301b33b-aa0d-470f-a6cc-60f0b9dcacbf',
  bookId: '6b34dbd8-6d3c-41db-86b7-c83f3de68d75',
  format: 'paperback',
  editionLabel: null,
  publicationDate: '2025-01-01',
  isbn10: null,
  isbn13: null,
  price: null,
  currency: 'EUR',
  pages: 180,
  isAvailable: true,
  isFeatured: false,
  sortOrder: 0,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
};

describe('book card helpers', () => {
  it('selects the featured edition before recent or sorted editions', () => {
    const featuredEdition = {
      ...baseEdition,
      id: 'e4a6c276-5bd7-4716-99e1-a8d7a35b23e8',
      isFeatured: true,
      publicationDate: '2020-01-01',
    };

    expect(selectPrimaryBookEdition([baseEdition, featuredEdition])).toBe(featuredEdition);
  });

  it('selects the most recent edition when there is no featured edition', () => {
    const recentEdition = {
      ...baseEdition,
      id: '20b9a1b8-8829-4d25-bd4d-05e6a9f5040e',
      publicationDate: '2026-03-01',
    };

    expect(selectPrimaryBookEdition([baseEdition, recentEdition])).toBe(recentEdition);
  });

  it('selects an available edition before a newer unavailable edition', () => {
    const unavailableRecentEdition = {
      ...baseEdition,
      id: '4739e9ff-39ea-4f85-9686-66ff93815e8a',
      publicationDate: '2026-03-01',
      isAvailable: false,
    };

    expect(selectPrimaryBookEdition([unavailableRecentEdition, baseEdition])).toBe(baseEdition);
  });

  it('selects lower sort order before recency when availability is tied', () => {
    const recentEdition = {
      ...baseEdition,
      id: 'a7882ac7-7d0e-4265-ac52-e56e3343a741',
      publicationDate: '2026-03-01',
      sortOrder: 5,
    };
    const orderedEdition = {
      ...baseEdition,
      id: 'e92ad0dc-04df-4036-a0f6-373480d39709',
      publicationDate: '2020-01-01',
      sortOrder: 1,
    };

    expect(selectPrimaryBookEdition([recentEdition, orderedEdition])).toBe(orderedEdition);
  });

  it('builds a short preview description from excerpt or clean synopsis', () => {
    expect(
      getBookPreviewDescription({ excerpt: 'Texto breve', description: '<p>Sinopsis</p>' }),
    ).toBe('Texto breve');
    expect(
      getBookPreviewDescription({ excerpt: null, description: '<p>Sinopsis &amp; detalle</p>' }),
    ).toBe('Sinopsis & detalle');
  });

  it('omits metadata when there is no edition and summarizes the main edition', () => {
    expect(getBookMetaSummary(null)).toEqual([]);
    expect(getBookMetaSummary(baseEdition)).toEqual(['2025', '180 págs.', 'Rústica']);
  });

  it('keeps hover previews disabled for touch-only devices', () => {
    expect(isHoverPreviewAvailable(false)).toBe(false);
    expect(isHoverPreviewAvailable(true)).toBe(true);
  });

  it('centers the preview over the card when there is enough viewport room', () => {
    const position = computeBookPreviewPosition(
      { left: 520, right: 680, top: 260, bottom: 500, width: 160, height: 240 },
      { width: 1200, height: 900 },
    );

    expect(position.left).toBe(366);
    expect(position.top).toBe(210);
    expect(position.originX).toBe(234);
    expect(position.originY).toBe(170);
    expect(position.isHorizontallyAdjusted).toBe(false);
    expect(position.isVerticallyAdjusted).toBe(false);
  });

  it('keeps the zoom anchored to the card center when clamped by viewport edges', () => {
    const leftEdge = computeBookPreviewPosition(
      { left: 12, right: 172, top: 260, bottom: 500, width: 160, height: 240 },
      { width: 1200, height: 900 },
    );
    const bottomEdge = computeBookPreviewPosition(
      { left: 520, right: 680, top: 700, bottom: 940, width: 160, height: 240 },
      { width: 1200, height: 900 },
    );

    expect(leftEdge.left).toBe(16);
    expect(leftEdge.originX).toBe(76);
    expect(leftEdge.isHorizontallyAdjusted).toBe(true);
    expect(bottomEdge.top).toBe(544);
    expect(bottomEdge.originY).toBe(276);
    expect(bottomEdge.isVerticallyAdjusted).toBe(true);
  });
});
