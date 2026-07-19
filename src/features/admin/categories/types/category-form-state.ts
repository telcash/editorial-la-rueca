import type {
  CreateCategoryInput,
  UpdateCategoryInput,
} from '@/schemas/categories/category.schema';

export interface CategoryFormValues {
  name: string;
  slug: string;
  description: string;
  isPublished: boolean;
}

export type CategoryFormFieldErrors = Partial<Record<keyof CategoryFormValues, string[]>>;

export interface CategoryFormState {
  success: boolean;
  fieldErrors: CategoryFormFieldErrors;
  formError: string | null;
  values: CategoryFormValues;
}

export const initialCategoryFormValues: CategoryFormValues = {
  name: '',
  slug: '',
  description: '',
  isPublished: false,
};

export const initialCategoryFormState: CategoryFormState = {
  success: false,
  fieldErrors: {},
  formError: null,
  values: initialCategoryFormValues,
};

export type CategoryCreateInputFromForm = CreateCategoryInput;
export type CategoryUpdateInputFromForm = UpdateCategoryInput;
