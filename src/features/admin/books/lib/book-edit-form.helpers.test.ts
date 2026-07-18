import { describe, expect, it } from 'vitest';

import type { BookWithDetails } from '@/services/books/book.types';
import { createEmptyEdition } from './book-edition-form.helpers';
import {
  isBookFormDirty,
  mapBookToFormInitialValues,
  mergeAvailableAuthors,
} from './book-edit-form.helpers';

const book: BookWithDetails = {
  id: '7a7f6a8d-3c9c-4f5a-9a11-5ad4e5cfe001',
  title: 'Libro editado',
  subtitle: null,
  slug: 'libro-editado',
  description: 'Descripción',
  excerpt: null,
  coverUrl: null,
  originalPublicationDate: '2024-05-12',
  language: 'es',
  isFeatured: true,
  isPublished: false,
  sortOrder: 4,
  metaTitle: null,
  metaDescription: null,
  canonicalUrl: null,
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2024-01-02T00:00:00.000Z'),
  authors: [
    {
      id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Segundo autor',
      slug: 'segundo-autor',
      photoUrl: null,
      sortOrder: 1,
    },
    {
      id: '1d2e4f8a-2a8a-42b9-8d1f-9c8a1f4c7b61',
      name: 'Primer autor',
      slug: 'primer-autor',
      photoUrl: 'https://example.com/author.jpg',
      sortOrder: 0,
    },
  ],
  editions: [
    {
      id: 'c1e5fb46-df62-4c72-946a-f55c03b6a001',
      bookId: '7a7f6a8d-3c9c-4f5a-9a11-5ad4e5cfe001',
      format: 'ebook',
      editionLabel: null,
      publicationDate: null,
      isbn10: null,
      isbn13: '9780306406157',
      price: null,
      currency: 'EUR',
      pages: null,
      isAvailable: true,
      isFeatured: false,
      sortOrder: 1,
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      updatedAt: new Date('2024-01-02T00:00:00.000Z'),
    },
    {
      id: 'c1e5fb46-df62-4c72-946a-f55c03b6a000',
      bookId: '7a7f6a8d-3c9c-4f5a-9a11-5ad4e5cfe001',
      format: 'paperback',
      editionLabel: 'Primera edición',
      publicationDate: '2024-06-01',
      isbn10: '0306406152',
      isbn13: null,
      price: '18.90',
      currency: 'EUR',
      pages: 240,
      isAvailable: false,
      isFeatured: true,
      sortOrder: 0,
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      updatedAt: new Date('2024-01-02T00:00:00.000Z'),
    },
  ],
};

describe('book edit form helpers', () => {
  it('maps a book with details to form initial values', () => {
    const initialValues = mapBookToFormInitialValues(book);

    expect(initialValues.general).toMatchObject({
      title: 'Libro editado',
      subtitle: '',
      slug: 'libro-editado',
      originalPublicationDate: '2024-05-12',
      language: 'es',
      isFeatured: true,
      isPublished: false,
      sortOrder: '4',
      metaTitle: '',
    });
    expect(initialValues.selectedAuthors.map((author) => author.name)).toEqual([
      'Primer autor',
      'Segundo autor',
    ]);
    expect(initialValues.editions).toEqual([
      expect.objectContaining({
        clientId: 'existing-c1e5fb46-df62-4c72-946a-f55c03b6a000',
        format: 'paperback',
        editionLabel: 'Primera edición',
        publicationDate: '2024-06-01',
        pages: '240',
        sortOrder: '0',
      }),
      expect.objectContaining({
        clientId: 'existing-c1e5fb46-df62-4c72-946a-f55c03b6a001',
        format: 'ebook',
        editionLabel: '',
        pages: '',
        sortOrder: '1',
      }),
    ]);
  });

  it('keeps selected authors available when they are missing from the current list', () => {
    const selectedAuthors = mapBookToFormInitialValues(book).selectedAuthors;
    const mergedAuthors = mergeAvailableAuthors([selectedAuthors[0]!], selectedAuthors);

    expect(mergedAuthors.map((author) => author.id)).toEqual([
      '1d2e4f8a-2a8a-42b9-8d1f-9c8a1f4c7b61',
      '550e8400-e29b-41d4-a716-446655440000',
    ]);
  });

  it('detects dirty state while ignoring visual edition client IDs', () => {
    const initialValues = mapBookToFormInitialValues(book);

    expect(
      isBookFormDirty(initialValues, {
        ...initialValues,
        editions: initialValues.editions.map((edition, index) => ({
          ...edition,
          clientId: `new-client-${index}`,
        })),
      }),
    ).toBe(false);
    expect(
      isBookFormDirty(initialValues, {
        ...initialValues,
        editions: [createEmptyEdition(0, () => 'replacement')],
      }),
    ).toBe(true);
  });
});
