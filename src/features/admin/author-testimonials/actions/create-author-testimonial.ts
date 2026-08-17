'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { ZodError } from 'zod';

import { createAuthorTestimonialSchema } from '@/schemas/author-testimonials/author-testimonial.schema';
import { requireEditorialStaff } from '@/services/auth/access.service';
import {
  AuthorTestimonialAuthorNotFoundError,
  AuthorTestimonialBookNotFoundError,
} from '@/services/author-testimonials/author-testimonial.errors';
import * as AuthorTestimonialService from '@/services/author-testimonials/author-testimonial.service';
import {
  getAuthorTestimonialCreateInput,
  getAuthorTestimonialFormValues,
} from '../lib/author-testimonial-form-data';
import type { AuthorTestimonialFormState } from '../types/author-testimonial-form-state';

export async function createAuthorTestimonialAction(
  _previousState: AuthorTestimonialFormState,
  formData: FormData,
): Promise<AuthorTestimonialFormState> {
  await requireEditorialStaff();

  const values = getAuthorTestimonialFormValues(formData);
  const parsedInput = createAuthorTestimonialSchema.safeParse(
    getAuthorTestimonialCreateInput(formData),
  );

  if (!parsedInput.success) {
    return {
      success: false,
      fieldErrors: parsedInput.error.flatten().fieldErrors,
      formError: null,
      values,
    };
  }

  try {
    await AuthorTestimonialService.createTestimonial(parsedInput.data);
  } catch (error) {
    if (error instanceof AuthorTestimonialAuthorNotFoundError) {
      return {
        success: false,
        fieldErrors: { authorId: ['Selecciona un autor existente.'] },
        formError: null,
        values,
      };
    }

    if (error instanceof AuthorTestimonialBookNotFoundError) {
      return {
        success: false,
        fieldErrors: { bookId: ['Selecciona un libro existente o deja el campo vacío.'] },
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
      formError: 'No se pudo guardar el testimonio. Inténtalo de nuevo.',
      values,
    };
  }

  revalidatePath('/admin/testimonials');
  redirect('/admin/testimonials?feedback=testimonialCreated');
}
