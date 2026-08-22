import type { PublicContactFormValues } from '../types/contact-form-state';

export function getPublicContactFormValues(formData: FormData): PublicContactFormValues {
  return {
    name: String(formData.get('name') ?? ''),
    email: String(formData.get('email') ?? ''),
    phone: String(formData.get('phone') ?? ''),
    province: String(formData.get('province') ?? ''),
    serviceId: String(formData.get('serviceId') ?? ''),
    message: String(formData.get('message') ?? ''),
    privacyAccepted: formData.get('privacyAccepted') === 'true',
    company: String(formData.get('company') ?? ''),
  };
}

export function getPublicContactInput(formData: FormData) {
  const values = getPublicContactFormValues(formData);

  return {
    name: values.name,
    email: values.email,
    phone: values.phone,
    province: values.province,
    serviceId: values.serviceId,
    message: values.message,
    privacyAccepted: values.privacyAccepted,
    company: values.company,
  };
}
