import Link from 'next/link';

import { cn } from '@/lib/utils';
import type { ArchiveStatus } from '../lib/archive-status';

interface ArchiveStatusFilterProps {
  baseHref: string;
  currentStatus: ArchiveStatus;
}

const options: Array<{ status: ArchiveStatus; label: string }> = [
  { status: 'active', label: 'Activos' },
  { status: 'archived', label: 'Archivados' },
  { status: 'all', label: 'Todos' },
];

export function ArchiveStatusFilter({ baseHref, currentStatus }: ArchiveStatusFilterProps) {
  return (
    <nav className="flex flex-wrap gap-2" aria-label="Filtrar por estado de archivo">
      {options.map((option) => {
        const isActive = option.status === currentStatus;
        const href = option.status === 'active' ? baseHref : `${baseHref}?status=${option.status}`;

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
