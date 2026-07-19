export interface PublicContactFormValues {
  name: string;
  email: string;
  phone: string;
  message: string;
  privacyAccepted: boolean;
}

export interface PublicContactFormState {
  success: boolean;
  fieldErrors: Partial<Record<keyof PublicContactFormValues, string[]>>;
  formError: string | null;
  values: PublicContactFormValues;
}

export const initialPublicContactFormValues: PublicContactFormValues = {
  name: '',
  email: '',
  phone: '',
  message: '',
  privacyAccepted: false,
};

export const initialPublicContactFormState: PublicContactFormState = {
  success: false,
  fieldErrors: {},
  formError: null,
  values: initialPublicContactFormValues,
};
