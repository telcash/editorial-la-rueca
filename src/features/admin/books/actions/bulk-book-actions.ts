'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { requireEditorialStaff } from '@/services/auth/access.service';
import * as BookService from '@/services/books/book.service';
import type { BookBulkAction, BookBulkUpdateResult } from '@/services/books/book.types';

const bookBulkActionSchema = z.enum([
  'publish',
  'unpublish',
  'feature',
  'unfeature',
  'archive',
  'restore',
]);

export async function bulkUpdateBooksAction(
  bookIds: string[],
  action: BookBulkAction,
): Promise<BookBulkUpdateResult> {
  await requireEditorialStaff();
  const validAction = bookBulkActionSchema.parse(action);

  const result = await BookService.bulkUpdateBooks(bookIds, validAction);

  revalidatePath('/admin/books');

  return result;
}
