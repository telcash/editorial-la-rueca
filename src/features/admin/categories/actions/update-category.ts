'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { ZodError } from 'zod';

import { updateCategorySchema } from '@/schemas/categories/category.schema';
import { requireEditorialStaff } from '@/services/auth/access.service';
import {
  CategoryNotFoundError,
  CategorySlugConflictError,
} from '@/services/categories/category.errors';
import * as CategoryService from '@/services/categories/category.service';
import { getCategoryFormValues, getCategoryUpdateInput } from '../lib/category-form-data';
import type { CategoryFormState } from '../types/category-form-state';

export async function updateCategoryAction(
  categoryId: string,
  _previousState: CategoryFormState,
  formData: FormData,
): Promise<CategoryFormState> {
  await requireEditorialStaff();

  const values = getCategoryFormValues(formData);
  const parsedInput = updateCategorySchema.safeParse(getCategoryUpdateInput(formData));

  if (!parsedInput.success) {
    return {
      success: false,
      fieldErrors: parsedInput.error.flatten().fieldErrors,
      formError: null,
      values,
    };
  }

  try {
    await CategoryService.updateCategory(categoryId, parsedInput.data);
  } catch (error) {
    if (error instanceof CategorySlugConflictError) {
      return {
        success: false,
        fieldErrors: {
          slug: ['Ya existe una categoría con este slug.'],
        },
        formError: null,
        values,
      };
    }

    if (error instanceof CategoryNotFoundError) {
      return {
        success: false,
        fieldErrors: {},
        formError: 'No se pudo encontrar la categoría que intentas actualizar.',
        values,
      };
    }

    if (error instanceof ZodError) {
      return {
        success: false,
        fieldErrors: error.flatten().fieldErrors,
        formError: null,
        values,
      };
    }

    return {
      success: false,
      fieldErrors: {},
      formError: 'No se pudo actualizar la categoría. Inténtalo de nuevo.',
      values,
    };
  }

  revalidatePath('/admin/categories');
  revalidatePath(`/admin/categories/${categoryId}`);
  redirect('/admin/categories');
}
