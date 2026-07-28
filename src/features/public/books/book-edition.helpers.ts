import type { BookEditionDetails, BookWithDetails } from '@/services/books/book.types';
import {
  formatEditionFormat,
  formatEditionPrice,
  formatPublicationYear,
  getEditionIsbn,
} from '@/features/public/lib/book-format';
import { toPlainPublicText } from '@/features/public/lib/text-format';

export const BOOK_DETAIL_SUMMARY_LIMIT = 320;
export const BOOK_NEW_RELEASE_MONTHS = 18;

export interface BookMetaItem {
  label: string;
  value: string;
}

function getEditionDateValue(edition: BookEditionDetails) {
  if (!edition.publicationDate) {
    return 0;
  }

  return new Date(edition.publicationDate).getTime() || 0;
}

function compareBooleanPriority(firstValue: boolean, secondValue: boolean) {
  if (firstValue === secondValue) {
    return 0;
  }

  return firstValue ? -1 : 1;
}

export function selectPrimaryBookEdition(editions: BookEditionDetails[]) {
  if (editions.length === 0) {
    return null;
  }

  return editions
    .map((edition, index) => ({ edition, index }))
    .sort((firstItem, secondItem) => {
      const firstEdition = firstItem.edition;
      const secondEdition = secondItem.edition;
      const featuredDifference = compareBooleanPriority(
        firstEdition.isFeatured,
        secondEdition.isFeatured,
      );

      if (featuredDifference !== 0) {
        return featuredDifference;
      }

      const availabilityDifference = compareBooleanPriority(
        firstEdition.isAvailable,
        secondEdition.isAvailable,
      );

      if (availabilityDifference !== 0) {
        return availabilityDifference;
      }

      const sortOrderDifference = firstEdition.sortOrder - secondEdition.sortOrder;

      if (sortOrderDifference !== 0) {
        return sortOrderDifference;
      }

      const dateDifference = getEditionDateValue(secondEdition) - getEditionDateValue(firstEdition);

      if (dateDifference !== 0) {
        return dateDifference;
      }

      return firstItem.index - secondItem.index;
    })[0].edition;
}

export function getEditionAvailabilityLabel(edition: BookEditionDetails) {
  return edition.isAvailable ? 'Disponible' : 'Consultar disponibilidad';
}

export function getLanguageLabel(language: string | null) {
  if (!language) {
    return null;
  }

  const languageLabels: Record<string, string> = {
    es: 'Español',
    en: 'Inglés',
    fr: 'Francés',
  };
  const normalizedLanguage = language.trim();

  if (!normalizedLanguage) {
    return null;
  }

  return languageLabels[normalizedLanguage.toLowerCase()] ?? normalizedLanguage;
}

export function isRecentBookEdition(edition: BookEditionDetails | null, now = new Date()) {
  if (!edition?.publicationDate) {
    return false;
  }

  const publicationDate = new Date(edition.publicationDate);

  if (Number.isNaN(publicationDate.getTime()) || publicationDate.getTime() > now.getTime()) {
    return false;
  }

  const oldestRecentDate = new Date(now);
  oldestRecentDate.setMonth(oldestRecentDate.getMonth() - BOOK_NEW_RELEASE_MONTHS);

  return publicationDate.getTime() >= oldestRecentDate.getTime();
}

export function truncatePublicText(value: string, maxLength = BOOK_DETAIL_SUMMARY_LIMIT) {
  if (value.length <= maxLength) {
    return value;
  }

  const excerpt = value.slice(0, maxLength);
  const lastSpaceIndex = excerpt.lastIndexOf(' ');
  const trimmedExcerpt =
    lastSpaceIndex > maxLength * 0.6 ? excerpt.slice(0, lastSpaceIndex) : excerpt;

  return `${trimmedExcerpt.trimEnd()}…`;
}

export function getBookDetailSummary(book: Pick<BookWithDetails, 'excerpt' | 'description'>) {
  const source = toPlainPublicText(book.excerpt) ?? toPlainPublicText(book.description);

  return source ? truncatePublicText(source) : null;
}

export function getBookSynopsis(book: Pick<BookWithDetails, 'description' | 'excerpt'>) {
  return toPlainPublicText(book.description) ?? toPlainPublicText(book.excerpt);
}

export function getPrimaryEditionMetaItems(
  book: Pick<BookWithDetails, 'language'>,
  edition: BookEditionDetails | null,
  limit = 6,
): BookMetaItem[] {
  if (!edition) {
    const language = getLanguageLabel(book.language);

    return language ? [{ label: 'Idioma', value: language }] : [];
  }

  const items: Array<BookMetaItem | null> = [
    formatPublicationYear(edition.publicationDate)
      ? { label: 'Año', value: formatPublicationYear(edition.publicationDate) as string }
      : null,
    edition.format ? { label: 'Formato', value: formatEditionFormat(edition.format) } : null,
    edition.pages ? { label: 'Páginas', value: `${edition.pages}` } : null,
    getLanguageLabel(book.language)
      ? { label: 'Idioma', value: getLanguageLabel(book.language) as string }
      : null,
    getEditionIsbn(edition) ? { label: 'ISBN', value: getEditionIsbn(edition) as string } : null,
    { label: 'Disponibilidad', value: getEditionAvailabilityLabel(edition) },
    formatEditionPrice(edition)
      ? { label: 'Precio', value: formatEditionPrice(edition) as string }
      : null,
  ];

  return items.filter((item): item is BookMetaItem => Boolean(item)).slice(0, limit);
}

export function getBookEditorialFactItems(
  book: BookWithDetails,
  edition: BookEditionDetails | null,
): BookMetaItem[] {
  const authorNames = book.authors.map((author) => author.name).join(', ');
  const categoryNames = book.categories.map((category) => category.name).join(', ');
  const originalPublicationYear = formatPublicationYear(book.originalPublicationDate);

  const items: Array<BookMetaItem | null> = [
    { label: 'Título', value: book.title },
    book.subtitle ? { label: 'Subtítulo', value: book.subtitle } : null,
    authorNames ? { label: 'Autoría', value: authorNames } : null,
    categoryNames ? { label: 'Categorías', value: categoryNames } : null,
    getLanguageLabel(book.language)
      ? { label: 'Idioma', value: getLanguageLabel(book.language) as string }
      : null,
    originalPublicationYear
      ? { label: 'Publicación original', value: originalPublicationYear }
      : null,
    edition?.editionLabel ? { label: 'Edición principal', value: edition.editionLabel } : null,
    edition?.format ? { label: 'Formato', value: formatEditionFormat(edition.format) } : null,
    edition?.publicationDate
      ? {
          label: 'Fecha de publicación',
          value: formatPublicationYear(edition.publicationDate) ?? edition.publicationDate,
        }
      : null,
    edition?.pages ? { label: 'Páginas', value: `${edition.pages}` } : null,
    edition
      ? getEditionIsbn(edition)
        ? { label: 'ISBN', value: getEditionIsbn(edition) as string }
        : null
      : null,
    edition
      ? formatEditionPrice(edition)
        ? { label: 'Precio', value: formatEditionPrice(edition) as string }
        : null
      : null,
    edition ? { label: 'Disponibilidad', value: getEditionAvailabilityLabel(edition) } : null,
  ];

  return items.filter((item): item is BookMetaItem => Boolean(item));
}
