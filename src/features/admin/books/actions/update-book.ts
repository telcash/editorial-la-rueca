'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { updateBookSchema } from '@/schemas/books/book.schema';
import { requireEditorialStaff } from '@/services/auth/access.service';
import * as BookService from '@/services/books/book.service';
import { mapZodErrorToPaths, type UpdateBookFormPayload } from '../lib/book-edition-form.helpers';
import { mapCreateBookErrorToState } from '../lib/create-book-action-errors';
import type { BookActionState } from '../types/create-book-action-state';

const bookIdSchema = z.string().uuid('El id del libro debe ser un UUID válido.');

export async function updateBookAction(
  bookId: string,
  payload: UpdateBookFormPayload,
): Promise<BookActionState> {
  await requireEditorialStaff();

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

  try {
    await BookService.updateBook(parsedBookId.data, parsedPayload.data);
  } catch (error) {
    return mapCreateBookErrorToState(error, payload, { mode: 'edit' });
  }

  revalidatePath('/admin/books');
  revalidatePath(`/admin/books/${parsedBookId.data}`);
  redirect('/admin/books');
}
