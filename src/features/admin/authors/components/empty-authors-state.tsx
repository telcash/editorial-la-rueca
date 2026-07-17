import Link from 'next/link';
import { PenLine } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { AdminEmptyState } from '@/features/admin/components/feedback/admin-empty-state';

export function EmptyAuthorsState() {
  return (
    <AdminEmptyState
      title="Todavía no hay autores"
      description="Cuando se cree el primer autor, aparecerá en este listado administrativo."
      icon={<PenLine className="size-5" aria-hidden="true" />}
      action={
        <Button asChild>
          <Link href="/admin/authors/new">Nuevo autor</Link>
        </Button>
      }
    />
  );
}
