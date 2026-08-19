import { asc, sql, type SQL } from 'drizzle-orm';

import { bookEditions, books } from '@/db/schema';

export interface PublicCatalogOrderBook {
  id: string;
  title: string;
  sortOrder: number;
  editions: { publicationDate: string | null }[];
}

export function getEffectivePublicationDateSql(): SQL<string | null> {
  return sql<string | null>`max(${bookEditions.publicationDate})`;
}

export function getPublicCatalogOrderByExpressions(
  effectivePublicationDate: SQL<string | null> = getEffectivePublicationDateSql(),
): SQL[] {
  return [
    sql`${effectivePublicationDate} desc nulls last`,
    asc(books.sortOrder),
    asc(books.title),
    asc(books.id),
  ];
}

export function getEffectivePublicationDate(book: PublicCatalogOrderBook): string | null {
  return book.editions.reduce<string | null>((latestDate, edition) => {
    if (!edition.publicationDate) {
      return latestDate;
    }

    if (!latestDate || edition.publicationDate > latestDate) {
      return edition.publicationDate;
    }

    return latestDate;
  }, null);
}

export function comparePublicCatalogBooks(
  firstBook: PublicCatalogOrderBook,
  secondBook: PublicCatalogOrderBook,
): number {
  const firstDate = getEffectivePublicationDate(firstBook);
  const secondDate = getEffectivePublicationDate(secondBook);

  if (firstDate && secondDate && firstDate !== secondDate) {
    return secondDate.localeCompare(firstDate);
  }

  if (firstDate && !secondDate) {
    return -1;
  }

  if (!firstDate && secondDate) {
    return 1;
  }

  if (firstBook.sortOrder !== secondBook.sortOrder) {
    return firstBook.sortOrder - secondBook.sortOrder;
  }

  const titleOrder = firstBook.title.localeCompare(secondBook.title, 'es');

  if (titleOrder !== 0) {
    return titleOrder;
  }

  return firstBook.id.localeCompare(secondBook.id);
}
