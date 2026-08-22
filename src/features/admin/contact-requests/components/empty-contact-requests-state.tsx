import { AdminEmptyState } from '@/features/admin/components/feedback/admin-empty-state';

export function EmptyContactRequestsState() {
  return (
    <AdminEmptyState
      title="Todavía no hay solicitudes"
      description="Cuando se conecten los formularios públicos, las solicitudes comerciales aparecerán aquí."
    />
  );
}
