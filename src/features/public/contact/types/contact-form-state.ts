export interface PublicContactFormValues {
  name: string;
  email: string;
  phone: string;
  province: string;
  serviceId: string;
  message: string;
  company: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmContent: string;
  utmTerm: string;
}

export type PublicContactUtmValues = Pick<
  PublicContactFormValues,
  'utmSource' | 'utmMedium' | 'utmCampaign' | 'utmContent' | 'utmTerm'
>;

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
  company: '',
  utmSource: '',
  utmMedium: '',
  utmCampaign: '',
  utmContent: '',
  utmTerm: '',
};

export const initialPublicContactFormState: PublicContactFormState = {
  success: false,
  fieldErrors: {},
  formError: null,
  values: initialPublicContactFormValues,
};
