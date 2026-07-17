import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import {
  BookAuthorNotFoundError,
  BookIsbnConflictError,
  BookRequiresAuthorError,
  BookRequiresEditionError,
  BookSlugConflictError,
} from '@/services/books/book.errors';
import type { CreateBookFormPayload } from './book-edition-form.helpers';
import { mapCreateBookErrorToState } from './create-book-action-errors';

const payload: CreateBookFormPayload = {
  title: 'Libro',
  subtitle: '',
  slug: 'libro',
  description: '',
  excerpt: '',
  originalPublicationDate: '',
  language: '',
  isPublished: false,
  isFeatured: false,
  sortOrder: '0',
  metaTitle: '',
  metaDescription: '',
  canonicalUrl: '',
  authorIds: ['550e8400-e29b-41d4-a716-446655440000'],
  editions: [
    {
      format: 'paperback',
      editionLabel: '',
      publicationDate: '',
      isbn10: '0-306-40615-2',
      isbn13: '978-0-306-40615-7',
      price: '',
      currency: 'EUR',
      pages: '',
      isAvailable: true,
      isFeatured: false,
      sortOrder: '0',
    },
  ],
};

describe('mapCreateBookErrorToState', () => {
  it('maps known domain errors', () => {
    expect(
      mapCreateBookErrorToState(new BookSlugConflictError('libro'), payload).pathErrors,
    ).toEqual({
      slug: 'Ya existe un libro con este slug.',
    });
    expect(
      mapCreateBookErrorToState(
        new BookAuthorNotFoundError(['550e8400-e29b-41d4-a716-446655440000']),
        payload,
      ).authorsError,
    ).toBe('Uno o varios autores seleccionados ya no existen.');
    expect(mapCreateBookErrorToState(new BookRequiresAuthorError(), payload).authorsError).toBe(
      'Debe seleccionar al menos un autor.',
    );
    expect(mapCreateBookErrorToState(new BookRequiresEditionError(), payload).editionsError).toBe(
      'Debe añadir al menos una edición.',
    );
  });

  it('maps ISBN conflicts to the matching edition field', () => {
    expect(
      mapCreateBookErrorToState(new BookIsbnConflictError('isbn10', '0306406152'), payload)
        .pathErrors,
    ).toEqual({
      'editions.0.isbn10': 'Este ISBN ya está registrado en otra edición.',
    });
    expect(
      mapCreateBookErrorToState(new BookIsbnConflictError('isbn13', '9780306406157'), payload)
        .pathErrors,
    ).toEqual({
      'editions.0.isbn13': 'Este ISBN ya está registrado en otra edición.',
    });
  });

  it('maps Zod and unexpected errors safely', () => {
    const zodError = new z.ZodError([
      {
        code: 'custom',
        path: ['editions', 0, 'price'],
        message: 'Precio inválido',
      },
    ]);

    expect(mapCreateBookErrorToState(zodError, payload).pathErrors).toEqual({
      'editions.0.price': 'Precio inválido',
    });
    expect(mapCreateBookErrorToState(new Error('SQL detail'), payload).formError).toBe(
      'No se pudo crear el libro. Inténtalo de nuevo.',
    );
  });
});
