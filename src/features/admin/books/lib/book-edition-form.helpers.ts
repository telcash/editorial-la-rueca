import { ZodError, type ZodIssue } from 'zod';

import { createBookSchema, updateBookSchema } from '@/schemas/books/book.schema';
import type {
  BookEditionFormErrors,
  BookEditionFormErrorsById,
  BookEditionFormField,
  BookEditionFormTouched,
  BookEditionFormTouchedById,
  BookEditionFormValues,
  BookFormAuthorSummary,
  BookFormCategorySummary,
  BookGeneralFormErrors,
  BookGeneralFormField,
  BookGeneralFormValues,
} from '../types/book-form-state';

export type CreateBookFormPayload = {
  title: string;
  subtitle: string;
  slug: string;
  description: string;
  excerpt: string;
  originalPublicationDate: string;
  language: string;
  isPublished: boolean;
  isFeatured: boolean;
  sortOrder: string;
  metaTitle: string;
  metaDescription: string;
  canonicalUrl: string;
  authorIds: string[];
  categoryIds: string[];
  editions: Array<Omit<BookEditionFormValues, 'clientId'>>;
};

export type UpdateBookFormPayload = CreateBookFormPayload;

type IdGenerator = () => string;

const editionFieldNames = [
  'format',
  'editionLabel',
  'publicationDate',
  'isbn10',
  'isbn13',
  'price',
  'currency',
  'pages',
  'isAvailable',
  'isFeatured',
  'sortOrder',
] as const satisfies readonly BookEditionFormField[];

function createClientId(): string {
  if (globalThis.crypto && 'randomUUID' in globalThis.crypto) {
    return globalThis.crypto.randomUUID();
  }

  return `edition-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function createEmptyEdition(
  sortOrder = 0,
  idGenerator: IdGenerator = createClientId,
): BookEditionFormValues {
  return {
    clientId: idGenerator(),
    format: 'paperback',
    editionLabel: '',
    publicationDate: '',
    isbn10: '',
    isbn13: '',
    price: '',
    currency: 'EUR',
    pages: '',
    isAvailable: true,
    isFeatured: false,
    sortOrder: String(sortOrder),
  };
}

export function normalizeEditionOrder(editions: BookEditionFormValues[]): BookEditionFormValues[] {
  return editions.map((edition, index) => ({
    ...edition,
    sortOrder: String(index),
  }));
}

export function addEdition(
  editions: BookEditionFormValues[],
  idGenerator: IdGenerator = createClientId,
): BookEditionFormValues[] {
  return normalizeEditionOrder([...editions, createEmptyEdition(editions.length, idGenerator)]);
}

export function removeEdition(
  editions: BookEditionFormValues[],
  clientId: string,
): BookEditionFormValues[] {
  return normalizeEditionOrder(editions.filter((edition) => edition.clientId !== clientId));
}

export function updateEdition(
  editions: BookEditionFormValues[],
  clientId: string,
  field: BookEditionFormField,
  value: string | boolean,
): BookEditionFormValues[] {
  return editions.map((edition) =>
    edition.clientId === clientId
      ? {
          ...edition,
          [field]: value,
        }
      : edition,
  );
}

export function getAllEditionFieldsTouched(
  editions: BookEditionFormValues[],
): BookEditionFormTouchedById {
  return Object.fromEntries(
    editions.map((edition) => [
      edition.clientId,
      Object.fromEntries(editionFieldNames.map((field) => [field, true])) as BookEditionFormTouched,
    ]),
  );
}

export function buildCreateBookPayload(
  generalValues: BookGeneralFormValues,
  selectedAuthors: BookFormAuthorSummary[],
  selectedCategories: BookFormCategorySummary[],
  editions: BookEditionFormValues[],
): CreateBookFormPayload {
  return {
    ...generalValues,
    authorIds: selectedAuthors.map((author) => author.id),
    categoryIds: selectedCategories.map((category) => category.id),
    editions: normalizeEditionOrder(editions).map((edition) => ({
      format: edition.format,
      editionLabel: edition.editionLabel,
      publicationDate: edition.publicationDate,
      isbn10: edition.isbn10,
      isbn13: edition.isbn13,
      price: edition.price,
      currency: edition.currency,
      pages: edition.pages,
      isAvailable: edition.isAvailable,
      isFeatured: edition.isFeatured,
      sortOrder: edition.sortOrder,
    })),
  };
}

export function buildUpdateBookPayload(
  generalValues: BookGeneralFormValues,
  selectedAuthors: BookFormAuthorSummary[],
  selectedCategories: BookFormCategorySummary[],
  editions: BookEditionFormValues[],
): UpdateBookFormPayload {
  return buildCreateBookPayload(generalValues, selectedAuthors, selectedCategories, editions);
}

export function mapZodIssuesToPaths(issues: ZodIssue[]): Record<string, string> {
  return issues.reduce<Record<string, string>>((errors, issue) => {
    const path = issue.path.join('.');
    const key = path.length > 0 ? path : 'form';

    if (!errors[key]) {
      errors[key] = issue.message;
    }

    return errors;
  }, {});
}

export function mapZodErrorToPaths(error: ZodError): Record<string, string> {
  return mapZodIssuesToPaths(error.issues);
}

export function validateCreateBookPayload(payload: CreateBookFormPayload): Record<string, string> {
  const result = createBookSchema.safeParse(payload);

  return result.success ? {} : mapZodErrorToPaths(result.error);
}

export function validateUpdateBookPayload(payload: UpdateBookFormPayload): Record<string, string> {
  const result = updateBookSchema.safeParse(payload);

  return result.success ? {} : mapZodErrorToPaths(result.error);
}

export function getGeneralErrorsFromPathErrors(
  pathErrors: Record<string, string>,
): BookGeneralFormErrors {
  const generalFields = new Set<BookGeneralFormField>([
    'title',
    'subtitle',
    'slug',
    'description',
    'excerpt',
    'originalPublicationDate',
    'language',
    'isPublished',
    'isFeatured',
    'sortOrder',
    'metaTitle',
    'metaDescription',
    'canonicalUrl',
  ]);

  return Object.fromEntries(
    Object.entries(pathErrors).filter(([field]) =>
      generalFields.has(field as BookGeneralFormField),
    ),
  ) as BookGeneralFormErrors;
}

export function getEditionErrorsFromPathErrors(
  pathErrors: Record<string, string>,
  editions: BookEditionFormValues[],
): BookEditionFormErrorsById {
  const editionErrors: BookEditionFormErrorsById = {};

  for (const [path, message] of Object.entries(pathErrors)) {
    const [, indexValue, field] = path.split('.');
    const editionIndex = Number(indexValue);
    const edition = editions[editionIndex];

    if (
      !path.startsWith('editions.') ||
      !edition ||
      !editionFieldNames.includes(field as BookEditionFormField)
    ) {
      continue;
    }

    editionErrors[edition.clientId] = {
      ...editionErrors[edition.clientId],
      [field as BookEditionFormField]: message,
    };
  }

  return editionErrors;
}

export function getVisibleEditionErrors(
  editionErrors: BookEditionFormErrorsById,
  touched: BookEditionFormTouchedById,
): BookEditionFormErrorsById {
  return Object.fromEntries(
    Object.entries(editionErrors)
      .map(([clientId, errors]) => [
        clientId,
        Object.fromEntries(
          Object.entries(errors).filter(
            ([field]) => touched[clientId]?.[field as BookEditionFormField],
          ),
        ) as BookEditionFormErrors,
      ])
      .filter(([, errors]) => Object.keys(errors as BookEditionFormErrors).length > 0),
  );
}

export function getAuthorsErrorFromPathErrors(pathErrors: Record<string, string>): string | null {
  return pathErrors.authorIds ?? null;
}

export function getEditionsErrorFromPathErrors(pathErrors: Record<string, string>): string | null {
  return pathErrors.editions ?? null;
}
