import type {
  CreateServiceInput,
  UpdateServiceInput,
} from '@/schemas/editorial-services/editorial-service.schema';

export interface ServiceFormValues {
  name: string;
  slug: string;
  shortDescription: string;
  description: string;
  isPublished: boolean;
  isFeatured: boolean;
  sortOrder: string;
}

export type ServiceFormFieldErrors = Partial<Record<keyof ServiceFormValues, string[]>>;

export interface ServiceFormState {
  success: boolean;
  fieldErrors: ServiceFormFieldErrors;
  formError: string | null;
  values: ServiceFormValues;
}

export const initialServiceFormValues: ServiceFormValues = {
  name: '',
  slug: '',
  shortDescription: '',
  description: '',
  isPublished: false,
  isFeatured: false,
  sortOrder: '0',
};

export const initialServiceFormState: ServiceFormState = {
  success: false,
  fieldErrors: {},
  formError: null,
  values: initialServiceFormValues,
};

export type ServiceCreateInputFromForm = CreateServiceInput;
export type ServiceUpdateInputFromForm = UpdateServiceInput;
