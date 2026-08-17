import type {
  CreateAuthorTestimonialInput,
  UpdateAuthorTestimonialInput,
} from '@/schemas/author-testimonials/author-testimonial.schema';

export interface AuthorTestimonialFormValues {
  authorId: string;
  bookId: string;
  quote: string;
  source: string;
  rating: string;
  isPublished: boolean;
  isFeatured: boolean;
  sortOrder: string;
}

export type AuthorTestimonialFormFieldErrors = Partial<
  Record<keyof AuthorTestimonialFormValues, string[]>
>;

export interface AuthorTestimonialFormState {
  success: boolean;
  fieldErrors: AuthorTestimonialFormFieldErrors;
  formError: string | null;
  values: AuthorTestimonialFormValues;
}

export const initialAuthorTestimonialFormValues: AuthorTestimonialFormValues = {
  authorId: '',
  bookId: '',
  quote: '',
  source: 'manual',
  rating: '',
  isPublished: false,
  isFeatured: false,
  sortOrder: '0',
};

export const initialAuthorTestimonialFormState: AuthorTestimonialFormState = {
  success: false,
  fieldErrors: {},
  formError: null,
  values: initialAuthorTestimonialFormValues,
};

export type AuthorTestimonialCreateInputFromForm = CreateAuthorTestimonialInput;
export type AuthorTestimonialUpdateInputFromForm = UpdateAuthorTestimonialInput;
