'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { ZodError } from 'zod';

import { createAuthorSchema } from '@/schemas/authors/author.schema';
import { requireEditorialStaff } from '@/services/auth/access.service';
import { AuthorSlugConflictError } from '@/services/authors/author.errors';
import * as AuthorService from '@/services/authors/author.service';
import {
  getAuthorCreateInput,
  getAuthorFormValues,
  getAuthorPhotoFile,
} from '../lib/author-form-data';
import { AuthorImageUploadError, InvalidAuthorImageError } from '../services/author-image-errors';
import { validateAuthorImageFile } from '../services/author-image-service.core';
import * as AuthorImageService from '../services/author-image-service';
import type { AuthorFormState } from '../types/author-form-state';

export async function createAuthor(
  _previousState: AuthorFormState,
  formData: FormData,
): Promise<AuthorFormState> {
  await requireEditorialStaff();

  const values = getAuthorFormValues(formData);
  const parsedInput = createAuthorSchema.safeParse(getAuthorCreateInput(formData));
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

  let createdAuthor: Awaited<ReturnType<typeof AuthorService.createAuthor>>;

  try {
    createdAuthor = await AuthorService.createAuthor(parsedInput.data);
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
      formError: 'No se pudo guardar el autor. Inténtalo de nuevo.',
      values,
    };
  }

  if (photoFile) {
    try {
      const uploadedImage = await AuthorImageService.uploadAuthorImage(createdAuthor.id, photoFile);

      await AuthorService.updateAuthor(createdAuthor.id, {
        photoUrl: uploadedImage.publicUrl,
      });
    } catch (error) {
      if (error instanceof InvalidAuthorImageError) {
        return {
          success: false,
          fieldErrors: {
            photo: [error.message],
          },
          formError: 'El autor fue creado, pero no se pudo subir la imagen.',
          values,
        };
      }

      if (error instanceof AuthorImageUploadError) {
        return {
          success: false,
          fieldErrors: {},
          formError: 'El autor fue creado, pero no se pudo subir la imagen.',
          values,
        };
      }

      return {
        success: false,
        fieldErrors: {},
        formError: 'El autor fue creado, pero no se pudo subir la imagen.',
        values,
      };
    }
  }

  revalidatePath('/admin/authors');
  redirect('/admin/authors');
}
