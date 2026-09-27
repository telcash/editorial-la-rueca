'use server';

import { headers } from 'next/headers';

import { publicContactSchema } from '@/schemas/contact/contact.schema';
import { ContactRequestInvalidServiceError } from '@/services/contact-requests/contact-request.errors';
import { createAndNotifyContactRequest } from '@/services/contact-requests/create-and-notify-contact-request';
import { getPublicContactFormValues, getPublicContactInput } from '../lib/contact-form-data';
import { checkContactRateLimit } from '../lib/contact-rate-limit';
import {
  initialPublicContactFormValues,
  type PublicContactFormState,
} from '../types/contact-form-state';

export async function submitPublicContactAction(
  _previousState: PublicContactFormState,
  formData: FormData,
): Promise<PublicContactFormState> {
  const values = getPublicContactFormValues(formData);

  if (values.company.trim()) {
    return {
      success: true,
      contactRequestCreated: false,
      fieldErrors: {},
      formError: null,
      values: initialPublicContactFormValues,
    };
  }

  const rateLimitResult = await checkContactRateLimit(await headers());

  if (!rateLimitResult.allowed) {
    return {
      success: false,
      contactRequestCreated: false,
      fieldErrors: {},
      formError:
        'Has realizado varios envíos en poco tiempo. Espera unos minutos antes de intentarlo de nuevo.',
      values,
    };
  }

  const parsedInput = publicContactSchema.safeParse(getPublicContactInput(formData));

  if (!parsedInput.success) {
    return {
      success: false,
      contactRequestCreated: false,
      fieldErrors: parsedInput.error.flatten().fieldErrors,
      formError: null,
      values,
    };
  }

  let creationResult: Awaited<ReturnType<typeof createAndNotifyContactRequest>>;
  try {
    creationResult = await createAndNotifyContactRequest({
      name: parsedInput.data.name,
      email: parsedInput.data.email,
      phone: parsedInput.data.phone,
      province: parsedInput.data.province,
      serviceId: parsedInput.data.serviceId,
      message: parsedInput.data.message,
      source: 'website',
      utmSource: parsedInput.data.utmSource ?? null,
      utmMedium: parsedInput.data.utmMedium ?? null,
      utmCampaign: parsedInput.data.utmCampaign ?? null,
      utmContent: parsedInput.data.utmContent ?? null,
      utmTerm: parsedInput.data.utmTerm ?? null,
    });
  } catch (error) {
    if (error instanceof ContactRequestInvalidServiceError) {
      return {
        success: false,
        contactRequestCreated: false,
        fieldErrors: {
          serviceId: ['Selecciona un servicio disponible.'],
        },
        formError: null,
        values,
      };
    }

    return {
      success: false,
      contactRequestCreated: false,
      fieldErrors: {},
      formError: 'No hemos podido enviar tu consulta. Inténtalo de nuevo.',
      values,
    };
  }

  return {
    success: true,
    contactRequestCreated: creationResult.status === 'created',
    fieldErrors: {},
    formError: null,
    values: initialPublicContactFormValues,
  };
}
