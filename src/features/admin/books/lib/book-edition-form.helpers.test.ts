import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import type { BookFormAuthorSummary, BookGeneralFormValues } from '../types/book-form-state';
import { getAuthorIds } from './book-author-selection.helpers';
import {
  addEdition,
  buildCreateBookPayload,
  buildUpdateBookPayload,
  createEmptyEdition,
  mapZodIssuesToPaths,
  normalizeEditionOrder,
  removeEdition,
  updateEdition,
  validateUpdateBookPayload,
} from './book-edition-form.helpers';

const generalValues: BookGeneralFormValues = {
  title: 'El jardín perdido',
  subtitle: '',
  slug: 'el-jardin-perdido',
  description: '',
  excerpt: '',
  originalPublicationDate: '',
  language: 'es',
  isPublished: false,
  isFeatured: false,
  sortOrder: '0',
  metaTitle: '',
  metaDescription: '',
  canonicalUrl: '',
};

const authors: BookFormAuthorSummary[] = [
  {
    id: '550e8400-e29b-41d4-a716-446655440000',
    name: 'Autor C',
    slug: 'autor-c',
    photoUrl: null,
  },
  {
    id: '1d2e4f8a-2a8a-42b9-8d1f-9c8a1f4c7b61',
    name: 'Autor A',
    slug: 'autor-a',
    photoUrl: 'https://example.com/author.jpg',
  },
];

describe('edition form helpers', () => {
  it('creates empty editions with defaults and stable client IDs', () => {
    const firstEdition = createEmptyEdition(0, () => 'edition-1');
    const secondEdition = createEmptyEdition(1, () => 'edition-2');

    expect(firstEdition).toMatchObject({
      clientId: 'edition-1',
      format: 'paperback',
      editionLabel: '',
      publicationDate: '',
      isbn10: '',
      isbn13: '',
      price: '',
      currency: 'EUR',
      pages: '',
      isAvailable: true,
      isFeatured: false,
      sortOrder: '0',
    });
    expect(secondEdition.clientId).not.toBe(firstEdition.clientId);
  });

  it('adds, removes, updates and normalizes edition order', () => {
    const firstEdition = createEmptyEdition(5, () => 'edition-1');
    const addedEditions = addEdition([firstEdition], () => 'edition-2');

    expect(addedEditions.map((edition) => edition.clientId)).toEqual(['edition-1', 'edition-2']);
    expect(addedEditions.map((edition) => edition.sortOrder)).toEqual(['0', '1']);
    expect(updateEdition(addedEditions, 'edition-2', 'price', '18,90')[1]?.price).toBe('18,90');
    expect(updateEdition(addedEditions, 'edition-2', 'isAvailable', false)[1]?.isAvailable).toBe(
      false,
    );
    expect(removeEdition(addedEditions, 'edition-1')).toEqual([
      expect.objectContaining({ clientId: 'edition-2', sortOrder: '0' }),
    ]);
    expect(removeEdition(addedEditions, 'unknown')).toHaveLength(2);
    expect(normalizeEditionOrder([])).toEqual([]);
  });
});

describe('buildCreateBookPayload', () => {
  it('builds a payload without visual-only data', () => {
    const payload = buildCreateBookPayload(generalValues, authors, [
      {
        ...createEmptyEdition(0, () => 'edition-1'),
        price: '18,90',
        publicationDate: '2026-01-01',
      },
      {
        ...createEmptyEdition(1, () => 'edition-2'),
        format: 'ebook',
      },
    ]);

    expect(payload).toMatchObject({
      title: 'El jardín perdido',
      authorIds: ['550e8400-e29b-41d4-a716-446655440000', '1d2e4f8a-2a8a-42b9-8d1f-9c8a1f4c7b61'],
      editions: [
        expect.objectContaining({
          format: 'paperback',
          price: '18,90',
          publicationDate: '2026-01-01',
          sortOrder: '0',
        }),
        expect.objectContaining({
          format: 'ebook',
          sortOrder: '1',
        }),
      ],
    });
    expect(payload.editions[0]).not.toHaveProperty('clientId');
    expect(payload).not.toHaveProperty('authors');
    expect(getAuthorIds(authors)).toEqual(payload.authorIds);
  });
});

describe('buildUpdateBookPayload', () => {
  it('keeps author order and normalizes edition sort order', () => {
    const payload = buildUpdateBookPayload(generalValues, authors, [
      {
        ...createEmptyEdition(8, () => 'edition-1'),
        price: '18.90',
      },
      {
        ...createEmptyEdition(3, () => 'edition-2'),
        format: 'ebook',
        isbn13: '9780306406157',
      },
    ]);

    expect(payload.authorIds).toEqual([
      '550e8400-e29b-41d4-a716-446655440000',
      '1d2e4f8a-2a8a-42b9-8d1f-9c8a1f4c7b61',
    ]);
    expect(payload.editions.map((edition) => edition.sortOrder)).toEqual(['0', '1']);
    expect(validateUpdateBookPayload(payload)).toEqual({});
  });
});

describe('mapZodIssuesToPaths', () => {
  it('preserves simple and nested paths', () => {
    const schema = z.object({
      title: z.string().min(1, 'El título es obligatorio'),
      editions: z.array(
        z.object({
          price: z.string().regex(/^\d+$/, 'El precio no es válido'),
          isbn13: z.string().min(13, 'El ISBN-13 no es válido'),
        }),
      ),
    });
    const result = schema.safeParse({
      title: '',
      editions: [
        { price: 'abc', isbn13: '9780306406157' },
        { price: '18', isbn13: '123' },
      ],
    });

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(mapZodIssuesToPaths(result.error.issues)).toEqual({
        title: 'El título es obligatorio',
        'editions.0.price': 'El precio no es válido',
        'editions.1.isbn13': 'El ISBN-13 no es válido',
      });
    }
  });

  it('maps root issues to form', () => {
    expect(
      mapZodIssuesToPaths([
        {
          code: 'custom',
          path: [],
          message: 'Error general',
        },
      ]),
    ).toEqual({ form: 'Error general' });
  });
});
