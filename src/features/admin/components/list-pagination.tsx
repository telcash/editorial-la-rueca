import Link from 'next/link';

import { Button } from '@/components/ui/button';
import type { ArchiveStatus } from '../lib/archive-status';
import {
  ADMIN_LIST_PAGE_SIZE_OPTIONS,
  buildListHref,
  getVisiblePageNumbers,
} from '../lib/list-query';

interface ListPaginationProps {
  baseHref: string;
  status: ArchiveStatus;
  query: string;
  page: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
  params?: Record<string, string | number | undefined>;
}

export function ListPagination({
  baseHref,
  status,
  query,
  page,
  pageSize,
  totalPages,
  totalItems,
  params = {},
}: ListPaginationProps) {
  const hasPrevious = page > 1;
  const hasNext = page < totalPages;
  const visiblePages = getVisiblePageNumbers(page, totalPages);
  const firstItem = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastItem = Math.min(page * pageSize, totalItems);

  function getHref(nextParams: Record<string, string | number | undefined>) {
    return buildListHref(baseHref, {
      status,
      q: query,
      page,
      pageSize,
      ...params,
      ...nextParams,
    });
  }

  return (
    <nav
      aria-label="Paginación"
      className="flex flex-col gap-4 rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted-foreground lg:flex-row lg:items-center lg:justify-between"
    >
      <div className="space-y-1">
        <p>
          Mostrando <span className="font-medium text-foreground">{firstItem}</span>–
          <span className="font-medium text-foreground">{lastItem}</span> de{' '}
          <span className="font-medium text-foreground">{totalItems}</span> resultados
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <span>Tamaño:</span>
          {ADMIN_LIST_PAGE_SIZE_OPTIONS.map((option) => (
            <Link
              key={option}
              href={getHref({ page: 1, pageSize: option })}
              aria-current={option === pageSize ? 'page' : undefined}
              className={
                option === pageSize
                  ? 'rounded-md bg-primary px-2 py-1 text-primary-foreground'
                  : 'rounded-md px-2 py-1 hover:bg-muted hover:text-foreground'
              }
            >
              {option}
            </Link>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button asChild={hasPrevious} variant="outline" size="sm" disabled={!hasPrevious}>
          {hasPrevious ? (
            <Link href={getHref({ page: page - 1 })}>Anterior</Link>
          ) : (
            <span>Anterior</span>
          )}
        </Button>
        {visiblePages.map((visiblePage, index) => {
          const previousPage = visiblePages[index - 1];
          const showGap = previousPage !== undefined && visiblePage - previousPage > 1;

          return (
            <span key={visiblePage} className="flex items-center gap-2">
              {showGap ? <span aria-hidden="true">…</span> : null}
              <Link
                href={getHref({ page: visiblePage })}
                aria-current={visiblePage === page ? 'page' : undefined}
                className={
                  visiblePage === page
                    ? 'inline-flex size-9 items-center justify-center rounded-md bg-primary font-medium text-primary-foreground'
                    : 'inline-flex size-9 items-center justify-center rounded-md border border-border bg-background font-medium text-foreground hover:bg-muted'
                }
              >
                {visiblePage}
              </Link>
            </span>
          );
        })}
        <Button asChild={hasNext} variant="outline" size="sm" disabled={!hasNext}>
          {hasNext ? (
            <Link href={getHref({ page: page + 1 })}>Siguiente</Link>
          ) : (
            <span>Siguiente</span>
          )}
        </Button>
      </div>
    </nav>
  );
}
