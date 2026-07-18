'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { requireEditorialStaff } from '@/services/auth/access.service';
import * as BookService from '@/services/books/book.service';

const bookIdSchema = z.string().uuid();

export async function archiveBookAction(bookId: string): Promise<void> {
  await requireEditorialStaff();

  const validBookId = bookIdSchema.parse(bookId);

  await BookService.archiveBook(validBookId);
  revalidatePath('/admin/books');
  revalidatePath(`/admin/books/${validBookId}`);
}

export async function restoreBookAction(bookId: string): Promise<void> {
  await requireEditorialStaff();

  const validBookId = bookIdSchema.parse(bookId);

  await BookService.restoreBook(validBookId);
  revalidatePath('/admin/books');
  revalidatePath(`/admin/books/${validBookId}`);
}
