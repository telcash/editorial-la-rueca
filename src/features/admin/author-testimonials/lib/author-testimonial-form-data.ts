import type { AuthorTestimonial } from '@/db/schema';
import type {
  AuthorTestimonialCreateInputFromForm,
  AuthorTestimonialFormValues,
  AuthorTestimonialUpdateInputFromForm,
} from '../types/author-testimonial-form-state';

function getTextValue(formData: FormData, field: keyof AuthorTestimonialFormValues): string {
  const value = formData.get(field);

  return typeof value === 'string' ? value : '';
}

function getBooleanValue(formData: FormData, field: 'isPublished' | 'isFeatured'): boolean {
  return formData.getAll(field).some((value) => value === 'true' || value === 'on');
}

function getNumberOrNull(value: string): number | null {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return null;
  }

  const parsedValue = Number.parseInt(trimmedValue, 10);

  return Number.isNaN(parsedValue) ? null : parsedValue;
}

function getSortOrder(value: string): number {
  const parsedValue = Number.parseInt(value.trim(), 10);

  return Number.isNaN(parsedValue) ? 0 : parsedValue;
}

export function getAuthorTestimonialFormValues(formData: FormData): AuthorTestimonialFormValues {
  return {
    authorId: getTextValue(formData, 'authorId'),
    bookId: getTextValue(formData, 'bookId'),
    quote: getTextValue(formData, 'quote'),
    source: getTextValue(formData, 'source'),
    rating: getTextValue(formData, 'rating'),
    isPublished: getBooleanValue(formData, 'isPublished'),
    isFeatured: getBooleanValue(formData, 'isFeatured'),
    sortOrder: getTextValue(formData, 'sortOrder'),
  };
}

export function getAuthorTestimonialCreateInput(
  formData: FormData,
): AuthorTestimonialCreateInputFromForm {
  const values = getAuthorTestimonialFormValues(formData);

  return {
    authorId: values.authorId,
    bookId: values.bookId || null,
    quote: values.quote,
    source: values.source || null,
    rating: getNumberOrNull(values.rating),
    isPublished: values.isPublished,
    isFeatured: values.isFeatured,
    sortOrder: getSortOrder(values.sortOrder),
  };
}

export function getAuthorTestimonialUpdateInput(
  formData: FormData,
): AuthorTestimonialUpdateInputFromForm {
  return getAuthorTestimonialCreateInput(formData);
}

export function getAuthorTestimonialFormValuesFromTestimonial(
  testimonial: AuthorTestimonial,
): AuthorTestimonialFormValues {
  return {
    authorId: testimonial.authorId,
    bookId: testimonial.bookId ?? '',
    quote: testimonial.quote,
    source: testimonial.source ?? 'manual',
    rating: testimonial.rating?.toString() ?? '',
    isPublished: testimonial.isPublished,
    isFeatured: testimonial.isFeatured,
    sortOrder: testimonial.sortOrder.toString(),
  };
}
