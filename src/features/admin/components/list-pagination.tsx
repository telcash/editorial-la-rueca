import Link from 'next/link';

import { Button } from '@/components/ui/button';
import type { ArchiveStatus } from '../lib/archive-status';

interface ListPaginationProps {
  baseHref: string;
  status: ArchiveStatus;
  query: string;
  page: number;
  totalPages: number;
  totalItems: number;
}

function buildHref(baseHref: string, status: ArchiveStatus, query: string, page: number) {
  const params = new URLSearchParams();

  if (status !== 'active') {
    params.set('status', status);
  }

  if (query) {
    params.set('q', query);
  }

  if (page > 1) {
    params.set('page', String(page));
  }

  const search = params.toString();

  return search ? `${baseHref}?${search}` : baseHref;
}

export function ListPagination({
  baseHref,
  status,
  query,
  page,
  totalPages,
  totalItems,
}: ListPaginationProps) {
  const hasPrevious = page > 1;
  const hasNext = page < totalPages;

  return (
    <nav
      aria-label="Paginación"
      className="flex flex-col gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between"
    >
      <p>
        Página <span className="font-medium text-foreground">{page}</span> de{' '}
        <span className="font-medium text-foreground">{totalPages}</span>
        <span className="ml-2">({totalItems} registros)</span>
      </p>
      <div className="flex gap-2">
        <Button asChild={hasPrevious} variant="outline" size="sm" disabled={!hasPrevious}>
          {hasPrevious ? (
            <Link href={buildHref(baseHref, status, query, page - 1)}>Anterior</Link>
          ) : (
            <span>Anterior</span>
          )}
        </Button>
        <Button asChild={hasNext} variant="outline" size="sm" disabled={!hasNext}>
          {hasNext ? (
            <Link href={buildHref(baseHref, status, query, page + 1)}>Siguiente</Link>
          ) : (
            <span>Siguiente</span>
          )}
        </Button>
      </div>
    </nav>
  );
}
