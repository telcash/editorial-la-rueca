import Link from 'next/link';

import { Button } from '@/components/ui/button';

export default function CategoryNotFoundPage() {
  return (
    <section className="rounded-lg border border-border bg-card px-6 py-10 text-center">
      <h1 className="text-xl font-semibold text-foreground">Categoría no encontrada</h1>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        La categoría solicitada no existe o ya no está disponible.
      </p>
      <Button asChild className="mt-6">
        <Link href="/admin/categories">Volver a categorías</Link>
      </Button>
    </section>
  );
}
