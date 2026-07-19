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
  CategoryHasBooksError,
  CategoryMustBeArchivedError,
  CategoryNotFoundError,
} from '@/services/categories/category.errors';
import * as CategoryService from '@/services/categories/category.service';

const categoryIdSchema = z.string().uuid();

export async function deleteCategoryPermanentlyAction(
  categoryId: string,
  confirmation: string,
): Promise<PermanentDeleteActionState> {
  await requireAdmin();

  const parsedCategoryId = categoryIdSchema.safeParse(categoryId);

  if (!parsedCategoryId.success || !isPermanentDeleteConfirmationValid(confirmation)) {
    return {
      success: false,
      message: `Escribe ${PERMANENT_DELETE_CONFIRMATION} para confirmar la eliminación.`,
    };
  }

  try {
    await CategoryService.deleteCategoryPermanently(parsedCategoryId.data);
    revalidatePath('/admin/categories');

    return {
      success: true,
      message: null,
    };
  } catch (error) {
    if (error instanceof CategoryMustBeArchivedError) {
      return {
        success: false,
        message: 'Archiva la categoría antes de eliminarla definitivamente.',
      };
    }

    if (error instanceof CategoryHasBooksError) {
      const noun = error.bookCount === 1 ? 'libro' : 'libros';

      return {
        success: false,
        message: `La categoría está relacionada con ${error.bookCount} ${noun} y no puede eliminarse definitivamente.`,
      };
    }

    if (error instanceof CategoryNotFoundError) {
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
