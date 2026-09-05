import type { PublicContactFormValues, PublicContactUtmValues } from '../types/contact-form-state';
import { contactRequestUtmLimits } from '@/schemas/contact-requests/utm';

function getFormDataString(formData: FormData, key: string): string {
  const value = formData.get(key);

  return typeof value === 'string' ? value : '';
}

function normalizeSearchParam(value: string | string[] | undefined, maxLength: number): string {
  const firstValue = Array.isArray(value) ? value[0] : value;
  const normalizedValue = firstValue?.trim() ?? '';

  return normalizedValue.length <= maxLength ? normalizedValue : '';
}

export function getPublicContactUtmValues(
  searchParams: Readonly<Record<string, string | string[] | undefined>>,
): PublicContactUtmValues {
  return {
    utmSource: normalizeSearchParam(searchParams.utm_source, contactRequestUtmLimits.utmSource),
    utmMedium: normalizeSearchParam(searchParams.utm_medium, contactRequestUtmLimits.utmMedium),
    utmCampaign: normalizeSearchParam(
      searchParams.utm_campaign,
      contactRequestUtmLimits.utmCampaign,
    ),
    utmContent: normalizeSearchParam(searchParams.utm_content, contactRequestUtmLimits.utmContent),
    utmTerm: normalizeSearchParam(searchParams.utm_term, contactRequestUtmLimits.utmTerm),
  };
}

export function getPublicContactFormValues(formData: FormData): PublicContactFormValues {
  return {
    name: getFormDataString(formData, 'name'),
    email: getFormDataString(formData, 'email'),
    phone: getFormDataString(formData, 'phone'),
    province: getFormDataString(formData, 'province'),
    serviceId: getFormDataString(formData, 'serviceId'),
    message: getFormDataString(formData, 'message'),
    company: getFormDataString(formData, 'company'),
    utmSource: getFormDataString(formData, 'utm_source'),
    utmMedium: getFormDataString(formData, 'utm_medium'),
    utmCampaign: getFormDataString(formData, 'utm_campaign'),
    utmContent: getFormDataString(formData, 'utm_content'),
    utmTerm: getFormDataString(formData, 'utm_term'),
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
    company: values.company,
    utmSource: values.utmSource,
    utmMedium: values.utmMedium,
    utmCampaign: values.utmCampaign,
    utmContent: values.utmContent,
    utmTerm: values.utmTerm,
  };
}
