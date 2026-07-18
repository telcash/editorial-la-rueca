'use client';

import { AlertTriangle, RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';

export default function AdminDashboardError({ unstable_retry }: { unstable_retry: () => void }) {
  return (
    <section className="rounded-lg border border-border bg-card px-6 py-10 text-center">
      <div className="mx-auto flex size-10 items-center justify-center rounded-md bg-accent text-primary">
        <AlertTriangle className="size-5" aria-hidden="true" />
      </div>
      <h1 className="mt-4 text-xl font-semibold text-foreground">
        No se pudo cargar el dashboard.
      </h1>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        Intenta recargar la pantalla. Si el problema continúa, vuelve a intentarlo más tarde.
      </p>
      <Button type="button" className="mt-6" onClick={() => unstable_retry()}>
        <RefreshCw className="size-4" aria-hidden="true" />
        Reintentar
      </Button>
    </section>
  );
}
