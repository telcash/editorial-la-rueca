'use client';

import { Button } from '@/components/ui/button';

export default function AdminEditBookError({ reset }: { reset: () => void }) {
  return (
    <section className="space-y-4 rounded-lg border border-border bg-card p-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-foreground">No se pudo cargar el libro</h1>
        <p className="text-sm text-muted-foreground">
          Inténtalo de nuevo. Si el problema persiste, revisa la conexión o vuelve al listado.
        </p>
      </div>
      <Button type="button" onClick={reset}>
        Reintentar
      </Button>
    </section>
  );
}
