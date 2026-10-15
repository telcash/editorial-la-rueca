export interface ContactRequestAdminFormValues {
  serviceId: string;
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
    serviceId: '',
  },
};

export type ContactRequestAdminUpdateInputFromForm = ContactRequestAdminFormValues;
