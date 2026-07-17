import type { CreateAuthorInput, UpdateAuthorInput } from '@/schemas/authors/author.schema';

export interface AuthorFormValues {
  name: string;
  slug: string;
  shortBio: string;
  biography: string;
  photoUrl: string;
  websiteUrl: string;
  instagramUrl: string;
  facebookUrl: string;
  country: string;
  isPublished: boolean;
  isFeatured: boolean;
  sortOrder: string;
}

export type AuthorFormFieldErrors = Partial<Record<keyof AuthorFormValues | 'photo', string[]>>;

export interface AuthorFormState {
  success: boolean;
  fieldErrors: AuthorFormFieldErrors;
  formError: string | null;
  values: AuthorFormValues;
}

export const initialAuthorFormValues: AuthorFormValues = {
  name: '',
  slug: '',
  shortBio: '',
  biography: '',
  photoUrl: '',
  websiteUrl: '',
  instagramUrl: '',
  facebookUrl: '',
  country: '',
  isPublished: false,
  isFeatured: false,
  sortOrder: '0',
};

export const initialAuthorFormState: AuthorFormState = {
  success: false,
  fieldErrors: {},
  formError: null,
  values: initialAuthorFormValues,
};

export type AuthorCreateInputFromForm = CreateAuthorInput;
export type AuthorUpdateInputFromForm = UpdateAuthorInput;
