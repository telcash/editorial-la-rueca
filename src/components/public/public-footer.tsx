import Link from 'next/link';
import { Clock, Mail, MapPin, Phone } from 'lucide-react';

import { siteConfig } from '@/config/site';
import { PublicButton } from './public-button';
import { PublicContainer } from './public-container';
import { PublicLogo } from './public-logo';
import { publicFooterNavigation } from './public-navigation';
import { CookieSettingsButton } from './cookie-consent/cookie-settings-button';

const socialItems = [
  { label: 'Instagram', href: siteConfig.socialLinks.instagram, mark: 'IG' },
  { label: 'Facebook', href: siteConfig.socialLinks.facebook, mark: 'f' },
  { label: 'LinkedIn', href: siteConfig.socialLinks.linkedin, mark: 'in' },
  { label: 'X', href: siteConfig.socialLinks.x, mark: 'X' },
  { label: 'YouTube', href: siteConfig.socialLinks.youtube, mark: '▶' },
];

export function PublicFooter() {
  const currentYear = new Date().getFullYear();
  const hasContact =
    siteConfig.contact.phone ||
    siteConfig.contact.email ||
    siteConfig.contact.address ||
    siteConfig.contact.schedule;

  return (
    <footer className="border-t border-public-border bg-white">
      <PublicContainer className="py-10 md:py-14">
        <div className="grid gap-9 md:grid-cols-2 lg:grid-cols-[1.45fr_1fr_1.35fr_1fr_1.9fr] lg:items-start lg:gap-12">
          <div className="space-y-5">
            <PublicLogo variant="footer" />
            <p className="max-w-xs text-sm leading-6 text-public-muted">{siteConfig.positioning}</p>
          </div>

          <nav aria-label="Navegación secundaria" className="space-y-4">
            <h2 className="text-sm font-bold text-public-ink">Enlaces</h2>
            <ul className="space-y-2.5 text-sm text-public-muted">
              {publicFooterNavigation.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="transition hover:text-public-red focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-public-red focus-visible:ring-offset-2"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href="/aviso-legal"
                  className="transition hover:text-public-red focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-public-red focus-visible:ring-offset-2"
                >
                  Aviso legal
                </Link>
              </li>
              <li>
                <Link
                  href="/politica-de-privacidad"
                  className="transition hover:text-public-red focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-public-red focus-visible:ring-offset-2"
                >
                  Política de privacidad
                </Link>
              </li>
              <li>
                <Link
                  href="/politica-de-cookies"
                  className="transition hover:text-public-red focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-public-red focus-visible:ring-offset-2"
                >
                  Política de cookies
                </Link>
              </li>
              <li>
                <CookieSettingsButton />
              </li>
            </ul>
          </nav>

          <div className="space-y-4">
            <h2 className="text-sm font-bold text-public-ink">Contacto</h2>
            {hasContact ? (
              <ul className="space-y-3 text-sm text-public-muted">
                {siteConfig.contact.phone ? (
                  <li className="flex gap-2">
                    <Phone className="mt-0.5 size-4 shrink-0 text-public-ink" aria-hidden="true" />
                    {siteConfig.contact.phone}
                  </li>
                ) : null}
                {siteConfig.contact.email ? (
                  <li className="flex gap-2">
                    <Mail className="mt-0.5 size-4 shrink-0 text-public-ink" aria-hidden="true" />
                    {siteConfig.contact.email}
                  </li>
                ) : null}
                {siteConfig.contact.address ? (
                  <li className="flex gap-2">
                    <MapPin className="mt-0.5 size-4 shrink-0 text-public-ink" aria-hidden="true" />
                    {siteConfig.contact.address}
                  </li>
                ) : null}
                {siteConfig.contact.schedule ? (
                  <li className="flex gap-2">
                    <Clock className="mt-0.5 size-4 shrink-0 text-public-ink" aria-hidden="true" />
                    {siteConfig.contact.schedule}
                  </li>
                ) : null}
              </ul>
            ) : (
              <p className="max-w-48 text-sm leading-6 text-public-muted">
                Datos de contacto pendientes de configurar.
              </p>
            )}
          </div>

          <div className="space-y-4">
            <h2 className="text-sm font-bold text-public-ink">Síguenos</h2>
            <div className="flex flex-wrap gap-3">
              {socialItems.map((item) =>
                item.href ? (
                  <a
                    key={item.label}
                    href={item.href}
                    aria-label={item.label}
                    target="_blank"
                    className="inline-flex size-10 items-center justify-center rounded-full bg-public-ink text-xs font-bold text-white transition hover:bg-public-red focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-public-red focus-visible:ring-offset-2"
                  >
                    {item.mark}
                  </a>
                ) : (
                  <span
                    key={item.label}
                    aria-label={`${item.label} pendiente de configurar`}
                    aria-disabled="true"
                    className="inline-flex size-10 items-center justify-center rounded-full border border-public-border bg-public-surface-subtle text-xs font-bold text-public-muted"
                  >
                    {item.mark}
                  </span>
                ),
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-public-border bg-public-surface-subtle p-5 md:col-span-2 lg:col-span-1">
            <h2 className="font-serif-public text-xl font-semibold leading-tight text-public-ink">
              ¿Listo para dar el siguiente paso con tu libro?
            </h2>
            <p className="mt-3 text-sm leading-6 text-public-muted">
              Hablemos de tu proyecto y preparemos juntos el camino para que tu historia llegue más
              lejos.
            </p>
            <PublicButton href="/#publica-tu-libro" className="mt-5 w-full md:w-auto">
              Solicitar asesoría
            </PublicButton>
          </div>
        </div>

        <p className="mt-10 border-t border-public-border pt-6 text-center text-xs text-public-muted">
          © {currentYear} {siteConfig.name}. Todos los derechos reservados.
        </p>
      </PublicContainer>
    </footer>
  );
}
