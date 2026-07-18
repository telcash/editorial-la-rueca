'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { ZodError } from 'zod';

import { updateAuthorSchema } from '@/schemas/authors/author.schema';
import { requireEditorialStaff } from '@/services/auth/access.service';
import { AuthorNotFoundError, AuthorSlugConflictError } from '@/services/authors/author.errors';
import * as AuthorService from '@/services/authors/author.service';
import {
  getAuthorFormValues,
  getAuthorPhotoFile,
  getAuthorUpdateInput,
} from '../lib/author-form-data';
import { AuthorImageUploadError, InvalidAuthorImageError } from '../services/author-image-errors';
import {
  getAuthorImagePathFromPublicUrl,
  validateAuthorImageFile,
} from '../services/author-image-service.core';
import * as AuthorImageService from '../services/author-image-service';
import type { AuthorFormState } from '../types/author-form-state';

export async function updateAuthor(
  authorId: string,
  _previousState: AuthorFormState,
  formData: FormData,
): Promise<AuthorFormState> {
  await requireEditorialStaff();

  let currentAuthor: Awaited<ReturnType<typeof AuthorService.getAuthorById>>;

  try {
    currentAuthor = await AuthorService.getAuthorById(authorId);
  } catch (error) {
    if (error instanceof AuthorNotFoundError) {
      const values = getAuthorFormValues(formData);

      return {
        success: false,
        fieldErrors: {},
        formError: 'No se pudo encontrar el autor que intentas actualizar.',
        values,
      };
    }

    throw error;
  }

  const values = {
    ...getAuthorFormValues(formData, { defaultSortOrder: currentAuthor.sortOrder }),
    photoUrl: currentAuthor.photoUrl ?? '',
  };
  const parsedInput = updateAuthorSchema.safeParse(
    getAuthorUpdateInput(formData, { defaultSortOrder: currentAuthor.sortOrder }),
  );
  const photoFile = getAuthorPhotoFile(formData);

  if (!parsedInput.success) {
    return {
      success: false,
      fieldErrors: parsedInput.error.flatten().fieldErrors,
      formError: null,
      values,
    };
  }

  if (photoFile) {
    try {
      validateAuthorImageFile(photoFile);
    } catch (error) {
      if (error instanceof InvalidAuthorImageError) {
        return {
          success: false,
          fieldErrors: {
            photo: [error.message],
          },
          formError: null,
          values,
        };
      }

      throw error;
    }
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

  if (photoFile) {
    try {
      const previousPath = getAuthorImagePathFromPublicUrl(currentAuthor.photoUrl);
      const uploadedImage = await AuthorImageService.replaceAuthorImage(
        authorId,
        photoFile,
        previousPath,
      );

      await AuthorService.updateAuthor(authorId, {
        photoUrl: uploadedImage.publicUrl,
      });
    } catch (error) {
      if (error instanceof InvalidAuthorImageError) {
        return {
          success: false,
          fieldErrors: {
            photo: [error.message],
          },
          formError: null,
          values,
        };
      }

      if (error instanceof AuthorImageUploadError) {
        return {
          success: false,
          fieldErrors: {},
          formError: 'No se pudo actualizar la foto del autor. Inténtalo de nuevo.',
          values,
        };
      }

      return {
        success: false,
        fieldErrors: {},
        formError: 'No se pudo actualizar la foto del autor. Inténtalo de nuevo.',
        values,
      };
    }
  }

  revalidatePath('/admin/authors');
  revalidatePath(`/admin/authors/${authorId}`);
  redirect('/admin/authors');
}
