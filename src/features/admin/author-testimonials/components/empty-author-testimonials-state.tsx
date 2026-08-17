import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { AdminEmptyState } from '@/features/admin/components/feedback/admin-empty-state';

export function EmptyAuthorTestimonialsState() {
  return (
    <AdminEmptyState
      title="Todavía no hay testimonios"
      description="Añade testimonios de autores para preparar futuras secciones públicas de confianza editorial."
      action={
        <Button asChild>
          <Link href="/admin/testimonials/new">Nuevo testimonio</Link>
        </Button>
      }
    />
  );
}
