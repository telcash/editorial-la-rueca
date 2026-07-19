import type { PublicContactFormValues } from '../types/contact-form-state';

export function getPublicContactFormValues(formData: FormData): PublicContactFormValues {
  return {
    name: String(formData.get('name') ?? ''),
    email: String(formData.get('email') ?? ''),
    phone: String(formData.get('phone') ?? ''),
    message: String(formData.get('message') ?? ''),
    privacyAccepted: formData.get('privacyAccepted') === 'true',
  };
}

export function getPublicContactInput(formData: FormData) {
  const values = getPublicContactFormValues(formData);

  return {
    name: values.name,
    email: values.email,
    phone: values.phone,
    message: values.message,
    privacyAccepted: values.privacyAccepted,
  };
}
