import Link from 'next/link';
import { PenLine } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { AdminEmptyState } from '@/features/admin/components/feedback/admin-empty-state';
import type { ArchiveStatus } from '@/features/admin/lib/archive-status';

interface EmptyAuthorsStateProps {
  status?: ArchiveStatus;
}

function getEmptyContent(status: ArchiveStatus) {
  if (status === 'archived') {
    return {
      title: 'No hay autores archivados',
      description: 'Los autores archivados aparecerán aquí cuando existan.',
      action: null,
    };
  }

  if (status === 'all') {
    return {
      title: 'Todavía no hay autores',
      description: 'Cuando se cree el primer autor, aparecerá en este listado administrativo.',
      action: (
        <Button asChild>
          <Link href="/admin/authors/new">Nuevo autor</Link>
        </Button>
      ),
    };
  }

  return {
    title: 'No hay autores activos',
    description: 'Cuando se cree o restaure un autor, aparecerá en este listado.',
    action: (
      <Button asChild>
        <Link href="/admin/authors/new">Nuevo autor</Link>
      </Button>
    ),
  };
}

export function EmptyAuthorsState({ status = 'active' }: EmptyAuthorsStateProps) {
  const content = getEmptyContent(status);

  return (
    <AdminEmptyState
      title={content.title}
      description={content.description}
      icon={<PenLine className="size-5" aria-hidden="true" />}
      action={content.action}
    />
  );
}
