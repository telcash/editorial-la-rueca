import { z } from 'zod';

import { createBookSchema } from '@/schemas/books/book.schema';
import type {
  BookGeneralFormErrors,
  BookGeneralFormField,
  BookGeneralFormValues,
} from '../types/book-form-state';

export const bookGeneralFormSchema = createBookSchema
  .pick({
    title: true,
    subtitle: true,
    slug: true,
    description: true,
    excerpt: true,
    originalPublicationDate: true,
    language: true,
    isFeatured: true,
    isPublished: true,
    sortOrder: true,
    metaTitle: true,
    metaDescription: true,
    canonicalUrl: true,
  })
  .strict();

export function slugifyBookTitle(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ñ/g, 'n')
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function updateValuesFromTitle(
  values: BookGeneralFormValues,
  title: string,
  isSlugManuallyEdited: boolean,
): BookGeneralFormValues {
  return {
    ...values,
    title,
    slug: isSlugManuallyEdited ? values.slug : slugifyBookTitle(title),
  };
}

export function updateValuesFromManualSlug(
  values: BookGeneralFormValues,
  slug: string,
): BookGeneralFormValues {
  return {
    ...values,
    slug,
  };
}

export function resetSlugFromTitle(values: BookGeneralFormValues): BookGeneralFormValues {
  return {
    ...values,
    slug: slugifyBookTitle(values.title),
  };
}

function getIssuesByField(error: z.ZodError): BookGeneralFormErrors {
  return error.issues.reduce<BookGeneralFormErrors>((fieldErrors, issue) => {
    const field = issue.path[0];

    if (typeof field === 'string' && !fieldErrors[field as BookGeneralFormField]) {
      fieldErrors[field as BookGeneralFormField] = issue.message;
    }

    return fieldErrors;
  }, {});
}

export function validateBookGeneralForm(values: BookGeneralFormValues): BookGeneralFormErrors {
  const result = bookGeneralFormSchema.safeParse({
    ...values,
    sortOrder: values.sortOrder,
  });

  return result.success ? {} : getIssuesByField(result.error);
}

export function getVisibleBookGeneralErrors(
  values: BookGeneralFormValues,
  touched: Partial<Record<BookGeneralFormField, boolean>>,
): BookGeneralFormErrors {
  const errors = validateBookGeneralForm(values);

  return Object.fromEntries(
    Object.entries(errors).filter(([field]) => touched[field as BookGeneralFormField]),
  ) as BookGeneralFormErrors;
}

export function areBookGeneralValuesDirty(
  values: BookGeneralFormValues,
  initialValues: BookGeneralFormValues,
): boolean {
  return Object.keys(values).some((key) => {
    const field = key as BookGeneralFormField;

    return values[field] !== initialValues[field];
  });
}
