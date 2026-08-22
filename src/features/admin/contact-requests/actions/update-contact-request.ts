'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { ZodError } from 'zod';

import { updateContactRequestAdminSchema } from '@/schemas/contact-requests/contact-request.schema';
import { requireEditorialStaff } from '@/services/auth/access.service';
import {
  ContactRequestInvalidServiceError,
  ContactRequestNotFoundError,
} from '@/services/contact-requests/contact-request.errors';
import * as ContactRequestService from '@/services/contact-requests/contact-request.service';
import {
  getContactRequestAdminFormValues,
  getContactRequestAdminUpdateInput,
} from '../lib/contact-request-form-data';
import type { ContactRequestAdminFormState } from '../types/contact-request-admin-form-state';

export async function updateContactRequestAction(
  contactRequestId: string,
  _previousState: ContactRequestAdminFormState,
  formData: FormData,
): Promise<ContactRequestAdminFormState> {
  await requireEditorialStaff();

  const values = getContactRequestAdminFormValues(formData);
  const parsedInput = updateContactRequestAdminSchema.safeParse(
    getContactRequestAdminUpdateInput(formData),
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
    await ContactRequestService.updateContactRequest(contactRequestId, parsedInput.data);
  } catch (error) {
    if (error instanceof ContactRequestInvalidServiceError) {
      return {
        success: false,
        fieldErrors: {
          serviceId: ['Selecciona un servicio publicado y activo.'],
        },
        formError: null,
        values,
      };
    }

    if (error instanceof ContactRequestNotFoundError) {
      return {
        success: false,
        fieldErrors: {},
        formError: 'No se pudo encontrar la solicitud que intentas actualizar.',
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
      formError: 'No se pudo actualizar la solicitud. Inténtalo de nuevo.',
      values,
    };
  }

  revalidatePath('/admin/contact-requests');
  revalidatePath(`/admin/contact-requests/${contactRequestId}`);
  redirect(`/admin/contact-requests/${contactRequestId}?feedback=contactRequestUpdated`);
}
