'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import {
  isPermanentDeleteConfirmationValid,
  PERMANENT_DELETE_CONFIRMATION,
} from '@/features/admin/lib/permanent-delete-confirmation';
import type { PermanentDeleteActionState } from '@/features/admin/types/permanent-delete-action-state';
import { requireAdmin } from '@/services/auth/access.service';
import { AuthorTestimonialNotFoundError } from '@/services/author-testimonials/author-testimonial.errors';
import * as AuthorTestimonialService from '@/services/author-testimonials/author-testimonial.service';

const testimonialIdSchema = z.string().uuid();

export async function deleteAuthorTestimonialAction(
  testimonialId: string,
  confirmation: string,
): Promise<PermanentDeleteActionState> {
  await requireAdmin();

  const parsedTestimonialId = testimonialIdSchema.safeParse(testimonialId);

  if (!parsedTestimonialId.success || !isPermanentDeleteConfirmationValid(confirmation)) {
    return {
      success: false,
      message: `Escribe ${PERMANENT_DELETE_CONFIRMATION} para confirmar la eliminación.`,
    };
  }

  try {
    await AuthorTestimonialService.deleteTestimonial(parsedTestimonialId.data);
    revalidatePath('/admin/testimonials');

    return {
      success: true,
      message: null,
    };
  } catch (error) {
    if (error instanceof AuthorTestimonialNotFoundError) {
      return {
        success: false,
        message: 'El testimonio ya no existe.',
      };
    }

    return {
      success: false,
      message: 'No se pudo completar la eliminación.',
    };
  }
}
