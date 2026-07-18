'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import {
  isPermanentDeleteConfirmationValid,
  PERMANENT_DELETE_CONFIRMATION,
} from '@/features/admin/lib/permanent-delete-confirmation';
import type { PermanentDeleteActionState } from '@/features/admin/types/permanent-delete-action-state';
import { requireAdmin } from '@/services/auth/access.service';
import { BookMustBeArchivedError, BookNotFoundError } from '@/services/books/book.errors';
import * as BookService from '@/services/books/book.service';
import { BookCoverDeleteError } from '../services/book-cover-errors';
import * as BookCoverService from '../services/book-cover-service';

const bookIdSchema = z.string().uuid();

function logBookCoverOrphan(bookId: string, publicUrl: string, error: unknown) {
  console.error('[BookCoverService] Cleanup after permanent book delete failed', {
    bookId,
    publicUrl,
    errorName: error instanceof Error ? error.name : undefined,
  });
}

export async function deleteBookPermanentlyAction(
  bookId: string,
  confirmation: string,
): Promise<PermanentDeleteActionState> {
  await requireAdmin();

  const parsedBookId = bookIdSchema.safeParse(bookId);

  if (!parsedBookId.success || !isPermanentDeleteConfirmationValid(confirmation)) {
    return {
      success: false,
      message: `Escribe ${PERMANENT_DELETE_CONFIRMATION} para confirmar la eliminación.`,
    };
  }

  try {
    const deletedBook = await BookService.deleteBookPermanently(parsedBookId.data);

    if (deletedBook.coverUrl) {
      try {
        await BookCoverService.deleteBookCover(deletedBook.coverUrl);
      } catch (error) {
        if (error instanceof BookCoverDeleteError) {
          logBookCoverOrphan(parsedBookId.data, deletedBook.coverUrl, error);
        } else {
          logBookCoverOrphan(parsedBookId.data, deletedBook.coverUrl, error);
        }
      }
    }

    revalidatePath('/admin/books');

    return {
      success: true,
      message: null,
    };
  } catch (error) {
    if (error instanceof BookMustBeArchivedError) {
      return {
        success: false,
        message: 'Archiva el libro antes de eliminarlo definitivamente.',
      };
    }

    if (error instanceof BookNotFoundError) {
      return {
        success: false,
        message: 'El registro ya no existe.',
      };
    }

    return {
      success: false,
      message: 'No se pudo completar la eliminación.',
    };
  }
}
