import type { BookAuthorSummary, BookEditionDetails } from '@/services/books/book.types';

type BookListAuthor = Pick<BookAuthorSummary, 'name'>;
type BookListEdition = Pick<BookEditionDetails, 'format' | 'price' | 'currency' | 'isAvailable'>;

const editionFormatLabels: Record<string, string> = {
  paperback: 'Tapa blanda',
  hardcover: 'Tapa dura',
  ebook: 'Ebook',
  audiobook: 'Audiolibro',
};

export interface BookPriceSummary {
  label: string;
  kind: 'none' | 'single' | 'from' | 'multiple-currencies';
}

export function formatAuthorsSummary(authors: BookListAuthor[]): string {
  if (authors.length === 0) {
    return 'Sin autores';
  }

  if (authors.length === 1) {
    return authors[0]?.name ?? 'Sin autores';
  }

  if (authors.length === 2) {
    return `${authors[0]?.name} y ${authors[1]?.name}`;
  }

  if (authors.length === 3) {
    return `${authors[0]?.name}, ${authors[1]?.name} y ${authors[2]?.name}`;
  }

  return `${authors[0]?.name}, ${authors[1]?.name} y ${authors.length - 2} más`;
}

export function formatEditionFormatLabel(format: string): string {
  return editionFormatLabels[format] ?? format;
}

export function formatEditionCount(editions: BookListEdition[]): string {
  if (editions.length === 0) {
    return 'Sin ediciones';
  }

  if (editions.length === 1) {
    return '1 edición';
  }

  return `${editions.length} ediciones`;
}

export function formatEditionFormats(editions: BookListEdition[]): string | null {
  const uniqueFormats = Array.from(new Set(editions.map((edition) => edition.format)));

  if (uniqueFormats.length === 0) {
    return null;
  }

  const visibleFormats = uniqueFormats.slice(0, 2).map(formatEditionFormatLabel);
  const remainingFormats = uniqueFormats.length - visibleFormats.length;

  return remainingFormats > 0
    ? `${visibleFormats.join(' · ')} · +${remainingFormats}`
    : visibleFormats.join(' · ');
}

export function formatEditionsSummary(editions: BookListEdition[]) {
  return {
    count: formatEditionCount(editions),
    formats: formatEditionFormats(editions),
  };
}

function parseDecimalCents(value: string): number | null {
  const normalizedValue = value.trim().replace(',', '.');

  if (!/^\d+(?:\.\d{1,2})?$/.test(normalizedValue)) {
    return null;
  }

  const [integerPart, decimalPart = ''] = normalizedValue.split('.');

  return Number(integerPart) * 100 + Number(decimalPart.padEnd(2, '0'));
}

function formatCurrency(cents: number, currency: string): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency,
  }).format(cents / 100);
}

export function getBookPriceSummary(editions: BookListEdition[]): BookPriceSummary {
  const pricedEditions = editions
    .filter((edition) => edition.isAvailable && edition.price !== null)
    .map((edition) => ({
      currency: edition.currency,
      cents: parseDecimalCents(edition.price ?? ''),
    }))
    .filter((edition): edition is { currency: string; cents: number } => edition.cents !== null);

  if (pricedEditions.length === 0) {
    return {
      label: 'Sin precio',
      kind: 'none',
    };
  }

  const currencies = new Set(pricedEditions.map((edition) => edition.currency));

  if (currencies.size > 1) {
    return {
      label: 'Varios precios',
      kind: 'multiple-currencies',
    };
  }

  const currency = pricedEditions[0]?.currency ?? 'EUR';
  const prices = pricedEditions.map((edition) => edition.cents);
  const minPrice = Math.min(...prices);
  const allPricesEqual = prices.every((price) => price === minPrice);

  if (allPricesEqual) {
    return {
      label: formatCurrency(minPrice, currency),
      kind: 'single',
    };
  }

  return {
    label: `Desde ${formatCurrency(minPrice, currency)}`,
    kind: 'from',
  };
}
