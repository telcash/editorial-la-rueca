import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { AdminEmptyState } from '@/features/admin/components/feedback/admin-empty-state';
import type { ArchiveStatus } from '@/features/admin/lib/archive-status';

interface EmptyServicesStateProps {
  status: ArchiveStatus;
}

export function EmptyServicesState({ status }: EmptyServicesStateProps) {
  if (status === 'archived') {
    return (
      <AdminEmptyState
        title="No hay servicios archivados"
        description="Cuando archives un servicio editorial aparecerá en esta vista."
      />
    );
  }

  return (
    <AdminEmptyState
      title="Todavía no hay servicios"
      description="Crea los servicios editoriales que después podrán relacionarse con leads y analítica comercial."
      action={
        <Button asChild>
          <Link href="/admin/services/new">Crear servicio</Link>
        </Button>
      }
    />
  );
}
