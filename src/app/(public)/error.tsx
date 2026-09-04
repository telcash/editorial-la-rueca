'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function PublicError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[PublicErrorBoundary]', error);
  }, [error]);

  return (
    <main className="flex min-h-[50vh] items-center justify-center px-4 py-16">
      <section className="w-full max-w-xl rounded-public-xl border border-public-border bg-public-surface p-8 text-center shadow-public-subtle">
        <h1 className="font-serif-public text-3xl font-semibold text-public-ink">
          No hemos podido cargar esta página
        </h1>
        <p className="mt-4 text-public-body text-public-muted">
          Ha ocurrido un problema inesperado. Puedes intentarlo de nuevo o volver a la página
          principal.
        </p>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center justify-center rounded-public-md bg-public-red px-5 py-3 text-sm font-bold text-white transition hover:bg-public-red-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-public-red focus-visible:ring-offset-2"
          >
            Intentar de nuevo
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-public-md border border-public-border px-5 py-3 text-sm font-bold text-public-ink transition hover:border-public-red hover:text-public-red focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-public-red focus-visible:ring-offset-2"
          >
            Ir al inicio
          </Link>
        </div>
      </section>
    </main>
  );
}
