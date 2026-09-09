'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import {
  isPermanentDeleteConfirmationValid,
  PERMANENT_DELETE_CONFIRMATION,
} from '@/features/admin/lib/permanent-delete-confirmation';
import type { PermanentDeleteActionState } from '@/features/admin/types/permanent-delete-action-state';
import { requireAdmin } from '@/services/auth/access.service';
import { ContactRequestNotFoundError } from '@/services/contact-requests/contact-request.errors';
import * as ContactRequestService from '@/services/contact-requests/contact-request.service';

const contactRequestIdSchema = z.string().uuid();

export async function deleteContactRequestPermanentlyAction(
  contactRequestId: string,
  confirmation: string,
): Promise<PermanentDeleteActionState> {
  await requireAdmin();

  const parsedContactRequestId = contactRequestIdSchema.safeParse(contactRequestId);

  if (!parsedContactRequestId.success || !isPermanentDeleteConfirmationValid(confirmation)) {
    return {
      success: false,
      message: `Escribe ${PERMANENT_DELETE_CONFIRMATION} para confirmar la eliminación.`,
    };
  }

  try {
    await ContactRequestService.deleteContactRequestPermanently(parsedContactRequestId.data);
  } catch (error) {
    if (error instanceof ContactRequestNotFoundError) {
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

  revalidatePath('/admin/contact-requests');
  revalidatePath('/admin/contact-requests/analytics');
  redirect('/admin/contact-requests?feedback=contactRequestDeleted');

  return {
    success: true,
    message: null,
  };
}
