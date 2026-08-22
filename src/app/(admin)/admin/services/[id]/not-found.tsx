import Link from 'next/link';

import { Button } from '@/components/ui/button';

export default function ServiceNotFoundPage() {
  return (
    <section className="rounded-lg border border-border bg-card px-6 py-10 text-center">
      <h1 className="text-xl font-semibold text-foreground">Servicio no encontrado</h1>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        El servicio solicitado no existe o ya no está disponible.
      </p>
      <Button asChild className="mt-6">
        <Link href="/admin/services">Volver a servicios</Link>
      </Button>
    </section>
  );
}
