'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import {
  isPermanentDeleteConfirmationValid,
  PERMANENT_DELETE_CONFIRMATION,
} from '@/features/admin/lib/permanent-delete-confirmation';
import type { PermanentDeleteActionState } from '@/features/admin/types/permanent-delete-action-state';
import { requireAdmin } from '@/services/auth/access.service';
import {
  AuthorHasBooksError,
  AuthorMustBeArchivedError,
  AuthorNotFoundError,
} from '@/services/authors/author.errors';
import * as AuthorService from '@/services/authors/author.service';
import { AuthorImageDeleteError } from '../services/author-image-errors';
import { getAuthorImagePathFromPublicUrl } from '../services/author-image-service.core';
import * as AuthorImageService from '../services/author-image-service';

const authorIdSchema = z.string().uuid();

function logAuthorImageOrphan(authorId: string, path: string, error: unknown) {
  console.error('[AuthorImageService] Cleanup after permanent author delete failed', {
    authorId,
    path,
    errorName: error instanceof Error ? error.name : undefined,
  });
}

export async function deleteAuthorPermanentlyAction(
  authorId: string,
  confirmation: string,
): Promise<PermanentDeleteActionState> {
  await requireAdmin();

  const parsedAuthorId = authorIdSchema.safeParse(authorId);

  if (!parsedAuthorId.success || !isPermanentDeleteConfirmationValid(confirmation)) {
    return {
      success: false,
      message: `Escribe ${PERMANENT_DELETE_CONFIRMATION} para confirmar la eliminación.`,
    };
  }

  try {
    const deletedAuthor = await AuthorService.deleteAuthorPermanently(parsedAuthorId.data);
    const imagePath = getAuthorImagePathFromPublicUrl(deletedAuthor.photoUrl);

    if (imagePath) {
      try {
        await AuthorImageService.deleteAuthorImage(imagePath);
      } catch (error) {
        if (error instanceof AuthorImageDeleteError) {
          logAuthorImageOrphan(parsedAuthorId.data, imagePath, error);
        } else {
          logAuthorImageOrphan(parsedAuthorId.data, imagePath, error);
        }
      }
    }

    revalidatePath('/admin/authors');

    return {
      success: true,
      message: null,
    };
  } catch (error) {
    if (error instanceof AuthorMustBeArchivedError) {
      return {
        success: false,
        message: 'Archiva el autor antes de eliminarlo definitivamente.',
      };
    }

    if (error instanceof AuthorHasBooksError) {
      const noun = error.bookCount === 1 ? 'libro' : 'libros';

      return {
        success: false,
        message: `El autor está relacionado con ${error.bookCount} ${noun} y no puede eliminarse.`,
      };
    }

    if (error instanceof AuthorNotFoundError) {
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
