import type { BookWithDetails } from '@/services/books/book.types';
import {
  initialBookGeneralFormValues,
  type BookEditionFormValues,
  type BookFormAuthorSummary,
  type BookFormInitialValues,
} from '../types/book-form-state';
import { normalizeEditionOrder } from './book-edition-form.helpers';

function nullableStringToInput(value: string | null | undefined): string {
  return value ?? '';
}

function nullableNumberToInput(value: number | null | undefined): string {
  return value === null || value === undefined ? '' : String(value);
}

function dateToInput(value: string | Date | null | undefined): string {
  if (!value) {
    return '';
  }

  if (typeof value === 'string') {
    return value.slice(0, 10);
  }

  const year = value.getUTCFullYear();
  const month = String(value.getUTCMonth() + 1).padStart(2, '0');
  const day = String(value.getUTCDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function mapBookToFormInitialValues(book: BookWithDetails): BookFormInitialValues {
  const selectedAuthors = [...book.authors]
    .sort((firstAuthor, secondAuthor) => firstAuthor.sortOrder - secondAuthor.sortOrder)
    .map<BookFormAuthorSummary>((author) => ({
      id: author.id,
      name: author.name,
      slug: author.slug,
      photoUrl: author.photoUrl,
    }));

  const editions = normalizeEditionOrder(
    [...book.editions]
      .sort((firstEdition, secondEdition) => firstEdition.sortOrder - secondEdition.sortOrder)
      .map<BookEditionFormValues>((edition) => ({
        clientId: `existing-${edition.id}`,
        format: edition.format,
        editionLabel: nullableStringToInput(edition.editionLabel),
        publicationDate: dateToInput(edition.publicationDate),
        isbn10: nullableStringToInput(edition.isbn10),
        isbn13: nullableStringToInput(edition.isbn13),
        price: nullableStringToInput(edition.price),
        currency: edition.currency,
        pages: nullableNumberToInput(edition.pages),
        isAvailable: edition.isAvailable,
        isFeatured: edition.isFeatured,
        sortOrder: String(edition.sortOrder),
      })),
  );

  return {
    general: {
      ...initialBookGeneralFormValues,
      title: book.title,
      subtitle: nullableStringToInput(book.subtitle),
      slug: book.slug,
      description: nullableStringToInput(book.description),
      excerpt: nullableStringToInput(book.excerpt),
      originalPublicationDate: dateToInput(book.originalPublicationDate),
      language: nullableStringToInput(book.language),
      isPublished: book.isPublished,
      isFeatured: book.isFeatured,
      sortOrder: String(book.sortOrder),
      metaTitle: nullableStringToInput(book.metaTitle),
      metaDescription: nullableStringToInput(book.metaDescription),
      canonicalUrl: nullableStringToInput(book.canonicalUrl),
    },
    selectedAuthors,
    editions,
    coverUrl: nullableStringToInput(book.coverUrl),
  };
}

export function mergeAvailableAuthors(
  availableAuthors: BookFormAuthorSummary[],
  selectedAuthors: BookFormAuthorSummary[],
): BookFormAuthorSummary[] {
  const authorsById = new Map<string, BookFormAuthorSummary>();

  for (const author of availableAuthors) {
    authorsById.set(author.id, author);
  }

  for (const author of selectedAuthors) {
    if (!authorsById.has(author.id)) {
      authorsById.set(author.id, author);
    }
  }

  return Array.from(authorsById.values());
}

export function serializeBookFormComparableState(values: BookFormInitialValues) {
  return {
    general: values.general,
    selectedAuthorIds: values.selectedAuthors.map((author) => author.id),
    editions: normalizeEditionOrder(values.editions).map((edition) => ({
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

export function isBookFormDirty(
  initialValues: BookFormInitialValues,
  currentValues: BookFormInitialValues,
): boolean {
  return (
    JSON.stringify(serializeBookFormComparableState(initialValues)) !==
    JSON.stringify(serializeBookFormComparableState(currentValues))
  );
}
