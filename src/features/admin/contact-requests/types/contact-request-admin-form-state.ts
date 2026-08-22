export interface ContactRequestAdminFormValues {
  status: string;
  serviceId: string;
  internalNotes: string;
}

export type ContactRequestAdminFormFieldErrors = Partial<
  Record<keyof ContactRequestAdminFormValues, string[]>
>;

export interface ContactRequestAdminFormState {
  success: boolean;
  fieldErrors: ContactRequestAdminFormFieldErrors;
  formError: string | null;
  values: ContactRequestAdminFormValues;
}

export const initialContactRequestAdminFormState: ContactRequestAdminFormState = {
  success: false,
  fieldErrors: {},
  formError: null,
  values: {
    status: 'new',
    serviceId: '',
    internalNotes: '',
  },
};

export type ContactRequestAdminUpdateInputFromForm = ContactRequestAdminFormValues;
