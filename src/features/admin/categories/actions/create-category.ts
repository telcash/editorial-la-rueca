'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { ZodError } from 'zod';

import { createCategorySchema } from '@/schemas/categories/category.schema';
import { requireEditorialStaff } from '@/services/auth/access.service';
import { CategorySlugConflictError } from '@/services/categories/category.errors';
import * as CategoryService from '@/services/categories/category.service';
import { getCategoryCreateInput, getCategoryFormValues } from '../lib/category-form-data';
import type { CategoryFormState } from '../types/category-form-state';

export async function createCategoryAction(
  _previousState: CategoryFormState,
  formData: FormData,
): Promise<CategoryFormState> {
  await requireEditorialStaff();

  const values = getCategoryFormValues(formData);
  const parsedInput = createCategorySchema.safeParse(getCategoryCreateInput(formData));

  if (!parsedInput.success) {
    return {
      success: false,
      fieldErrors: parsedInput.error.flatten().fieldErrors,
      formError: null,
      values,
    };
  }

  try {
    await CategoryService.createCategory(parsedInput.data);
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
      formError: 'No se pudo guardar la categoría. Inténtalo de nuevo.',
      values,
    };
  }

  revalidatePath('/admin/categories');
  redirect('/admin/categories');
}
