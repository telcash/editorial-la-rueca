'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { ZodError } from 'zod';

import { createServiceSchema } from '@/schemas/editorial-services/editorial-service.schema';
import { requireEditorialStaff } from '@/services/auth/access.service';
import { EditorialServiceSlugConflictError } from '@/services/editorial-services/editorial-service.errors';
import * as EditorialServiceService from '@/services/editorial-services/editorial-service.service';
import { getServiceCreateInput, getServiceFormValues } from '../lib/service-form-data';
import type { ServiceFormState } from '../types/service-form-state';

export async function createServiceAction(
  _previousState: ServiceFormState,
  formData: FormData,
): Promise<ServiceFormState> {
  await requireEditorialStaff();

  const values = getServiceFormValues(formData);
  const parsedInput = createServiceSchema.safeParse(getServiceCreateInput(formData));

  if (!parsedInput.success) {
    return {
      success: false,
      fieldErrors: parsedInput.error.flatten().fieldErrors,
      formError: null,
      values,
    };
  }

  try {
    await EditorialServiceService.createService(parsedInput.data);
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
      formError: 'No se pudo guardar el servicio. Inténtalo de nuevo.',
      values,
    };
  }

  revalidatePath('/admin/services');
  redirect('/admin/services?feedback=serviceCreated');
}
