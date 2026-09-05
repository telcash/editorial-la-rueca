'use server';

import { headers } from 'next/headers';

import { publicContactSchema } from '@/schemas/contact/contact.schema';
import {
  getContactRequestNotificationErrorMessage,
  sendContactRequestNotification,
} from '@/services/contact-requests/contact-request-notification';
import { ContactRequestInvalidServiceError } from '@/services/contact-requests/contact-request.errors';
import * as ContactRequestService from '@/services/contact-requests/contact-request.service';
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
      fieldErrors: {},
      formError: null,
      values: initialPublicContactFormValues,
    };
  }

  const rateLimitResult = await checkContactRateLimit(await headers());

  if (!rateLimitResult.allowed) {
    return {
      success: false,
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
      fieldErrors: parsedInput.error.flatten().fieldErrors,
      formError: null,
      values,
    };
  }

  let createdContactRequestId: string;

  try {
    const contactRequest = await ContactRequestService.createContactRequest({
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

    createdContactRequestId = contactRequest.id;
  } catch (error) {
    if (error instanceof ContactRequestInvalidServiceError) {
      return {
        success: false,
        fieldErrors: {
          serviceId: ['Selecciona un servicio disponible.'],
        },
        formError: null,
        values,
      };
    }

    return {
      success: false,
      fieldErrors: {},
      formError: 'No hemos podido enviar tu consulta. Inténtalo de nuevo.',
      values,
    };
  }

  let notificationResult: Awaited<ReturnType<typeof sendContactRequestNotification>>;

  try {
    const contactRequest =
      await ContactRequestService.getContactRequestById(createdContactRequestId);
    notificationResult = await sendContactRequestNotification(contactRequest);
  } catch (error) {
    const emailError = getContactRequestNotificationErrorMessage(error);

    try {
      await ContactRequestService.markContactRequestEmailNotificationFailed(
        createdContactRequestId,
        emailError,
      );
    } catch (markError) {
      console.error('[PublicContact] Contact request notification status update failed', {
        contactRequestId: createdContactRequestId,
        message: getContactRequestNotificationErrorMessage(markError),
      });
    }

    console.error('[PublicContact] Contact request notification failed', {
      contactRequestId: createdContactRequestId,
      message: emailError,
    });

    return {
      success: true,
      fieldErrors: {},
      formError: null,
      values: initialPublicContactFormValues,
    };
  }

  if (notificationResult.status === 'sent' && notificationResult.sentAt) {
    try {
      await ContactRequestService.markContactRequestEmailNotificationSent(
        createdContactRequestId,
        notificationResult.sentAt,
      );
    } catch (error) {
      console.error(
        '[PublicContact] Contact request notification sent but status confirmation failed',
        {
          contactRequestId: createdContactRequestId,
          message: getContactRequestNotificationErrorMessage(error),
        },
      );
    }
  }

  return {
    success: true,
    fieldErrors: {},
    formError: null,
    values: initialPublicContactFormValues,
  };
}
