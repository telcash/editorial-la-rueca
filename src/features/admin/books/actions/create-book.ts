'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { createBookSchema } from '@/schemas/books/book.schema';
import { requireEditorialStaff } from '@/services/auth/access.service';
import * as BookService from '@/services/books/book.service';
import {
  getBookCoverFileFromFormData,
  getBookPayloadFromFormData,
  isBookActionFormData,
} from '../lib/book-cover-form.helpers';
import { mapCreateBookErrorToState } from '../lib/create-book-action-errors';
import { mapZodErrorToPaths, type CreateBookFormPayload } from '../lib/book-edition-form.helpers';
import {
  BookCoverDeleteError,
  BookCoverUploadError,
  InvalidBookCoverError,
} from '../services/book-cover-errors';
import { validateBookCoverFile } from '../services/book-cover-service.core';
import * as BookCoverService from '../services/book-cover-service';
import type { CreateBookActionState } from '../types/create-book-action-state';

function logBookCoverCleanupFailure(bookId: string, publicUrl: string, error: unknown) {
  console.error('[BookCoverService] Cleanup after cover persistence failure failed', {
    bookId,
    publicUrl,
    errorName: error instanceof Error ? error.name : undefined,
  });
}

export async function createBookAction(
  input: CreateBookFormPayload | FormData,
): Promise<CreateBookActionState> {
  await requireEditorialStaff();

  const payload = isBookActionFormData(input)
    ? getBookPayloadFromFormData<CreateBookFormPayload>(input)
    : input;
  const coverFile = isBookActionFormData(input) ? getBookCoverFileFromFormData(input) : null;
  const parsedPayload = createBookSchema.safeParse(payload);

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

  let createdBook: Awaited<ReturnType<typeof BookService.createBook>>;

  try {
    createdBook = await BookService.createBook(parsedPayload.data);
  } catch (error) {
    return mapCreateBookErrorToState(error, payload);
  }

  if (coverFile) {
    let uploadedCover: Awaited<ReturnType<typeof BookCoverService.uploadBookCover>>;

    try {
      uploadedCover = await BookCoverService.uploadBookCover(createdBook.id, coverFile);
    } catch (error) {
      if (error instanceof InvalidBookCoverError || error instanceof BookCoverUploadError) {
        revalidatePath('/admin/books');
        redirect(`/admin/books/${createdBook.id}?coverUpload=failed`);
      }

      return {
        success: false,
        pathErrors: {},
        formError: 'El libro fue creado, pero no se pudo subir la portada.',
        authorsError: null,
        editionsError: null,
      };
    }

    try {
      await BookService.updateBook(createdBook.id, {
        coverUrl: uploadedCover.publicUrl,
      });
    } catch {
      try {
        await BookCoverService.deleteBookCover(uploadedCover.publicUrl);
      } catch (deleteError) {
        if (deleteError instanceof BookCoverDeleteError) {
          logBookCoverCleanupFailure(createdBook.id, uploadedCover.publicUrl, deleteError);
        } else {
          logBookCoverCleanupFailure(createdBook.id, uploadedCover.publicUrl, deleteError);
        }
      }

      return {
        success: false,
        pathErrors: {},
        formError: 'No se pudo guardar la portada del libro. Inténtalo de nuevo.',
        authorsError: null,
        editionsError: null,
      };
    }
  }

  revalidatePath('/admin/books');
  redirect('/admin/books');
}
