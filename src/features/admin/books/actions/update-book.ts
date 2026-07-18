'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { updateBookSchema } from '@/schemas/books/book.schema';
import { requireEditorialStaff } from '@/services/auth/access.service';
import * as BookService from '@/services/books/book.service';
import {
  getBookCoverFileFromFormData,
  getBookPayloadFromFormData,
  getRemoveExistingCoverFromFormData,
  isBookActionFormData,
} from '../lib/book-cover-form.helpers';
import { mapZodErrorToPaths, type UpdateBookFormPayload } from '../lib/book-edition-form.helpers';
import { mapCreateBookErrorToState } from '../lib/create-book-action-errors';
import {
  BookCoverDeleteError,
  BookCoverUploadError,
  InvalidBookCoverError,
} from '../services/book-cover-errors';
import { validateBookCoverFile } from '../services/book-cover-service.core';
import * as BookCoverService from '../services/book-cover-service';
import type { BookActionState } from '../types/create-book-action-state';

const bookIdSchema = z.string().uuid('El id del libro debe ser un UUID válido.');

function logBookCoverCleanupFailure(bookId: string, publicUrl: string, error: unknown) {
  console.error('[BookCoverService] Cleanup after cover persistence failure failed', {
    bookId,
    publicUrl,
    errorName: error instanceof Error ? error.name : undefined,
  });
}

export async function updateBookAction(
  bookId: string,
  input: UpdateBookFormPayload | FormData,
): Promise<BookActionState> {
  await requireEditorialStaff();
  const payload = isBookActionFormData(input)
    ? getBookPayloadFromFormData<UpdateBookFormPayload>(input)
    : input;
  const coverFile = isBookActionFormData(input) ? getBookCoverFileFromFormData(input) : null;
  const removeExistingCover = isBookActionFormData(input)
    ? getRemoveExistingCoverFromFormData(input)
    : false;

  const parsedBookId = bookIdSchema.safeParse(bookId);

  if (!parsedBookId.success) {
    return {
      success: false,
      pathErrors: {},
      formError: 'No se pudieron guardar los cambios. Inténtalo de nuevo.',
      authorsError: null,
      editionsError: null,
    };
  }

  const parsedPayload = updateBookSchema.safeParse(payload);

  if (!parsedPayload.success) {
    return {
      success: false,
      pathErrors: mapZodErrorToPaths(parsedPayload.error),
      formError: null,
      authorsError: null,
      editionsError: null,
    };
  }

  if (coverFile) {
    try {
      validateBookCoverFile(coverFile);
    } catch (error) {
      if (error instanceof InvalidBookCoverError) {
        return {
          success: false,
          pathErrors: {
            cover: error.message,
          },
          formError: null,
          authorsError: null,
          editionsError: null,
        };
      }

      throw error;
    }
  }

  try {
    await BookService.updateBook(parsedBookId.data, parsedPayload.data);
  } catch (error) {
    return mapCreateBookErrorToState(error, payload, { mode: 'edit' });
  }

  if (coverFile || removeExistingCover) {
    const currentBook = await BookService.getBookById(parsedBookId.data);
    const previousCoverUrl = currentBook.coverUrl;

    if (coverFile) {
      try {
        const uploadedCover = await BookCoverService.uploadBookCover(parsedBookId.data, coverFile);

        try {
          await BookService.updateBook(parsedBookId.data, {
            coverUrl: uploadedCover.publicUrl,
          });
        } catch (error) {
          try {
            await BookCoverService.deleteBookCover(uploadedCover.publicUrl);
          } catch (deleteError) {
            logBookCoverCleanupFailure(parsedBookId.data, uploadedCover.publicUrl, deleteError);
          }

          throw error;
        }

        try {
          await BookCoverService.deleteBookCover(previousCoverUrl);
        } catch (error) {
          if (!(error instanceof BookCoverDeleteError)) {
            throw error;
          }
        }
      } catch (error) {
        if (error instanceof InvalidBookCoverError || error instanceof BookCoverUploadError) {
          return {
            success: false,
            pathErrors: {},
            formError: 'No se pudo actualizar la portada. Inténtalo de nuevo.',
            authorsError: null,
            editionsError: null,
          };
        }

        return {
          success: false,
          pathErrors: {},
          formError: 'No se pudo actualizar la portada. Inténtalo de nuevo.',
          authorsError: null,
          editionsError: null,
        };
      }
    } else if (removeExistingCover && previousCoverUrl) {
      await BookService.updateBook(parsedBookId.data, {
        coverUrl: null,
      });

      try {
        await BookCoverService.deleteBookCover(previousCoverUrl);
      } catch (error) {
        if (!(error instanceof BookCoverDeleteError)) {
          throw error;
        }
      }
    }
  }

  revalidatePath('/admin/books');
  revalidatePath(`/admin/books/${parsedBookId.data}`);
  redirect('/admin/books');
}
