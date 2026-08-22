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
    status: getTextValue(formData, 'status'),
    serviceId: getTextValue(formData, 'serviceId'),
    internalNotes: getTextValue(formData, 'internalNotes'),
  };
}

export function getContactRequestAdminUpdateInput(
  formData: FormData,
): ContactRequestAdminUpdateInputFromForm {
  const values = getContactRequestAdminFormValues(formData);

  return {
    status: values.status,
    serviceId: values.serviceId,
    internalNotes: values.internalNotes,
  };
}

export function getContactRequestAdminFormValuesFromContactRequest(
  contactRequest: ContactRequestAdminDetail,
): ContactRequestAdminFormValues {
  return {
    status: contactRequest.status,
    serviceId: contactRequest.serviceId,
    internalNotes: contactRequest.internalNotes ?? '',
  };
}
