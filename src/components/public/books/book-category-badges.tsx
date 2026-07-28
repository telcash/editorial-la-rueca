import Link from 'next/link';

import type { BookEditionDetails, BookWithDetails } from '@/services/books/book.types';
import { formatEditionFormat, formatPublicationYear } from '@/features/public/lib/book-format';
import { isRecentBookEdition } from '@/features/public/books/book-edition.helpers';
import { cn } from '@/lib/utils';

interface BookCategoryBadgesProps {
  book: BookWithDetails;
  primaryEdition: BookEditionDetails | null;
  className?: string;
}

const badgeClassName =
  'inline-flex min-h-8 items-center rounded-full border px-3 py-1 text-xs font-bold leading-none';

export function BookCategoryBadges({ book, primaryEdition, className }: BookCategoryBadgesProps) {
  const primaryCategory = book.categories.at(0);
  const format = primaryEdition?.format ? formatEditionFormat(primaryEdition.format) : null;
  const year = primaryEdition ? formatPublicationYear(primaryEdition.publicationDate) : null;
  const editionBadge = primaryEdition?.editionLabel ?? format ?? year;
  const showNewRelease = isRecentBookEdition(primaryEdition);

  if (!primaryCategory && !book.isFeatured && !showNewRelease && !editionBadge) {
    return null;
  }

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {primaryCategory ? (
        <Link
          href={`/libros?category=${primaryCategory.slug}`}
          className={cn(
            badgeClassName,
            'border-public-red/20 bg-public-red-soft text-public-red transition hover:border-public-red focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-public-red focus-visible:ring-offset-2 focus-visible:ring-offset-white',
          )}
        >
          {primaryCategory.name}
        </Link>
      ) : null}
      {book.isFeatured ? (
        <span className={cn(badgeClassName, 'border-public-red bg-public-red text-white')}>
          Destacado
        </span>
      ) : null}
      {showNewRelease ? (
        <span
          className={cn(badgeClassName, 'border-public-red/15 bg-public-red-soft text-public-red')}
        >
          Novedad
        </span>
      ) : null}
      {editionBadge ? (
        <span
          className={cn(
            badgeClassName,
            'border-public-border bg-public-surface-subtle text-public-ink',
          )}
        >
          {editionBadge}
        </span>
      ) : null}
    </div>
  );
}
