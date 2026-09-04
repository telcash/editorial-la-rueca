import Link from 'next/link';

export function PublicNotFound() {
  return (
    <main className="flex min-h-[60vh] items-center justify-center bg-public-background px-4 py-16 font-public text-public-ink sm:py-24">
      <div className="w-full max-w-2xl text-center">
        <p className="font-serif-public text-7xl font-semibold leading-none text-public-red sm:text-8xl">
          404
        </p>
        <h1 className="mt-6 font-serif-public text-3xl font-semibold tracking-normal sm:text-4xl">
          Esta página se ha quedado entre páginas.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-public-body leading-7 text-public-muted sm:text-public-lead">
          No hemos encontrado lo que buscabas. Puedes volver al inicio o seguir explorando nuestro
          catálogo.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-public-md bg-public-red px-5 py-3 text-sm font-bold text-white transition hover:bg-public-red-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-public-red focus-visible:ring-offset-2"
          >
            Volver al inicio
          </Link>
          <Link
            href="/libros"
            className="inline-flex items-center justify-center rounded-public-md border border-public-border bg-public-surface px-5 py-3 text-sm font-bold text-public-ink transition hover:border-public-red hover:text-public-red focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-public-red focus-visible:ring-offset-2"
          >
            Explorar libros
          </Link>
        </div>
      </div>
    </main>
  );
}
