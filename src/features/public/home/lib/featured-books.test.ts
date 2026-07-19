import { describe, expect, it } from 'vitest';

import type { BookWithDetails } from '@/services/books/book.types';
import { toFeaturedBook } from './featured-books';

const book: BookWithDetails = {
  id: '1a1b6d23-88aa-4a4f-a5a5-0aa6203da248',
  title: 'La ciudad despierta',
  subtitle: null,
  slug: 'la-ciudad-despierta',
  description: null,
  excerpt: null,
  coverUrl: 'https://example.com/storage/v1/object/public/book-covers/book.jpg',
  originalPublicationDate: null,
  language: 'es',
  isFeatured: true,
  isPublished: true,
  isArchived: false,
  archivedAt: null,
  sortOrder: 0,
  metaTitle: null,
  metaDescription: null,
  canonicalUrl: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  authors: [
    {
      id: '5e971ba3-7e53-41ed-8980-d57282f465f2',
      name: 'Ana Valverde',
      slug: 'ana-valverde',
      photoUrl: null,
      isArchived: false,
      sortOrder: 0,
    },
    {
      id: '430d1a2b-ff92-469d-a732-b1f89d22f243',
      name: 'Luis Ortega',
      slug: 'luis-ortega',
      photoUrl: null,
      isArchived: false,
      sortOrder: 1,
    },
  ],
  categories: [],
  editions: [],
};

describe('toFeaturedBook', () => {
  it('maps book details to the public carousel model preserving author order', () => {
    expect(toFeaturedBook(book)).toEqual({
      id: book.id,
      title: 'La ciudad despierta',
      slug: 'la-ciudad-despierta',
      coverUrl: 'https://example.com/storage/v1/object/public/book-covers/book.jpg',
      authors: ['Ana Valverde', 'Luis Ortega'],
    });
  });
});
