import Link from 'next/link';
import { FolderTree } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { AdminEmptyState } from '@/features/admin/components/feedback/admin-empty-state';
import type { ArchiveStatus } from '@/features/admin/lib/archive-status';

const emptyStateContent: Record<ArchiveStatus, { title: string; description: string }> = {
  active: {
    title: 'No hay categorías activas.',
    description: 'Crea la primera categoría editorial para organizar el catálogo.',
  },
  archived: {
    title: 'No hay categorías archivadas.',
    description: 'Las categorías archivadas aparecerán aquí cuando existan.',
  },
  all: {
    title: 'No hay categorías.',
    description: 'Crea la primera categoría editorial para empezar a organizar libros.',
  },
};

export function EmptyCategoriesState({ status }: { status: ArchiveStatus }) {
  const content = emptyStateContent[status];

  return (
    <AdminEmptyState
      title={content.title}
      description={content.description}
      icon={<FolderTree className="size-5" aria-hidden="true" />}
      action={
        status === 'archived' ? null : (
          <Button asChild>
            <Link href="/admin/categories/new">Nueva categoría</Link>
          </Button>
        )
      }
    />
  );
}
