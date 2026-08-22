import Link from 'next/link';

import { Button } from '@/components/ui/button';

export default function ContactRequestNotFoundPage() {
  return (
    <section className="mx-auto max-w-xl space-y-4 rounded-lg border border-border bg-card p-6 text-center">
      <h1 className="text-2xl font-semibold text-foreground">Solicitud no encontrada</h1>
      <p className="text-sm text-muted-foreground">
        La solicitud indicada no existe o ya no está disponible.
      </p>
      <Button asChild>
        <Link href="/admin/contact-requests">Volver a solicitudes</Link>
      </Button>
    </section>
  );
}
