import { describe, expect, it } from 'vitest';

import {
  comparePublicCatalogBooks,
  getEffectivePublicationDate,
  getPublicCatalogOrderByExpressions,
  type PublicCatalogOrderBook,
} from './book-public-order';

function createOrderBook(overrides: Partial<PublicCatalogOrderBook> = {}): PublicCatalogOrderBook {
  return {
    id: 'book-1',
    title: 'Libro base',
    sortOrder: 0,
    editions: [{ publicationDate: '2024-01-01' }],
    ...overrides,
  };
}

function sortBooks(books: PublicCatalogOrderBook[]) {
  return [...books].sort(comparePublicCatalogBooks);
}

describe('public catalog book order', () => {
  it('places a 2025 book before a 2024 book', () => {
    const books = [
      createOrderBook({
        id: 'book-2024',
        title: 'Libro 2024',
        editions: [{ publicationDate: '2024-01-01' }],
      }),
      createOrderBook({
        id: 'book-2025',
        title: 'Libro 2025',
        editions: [{ publicationDate: '2025-01-01' }],
      }),
    ];

    expect(sortBooks(books).map((book) => book.id)).toEqual(['book-2025', 'book-2024']);
  });

  it('uses the most recent edition publication date as the effective date', () => {
    const book = createOrderBook({
      editions: [{ publicationDate: '2020-01-01' }, { publicationDate: '2025-01-01' }],
    });

    expect(getEffectivePublicationDate(book)).toBe('2025-01-01');
  });

  it('places books without publication date after dated books', () => {
    const books = [
      createOrderBook({
        id: 'book-without-date',
        title: 'Libro sin fecha',
        editions: [{ publicationDate: null }],
      }),
      createOrderBook({
        id: 'book-with-date',
        title: 'Libro con fecha',
        editions: [{ publicationDate: '2021-01-01' }],
      }),
    ];

    expect(sortBooks(books).map((book) => book.id)).toEqual([
      'book-with-date',
      'book-without-date',
    ]);
  });

  it('keeps deterministic order when books share the same effective date', () => {
    const books = [
      createOrderBook({
        id: 'book-c',
        title: 'Beta',
        sortOrder: 1,
        editions: [{ publicationDate: '2025-01-01' }],
      }),
      createOrderBook({
        id: 'book-b',
        title: 'Beta',
        sortOrder: 0,
        editions: [{ publicationDate: '2025-01-01' }],
      }),
      createOrderBook({
        id: 'book-a',
        title: 'Alfa',
        sortOrder: 0,
        editions: [{ publicationDate: '2025-01-01' }],
      }),
    ];

    expect(sortBooks(books).map((book) => book.id)).toEqual(['book-a', 'book-b', 'book-c']);
  });

  it('keeps one book entry when a book has several editions', () => {
    const books = [
      createOrderBook({
        id: 'book-with-several-editions',
        editions: [
          { publicationDate: '2020-01-01' },
          { publicationDate: '2024-01-01' },
          { publicationDate: '2025-01-01' },
        ],
      }),
    ];

    expect(sortBooks(books)).toHaveLength(1);
    expect(getEffectivePublicationDate(books[0])).toBe('2025-01-01');
  });

  it('allows pagination after ordering the complete result set', () => {
    const books = [
      createOrderBook({
        id: 'book-2023',
        title: 'Libro 2023',
        editions: [{ publicationDate: '2023-01-01' }],
      }),
      createOrderBook({
        id: 'book-2025',
        title: 'Libro 2025',
        editions: [{ publicationDate: '2025-01-01' }],
      }),
      createOrderBook({
        id: 'book-2024',
        title: 'Libro 2024',
        editions: [{ publicationDate: '2024-01-01' }],
      }),
    ];

    const firstPage = sortBooks(books).slice(0, 2);

    expect(firstPage.map((book) => book.id)).toEqual(['book-2025', 'book-2024']);
  });

  it('builds the SQL order expressions used before limit and offset in the repository query', () => {
    expect(getPublicCatalogOrderByExpressions()).toHaveLength(4);
  });
});
