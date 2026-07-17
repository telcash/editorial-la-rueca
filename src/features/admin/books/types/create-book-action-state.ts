import type { BookEditionFormErrorsById } from './book-form-state';

export interface CreateBookActionState {
  success: false;
  pathErrors: Record<string, string>;
  formError: string | null;
  authorsError: string | null;
  editionsError: string | null;
}

export interface CreateBookClientErrors {
  pathErrors: Record<string, string>;
  generalErrors: Record<string, string>;
  editionErrors: BookEditionFormErrorsById;
  authorsError: string | null;
  editionsError: string | null;
}
