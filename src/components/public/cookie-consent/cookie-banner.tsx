'use client';

import Link from 'next/link';

import { useCookieConsent } from './cookie-consent-provider';

export function CookieBanner() {
  const { acceptAll, rejectAll, openSettings } = useCookieConsent();

  return (
    <aside
      role="region"
      aria-label="Consentimiento de cookies"
      className="fixed inset-x-3 bottom-3 z-50 rounded-2xl border border-public-border bg-white p-5 shadow-public-elevated sm:inset-x-6 sm:bottom-6 sm:p-6 lg:inset-x-auto lg:right-8 lg:max-w-2xl"
    >
      <div className="grid gap-5 sm:grid-cols-[1fr_auto] sm:items-end">
        <div>
          <h2 className="font-serif-public text-xl font-semibold text-public-ink">
            Usamos cookies
          </h2>
          <p className="mt-2 text-sm leading-6 text-public-muted">
            Utilizamos cookies necesarias para el funcionamiento del sitio y, con tu permiso,
            cookies de analítica y otras tecnologías para conocer cómo se utiliza nuestra web y
            mejorar nuestros servicios. Puedes aceptar, rechazar o configurar tus preferencias.
          </p>
          <Link
            href="/politica-de-cookies"
            className="mt-3 inline-flex text-sm font-semibold text-public-red underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-public-red"
          >
            Política de cookies
          </Link>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:min-w-72">
          <button
            type="button"
            onClick={rejectAll}
            className="min-h-11 rounded-lg border border-public-border-interactive px-3 py-2 text-sm font-semibold text-public-ink transition hover:border-public-red hover:text-public-red focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-public-red"
          >
            Rechazar
          </button>
          <button
            type="button"
            onClick={openSettings}
            className="min-h-11 rounded-lg border border-public-border-interactive px-3 py-2 text-sm font-semibold text-public-ink transition hover:border-public-red hover:text-public-red focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-public-red"
          >
            Configurar
          </button>
          <button
            type="button"
            onClick={acceptAll}
            className="min-h-11 rounded-lg bg-public-red px-3 py-2 text-sm font-semibold text-white transition hover:bg-public-red-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-public-red focus-visible:ring-offset-2"
          >
            Aceptar
          </button>
        </div>
      </div>
    </aside>
  );
}
