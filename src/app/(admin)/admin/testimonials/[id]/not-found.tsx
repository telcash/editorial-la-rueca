import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { AdminEmptyState } from '@/features/admin/components/feedback/admin-empty-state';

export default function AuthorTestimonialNotFoundPage() {
  return (
    <AdminEmptyState
      title="Testimonio no encontrado"
      description="El testimonio solicitado no existe o ya no está disponible."
      action={
        <Button asChild>
          <Link href="/admin/testimonials">Volver a testimonios</Link>
        </Button>
      }
    />
  );
}
