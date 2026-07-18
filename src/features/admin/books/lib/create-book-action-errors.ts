import { ZodError } from 'zod';

import { normalizeIsbn10, normalizeIsbn13 } from '@/schemas/books/book.schema';
import {
  ArchivedBookAuthorError,
  BookAuthorNotFoundError,
  BookEditionNotFoundError,
  BookIsbnConflictError,
  BookNotFoundError,
  BookRequiresAuthorError,
  BookRequiresEditionError,
  BookSlugConflictError,
  DuplicateBookAuthorError,
} from '@/services/books/book.errors';
import type { BookActionState } from '../types/create-book-action-state';
import type { CreateBookFormPayload } from './book-edition-form.helpers';
import { mapZodErrorToPaths } from './book-edition-form.helpers';

interface MapBookErrorOptions {
  mode: 'create' | 'edit';
}

export function createBookActionErrorState(
  formError: string | null,
  pathErrors: Record<string, string> = {},
  authorsError: string | null = null,
  editionsError: string | null = null,
): BookActionState {
  return {
    success: false,
    pathErrors,
    formError,
    authorsError,
    editionsError,
  };
}

function getIsbnConflictPath(error: BookIsbnConflictError, payload: CreateBookFormPayload): string {
  const normalizedValue =
    error.isbnType === 'isbn10' ? normalizeIsbn10(error.value) : normalizeIsbn13(error.value);
  const editionIndex = payload.editions.findIndex((edition) => {
    const editionValue = edition[error.isbnType];

    if (!editionValue) {
      return false;
    }

    return error.isbnType === 'isbn10'
      ? normalizeIsbn10(editionValue) === normalizedValue
      : normalizeIsbn13(editionValue) === normalizedValue;
  });

  return editionIndex >= 0 ? `editions.${editionIndex}.${error.isbnType}` : 'editions';
}

export function mapCreateBookErrorToState(
  error: unknown,
  payload: CreateBookFormPayload,
  options: MapBookErrorOptions = { mode: 'create' },
): BookActionState {
  if (error instanceof BookSlugConflictError) {
    return createBookActionErrorState(null, {
      slug:
        options.mode === 'edit'
          ? 'Ya existe otro libro con este slug.'
          : 'Ya existe un libro con este slug.',
    });
  }

  if (
    error instanceof BookAuthorNotFoundError ||
    error instanceof DuplicateBookAuthorError ||
    error instanceof ArchivedBookAuthorError
  ) {
    return createBookActionErrorState(
      null,
      {},
      error instanceof ArchivedBookAuthorError
        ? 'No puedes añadir autores archivados a un libro.'
        : 'Uno o varios autores seleccionados ya no existen.',
    );
  }

  if (error instanceof BookIsbnConflictError) {
    return createBookActionErrorState(null, {
      [getIsbnConflictPath(error, payload)]: 'Este ISBN ya está registrado en otra edición.',
    });
  }

  if (error instanceof BookRequiresAuthorError) {
    return createBookActionErrorState(null, {}, 'Debe seleccionar al menos un autor.');
  }

  if (error instanceof BookRequiresEditionError) {
    return createBookActionErrorState(null, {}, null, 'Debe añadir al menos una edición.');
  }

  if (error instanceof BookNotFoundError) {
    return createBookActionErrorState(
      options.mode === 'edit'
        ? 'Este libro ya no existe.'
        : 'No se pudo crear el libro. Inténtalo de nuevo.',
    );
  }

  if (error instanceof BookEditionNotFoundError) {
    return createBookActionErrorState(
      options.mode === 'edit'
        ? 'No se pudieron guardar los cambios. Inténtalo de nuevo.'
        : 'No se pudo crear el libro. Inténtalo de nuevo.',
    );
  }

  if (error instanceof ZodError) {
    return createBookActionErrorState(null, mapZodErrorToPaths(error));
  }

  return createBookActionErrorState(
    options.mode === 'edit'
      ? 'No se pudieron guardar los cambios. Inténtalo de nuevo.'
      : 'No se pudo crear el libro. Inténtalo de nuevo.',
  );
}
