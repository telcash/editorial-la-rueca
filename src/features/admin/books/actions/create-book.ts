'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { createBookSchema } from '@/schemas/books/book.schema';
import { requireEditorialStaff } from '@/services/auth/access.service';
import * as BookService from '@/services/books/book.service';
import { mapCreateBookErrorToState } from '../lib/create-book-action-errors';
import { mapZodErrorToPaths, type CreateBookFormPayload } from '../lib/book-edition-form.helpers';
import type { CreateBookActionState } from '../types/create-book-action-state';

export async function createBookAction(
  payload: CreateBookFormPayload,
): Promise<CreateBookActionState> {
  await requireEditorialStaff();

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

  try {
    await BookService.createBook(parsedPayload.data);
  } catch (error) {
    return mapCreateBookErrorToState(error, payload);
  }

  revalidatePath('/admin/books');
  redirect('/admin/books');
}
