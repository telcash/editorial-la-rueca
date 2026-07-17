import { describe, expect, it } from 'vitest';

import {
  createBookSchema,
  isValidIsbn10,
  isValidIsbn13,
  normalizeBookSlug,
  normalizeIsbn10,
  normalizeIsbn13,
  updateBookSchema,
} from './book.schema';

const authorId = '550e8400-e29b-41d4-a716-446655440000';
const secondAuthorId = '1d2e4f8a-2a8a-42b9-8d1f-9c8a1f4c7b61';

const validEdition = {
  format: 'paperback',
  isbn10: '0-306-40615-2',
  isbn13: '978-0-306-40615-7',
};

const validBookInput = {
  title: ' El jardin perdido ',
  slug: ' El Jardin Perdido ',
  authorIds: [authorId],
  editions: [validEdition],
};

describe('book schema helpers', () => {
  it('normalizes slugs and ISBNs', () => {
    expect(normalizeBookSlug(' El_Jardin perdido!! ')).toBe('el-jardin-perdido');
    expect(normalizeIsbn10('0-9752298-0-x')).toBe('097522980X');
    expect(normalizeIsbn13('978-0-306-40615-7')).toBe('9780306406157');
  });

  it('validates ISBN checksums', () => {
    expect(isValidIsbn10('0306406152')).toBe(true);
    expect(isValidIsbn10('097522980X')).toBe(true);
    expect(isValidIsbn10('0306406153')).toBe(false);
    expect(isValidIsbn13('9780306406157')).toBe(true);
    expect(isValidIsbn13('9780306406158')).toBe(false);
  });
});

describe('createBookSchema', () => {
  it('requires, trims and normalizes core book fields', () => {
    const result = createBookSchema.parse({
      ...validBookInput,
      subtitle: '',
      description: '  descripcion  ',
      excerpt: '',
      coverUrl: '',
      originalPublicationDate: '',
      language: ' ES ',
      metaTitle: '',
      metaDescription: '',
      canonicalUrl: '',
    });

    expect(result).toMatchObject({
      title: 'El jardin perdido',
      slug: 'el-jardin-perdido',
      subtitle: null,
      description: 'descripcion',
      excerpt: null,
      coverUrl: null,
      originalPublicationDate: null,
      language: 'es',
      isFeatured: false,
      isPublished: false,
      sortOrder: 0,
      metaTitle: null,
      metaDescription: null,
      canonicalUrl: null,
    });
  });

  it('rejects invalid book fields', () => {
    expect(() => createBookSchema.parse({ ...validBookInput, title: '' })).toThrow();
    expect(() => createBookSchema.parse({ ...validBookInput, slug: '!!!' })).toThrow();
    expect(() => createBookSchema.parse({ ...validBookInput, language: 'spanish' })).toThrow();
    expect(() =>
      createBookSchema.parse({ ...validBookInput, canonicalUrl: 'not-a-url' }),
    ).toThrow();
  });

  it('requires authors and editions without duplicates', () => {
    expect(() => createBookSchema.parse({ ...validBookInput, authorIds: [] })).toThrow();
    expect(() =>
      createBookSchema.parse({ ...validBookInput, authorIds: [authorId, authorId] }),
    ).toThrow();
    expect(() => createBookSchema.parse({ ...validBookInput, editions: [] })).toThrow();
  });

  it('normalizes and validates edition fields', () => {
    const result = createBookSchema.parse({
      ...validBookInput,
      editions: [
        {
          format: ' PAPERBACK ',
          editionLabel: '',
          publicationDate: '',
          isbn10: '0-9752298-0-x',
          isbn13: '978-0-306-40615-7',
          price: '18,90',
          currency: 'eur',
          pages: '120',
          isAvailable: false,
          isFeatured: true,
          sortOrder: '2',
        },
      ],
    });

    expect(result.editions[0]).toMatchObject({
      format: 'paperback',
      editionLabel: null,
      publicationDate: null,
      isbn10: '097522980X',
      isbn13: '9780306406157',
      price: '18.90',
      currency: 'EUR',
      pages: 120,
      isAvailable: false,
      isFeatured: true,
      sortOrder: 2,
    });
  });

  it('rejects invalid edition fields', () => {
    expect(() =>
      createBookSchema.parse({ ...validBookInput, editions: [{ ...validEdition, format: 'pdf' }] }),
    ).toThrow();
    expect(() =>
      createBookSchema.parse({ ...validBookInput, editions: [{ ...validEdition, pages: '0' }] }),
    ).toThrow();
    expect(() =>
      createBookSchema.parse({ ...validBookInput, editions: [{ ...validEdition, pages: '-1' }] }),
    ).toThrow();
    expect(() =>
      createBookSchema.parse({ ...validBookInput, editions: [{ ...validEdition, pages: '1.5' }] }),
    ).toThrow();
    expect(() =>
      createBookSchema.parse({
        ...validBookInput,
        editions: [{ ...validEdition, currency: 'EUR' }],
      }),
    ).not.toThrow();
    expect(() =>
      createBookSchema.parse({ ...validBookInput, editions: [{ ...validEdition, currency: '€' }] }),
    ).toThrow();
    expect(() =>
      createBookSchema.parse({
        ...validBookInput,
        editions: [{ ...validEdition, price: '18.90' }],
      }),
    ).not.toThrow();
    expect(() =>
      createBookSchema.parse({ ...validBookInput, editions: [{ ...validEdition, price: '' }] }),
    ).not.toThrow();
    expect(() =>
      createBookSchema.parse({
        ...validBookInput,
        editions: [{ ...validEdition, price: '-2.00' }],
      }),
    ).toThrow();
    expect(() =>
      createBookSchema.parse({
        ...validBookInput,
        editions: [{ ...validEdition, price: '18.999' }],
      }),
    ).toThrow();
    expect(() =>
      createBookSchema.parse({ ...validBookInput, editions: [{ ...validEdition, isbn10: '123' }] }),
    ).toThrow();
    expect(() =>
      createBookSchema.parse({ ...validBookInput, editions: [{ ...validEdition, isbn13: '123' }] }),
    ).toThrow();
  });

  it('validates duplicate ISBNs while allowing repeated formats and empty ISBNs', () => {
    expect(() =>
      createBookSchema.parse({
        ...validBookInput,
        authorIds: [authorId, secondAuthorId],
        editions: [
          { format: 'paperback', isbn10: '0-306-40615-2' },
          { format: 'paperback', isbn10: '0306406152' },
        ],
      }),
    ).toThrow();
    expect(() =>
      createBookSchema.parse({
        ...validBookInput,
        editions: [
          { format: 'paperback', isbn13: '978-0-306-40615-7' },
          { format: 'hardcover', isbn13: '9780306406157' },
        ],
      }),
    ).toThrow();
    expect(() =>
      createBookSchema.parse({
        ...validBookInput,
        editions: [{ format: 'paperback' }, { format: 'paperback' }],
      }),
    ).not.toThrow();
  });
});

describe('updateBookSchema', () => {
  it('allows partial updates and rejects empty payloads', () => {
    expect(updateBookSchema.parse({ title: ' Nuevo titulo ' })).toMatchObject({
      title: 'Nuevo titulo',
    });
    expect(() => updateBookSchema.parse({})).toThrow();
  });

  it('does not allow empty relation arrays when present', () => {
    expect(() => updateBookSchema.parse({ authorIds: [] })).toThrow();
    expect(() => updateBookSchema.parse({ editions: [] })).toThrow();
  });
});
