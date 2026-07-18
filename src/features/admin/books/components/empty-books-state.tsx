import { BookOpenText } from 'lucide-react';

import { AdminEmptyState } from '@/features/admin/components/feedback/admin-empty-state';
import type { ArchiveStatus } from '@/features/admin/lib/archive-status';

interface EmptyBooksStateProps {
  status?: ArchiveStatus;
}

function getEmptyContent(status: ArchiveStatus) {
  if (status === 'archived') {
    return {
      title: 'No hay libros archivados',
      description: 'Los libros archivados aparecerán aquí cuando existan.',
    };
  }

  if (status === 'all') {
    return {
      title: 'Todavía no hay libros',
      description:
        'Cuando agregues el primer libro, aparecerá aquí con sus autores, ediciones y precios.',
    };
  }

  return {
    title: 'No hay libros activos',
    description:
      'Cuando agregues o restaures un libro, aparecerá aquí con sus autores, ediciones y precios.',
  };
}

export function EmptyBooksState({ status = 'active' }: EmptyBooksStateProps) {
  const content = getEmptyContent(status);

  return (
    <AdminEmptyState
      title={content.title}
      description={content.description}
      icon={<BookOpenText className="size-5" aria-hidden="true" />}
    />
  );
}
