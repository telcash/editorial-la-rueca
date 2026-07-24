import Link from 'next/link';
import { ArrowLeft, ArrowRight } from 'lucide-react';

import { cn } from '@/lib/utils';

interface PublicPaginationProps {
  basePath: string;
  currentPage: number;
  totalPages: number;
  query?: string;
  category?: string;
}

function buildPageHref(basePath: string, page: number, query?: string, category?: string) {
  const searchParams = new URLSearchParams();

  if (query) {
    searchParams.set('q', query);
  }

  if (category) {
    searchParams.set('category', category);
  }

  if (page > 1) {
    searchParams.set('page', String(page));
  }

  const queryString = searchParams.toString();

  return queryString ? `${basePath}?${queryString}` : basePath;
}

export function PublicPagination({
  basePath,
  currentPage,
  totalPages,
  query,
  category,
}: PublicPaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  const previousPage = currentPage - 1;
  const nextPage = currentPage + 1;
  const canGoPrevious = previousPage >= 1;
  const canGoNext = nextPage <= totalPages;

  return (
    <nav className="mt-10 flex items-center justify-between gap-4" aria-label="Paginación">
      {canGoPrevious ? (
        <Link
          href={buildPageHref(basePath, previousPage, query, category)}
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-public-border bg-white px-4 text-sm font-semibold text-public-ink transition hover:border-public-red hover:text-public-red focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-public-red focus-visible:ring-offset-2"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Anterior
        </Link>
      ) : (
        <span
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-public-border bg-public-surface-subtle px-4 text-sm font-semibold text-public-muted"
          aria-disabled="true"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Anterior
        </span>
      )}

      <span className="text-sm font-medium text-public-muted">
        Página {currentPage} de {totalPages}
      </span>

      {canGoNext ? (
        <Link
          href={buildPageHref(basePath, nextPage, query, category)}
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-public-border bg-white px-4 text-sm font-semibold text-public-ink transition hover:border-public-red hover:text-public-red focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-public-red focus-visible:ring-offset-2"
        >
          Siguiente
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      ) : (
        <span
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-public-border bg-public-surface-subtle px-4 text-sm font-semibold text-public-muted"
          aria-disabled="true"
        >
          Siguiente
          <ArrowRight className="size-4" aria-hidden="true" />
        </span>
      )}
    </nav>
  );
}

export function PublicResultCount({
  totalItems,
  singularLabel,
  pluralLabel,
  className,
}: {
  totalItems: number;
  singularLabel: string;
  pluralLabel: string;
  className?: string;
}) {
  return (
    <p className={cn('text-sm font-medium text-public-muted', className)}>
      {totalItems === 1 ? `1 ${singularLabel}` : `${totalItems} ${pluralLabel}`}
    </p>
  );
}
