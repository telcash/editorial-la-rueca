'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { ZodError } from 'zod';

import { updateAuthorSchema } from '@/schemas/authors/author.schema';
import { requireEditorialStaff } from '@/services/auth/access.service';
import { AuthorNotFoundError, AuthorSlugConflictError } from '@/services/authors/author.errors';
import * as AuthorService from '@/services/authors/author.service';
import { getAuthorFormValues, getAuthorUpdateInput } from '../lib/author-form-data';
import type { AuthorFormState } from '../types/author-form-state';

export async function updateAuthor(
  authorId: string,
  _previousState: AuthorFormState,
  formData: FormData,
): Promise<AuthorFormState> {
  await requireEditorialStaff();

  const values = getAuthorFormValues(formData);
  const parsedInput = updateAuthorSchema.safeParse(getAuthorUpdateInput(formData));

  if (!parsedInput.success) {
    return {
      success: false,
      fieldErrors: parsedInput.error.flatten().fieldErrors,
      formError: null,
      values,
    };
  }

  try {
    await AuthorService.updateAuthor(authorId, parsedInput.data);
  } catch (error) {
    if (error instanceof AuthorSlugConflictError) {
      return {
        success: false,
        fieldErrors: {
          slug: ['Ya existe un autor con este slug.'],
        },
        formError: null,
        values,
      };
    }

    if (error instanceof AuthorNotFoundError) {
      return {
        success: false,
        fieldErrors: {},
        formError: 'No se pudo encontrar el autor que intentas actualizar.',
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
      formError: 'No se pudo actualizar el autor. Inténtalo de nuevo.',
      values,
    };
  }

  revalidatePath('/admin/authors');
  revalidatePath(`/admin/authors/${authorId}`);
  redirect('/admin/authors');
}
