'use server';

import { publicContactSchema } from '@/schemas/contact/contact.schema';
import { getPublicContactFormValues, getPublicContactInput } from '../lib/contact-form-data';
import type { PublicContactFormState } from '../types/contact-form-state';

export async function submitPublicContactAction(
  _previousState: PublicContactFormState,
  formData: FormData,
): Promise<PublicContactFormState> {
  const values = getPublicContactFormValues(formData);
  const parsedInput = publicContactSchema.safeParse(getPublicContactInput(formData));

  if (!parsedInput.success) {
    return {
      success: false,
      fieldErrors: parsedInput.error.flatten().fieldErrors,
      formError: null,
      values,
    };
  }

  // TODO: Integrar persistencia definitiva de leads y notificaciones cuando exista ese backend.
  return {
    success: true,
    fieldErrors: {},
    formError: null,
    values: {
      name: '',
      email: '',
      phone: '',
      message: '',
      privacyAccepted: false,
    },
  };
}
