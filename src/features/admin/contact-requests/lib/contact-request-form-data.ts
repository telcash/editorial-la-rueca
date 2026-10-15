import type { ContactRequestAdminDetail } from '@/services/contact-requests/contact-request.types';
import type {
  ContactRequestAdminFormValues,
  ContactRequestAdminUpdateInputFromForm,
} from '../types/contact-request-admin-form-state';

function getTextValue(formData: FormData, field: keyof ContactRequestAdminFormValues): string {
  const value = formData.get(field);

  return typeof value === 'string' ? value : '';
}

export function getContactRequestAdminFormValues(
  formData: FormData,
): ContactRequestAdminFormValues {
  return {
    serviceId: getTextValue(formData, 'serviceId'),
  };
}

export function getContactRequestAdminUpdateInput(
  formData: FormData,
): ContactRequestAdminUpdateInputFromForm {
  const values = getContactRequestAdminFormValues(formData);

  return {
    serviceId: values.serviceId,
  };
}

export function getContactRequestAdminFormValuesFromContactRequest(
  contactRequest: ContactRequestAdminDetail,
): ContactRequestAdminFormValues {
  return {
    serviceId: contactRequest.serviceId ?? '',
  };
}
