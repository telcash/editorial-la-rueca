import Link from 'next/link';

import { cn } from '@/lib/utils';
import type { ArchiveStatus } from '../lib/archive-status';

interface ArchiveStatusFilterProps {
  baseHref: string;
  currentStatus: ArchiveStatus;
  query?: string;
}

const options: Array<{ status: ArchiveStatus; label: string }> = [
  { status: 'active', label: 'Activos' },
  { status: 'archived', label: 'Archivados' },
  { status: 'all', label: 'Todos' },
];

function buildHref(baseHref: string, status: ArchiveStatus, query: string | undefined) {
  const params = new URLSearchParams();

  if (status !== 'active') {
    params.set('status', status);
  }

  if (query) {
    params.set('q', query);
  }

  const search = params.toString();

  return search ? `${baseHref}?${search}` : baseHref;
}

export function ArchiveStatusFilter({ baseHref, currentStatus, query }: ArchiveStatusFilterProps) {
  return (
    <nav className="flex flex-wrap gap-2" aria-label="Filtrar por estado de archivo">
      {options.map((option) => {
        const isActive = option.status === currentStatus;
        const href = buildHref(baseHref, option.status, query);

        return (
          <Link
            key={option.status}
            href={href}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'rounded-md border border-border px-3 py-2 text-sm font-medium transition-colors',
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'bg-background text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            {option.label}
          </Link>
        );
      })}
    </nav>
  );
}
