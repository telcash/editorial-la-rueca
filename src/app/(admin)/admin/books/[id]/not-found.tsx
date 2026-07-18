import Link from 'next/link';

import { Button } from '@/components/ui/button';

export default function AdminBookNotFound() {
  return (
    <section className="space-y-4 rounded-lg border border-border bg-card p-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-foreground">Libro no encontrado</h1>
        <p className="text-sm text-muted-foreground">
          El libro solicitado no existe o ya no está disponible.
        </p>
      </div>
      <Button asChild>
        <Link href="/admin/books">Volver a libros</Link>
      </Button>
    </section>
  );
}
