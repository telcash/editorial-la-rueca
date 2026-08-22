'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { ZodError } from 'zod';

import { updateServiceSchema } from '@/schemas/editorial-services/editorial-service.schema';
import { requireEditorialStaff } from '@/services/auth/access.service';
import {
  EditorialServiceNotFoundError,
  EditorialServiceSlugConflictError,
} from '@/services/editorial-services/editorial-service.errors';
import * as EditorialServiceService from '@/services/editorial-services/editorial-service.service';
import { getServiceFormValues, getServiceUpdateInput } from '../lib/service-form-data';
import type { ServiceFormState } from '../types/service-form-state';

export async function updateServiceAction(
  serviceId: string,
  _previousState: ServiceFormState,
  formData: FormData,
): Promise<ServiceFormState> {
  await requireEditorialStaff();

  const values = getServiceFormValues(formData);
  const parsedInput = updateServiceSchema.safeParse(getServiceUpdateInput(formData));

  if (!parsedInput.success) {
    return {
      success: false,
      fieldErrors: parsedInput.error.flatten().fieldErrors,
      formError: null,
      values,
    };
  }

  try {
    await EditorialServiceService.updateService(serviceId, parsedInput.data);
  } catch (error) {
    if (error instanceof EditorialServiceSlugConflictError) {
      return {
        success: false,
        fieldErrors: {
          slug: ['Ya existe un servicio con este slug.'],
        },
        formError: null,
        values,
      };
    }

    if (error instanceof EditorialServiceNotFoundError) {
      return {
        success: false,
        fieldErrors: {},
        formError: 'No se pudo encontrar el servicio que intentas actualizar.',
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
      formError: 'No se pudo actualizar el servicio. Inténtalo de nuevo.',
      values,
    };
  }

  revalidatePath('/admin/services');
  revalidatePath(`/admin/services/${serviceId}`);
  redirect('/admin/services?feedback=serviceUpdated');
}
