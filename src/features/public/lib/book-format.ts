import type { BookEditionDetails } from '@/services/books/book.types';

const formatLabels: Record<string, string> = {
  paperback: 'Rústica',
  hardcover: 'Tapa dura',
  ebook: 'Ebook',
  audio: 'Audio',
  other: 'Otro formato',
};

export function formatEditionFormat(format: string) {
  return formatLabels[format] ?? format;
}

export function getEditionIsbn(edition: BookEditionDetails) {
  return edition.isbn13 ?? edition.isbn10 ?? null;
}

export function formatEditionPrice(edition: BookEditionDetails) {
  if (!edition.price) {
    return null;
  }

  const value = Number(edition.price);

  if (!Number.isFinite(value)) {
    return null;
  }

  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: edition.currency,
  }).format(value);
}

export function formatPublicationYear(date: string | null) {
  if (!date) {
    return null;
  }

  const year = date.slice(0, 4);

  return /^\d{4}$/.test(year) ? year : null;
}
