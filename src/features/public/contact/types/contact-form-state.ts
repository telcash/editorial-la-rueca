export interface PublicContactFormValues {
  name: string;
  email: string;
  phone: string;
  province: string;
  serviceId: string;
  message: string;
  privacyAccepted: boolean;
  company: string;
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
  province: '',
  serviceId: '',
  message: '',
  privacyAccepted: false,
  company: '',
};

export const initialPublicContactFormState: PublicContactFormState = {
  success: false,
  fieldErrors: {},
  formError: null,
  values: initialPublicContactFormValues,
};
