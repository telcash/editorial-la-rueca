import Link from 'next/link';
import { Phone } from 'lucide-react';

import { siteConfig } from '@/config/site';
import { getPublicQuaresMarkets } from '@/features/public/sales/public-sales-markets';
import { PublicButton } from './public-button';
import { PublicContainer } from './public-container';
import { PublicLogo } from './public-logo';
import { publicNavigation } from './public-navigation';
import { MobileNavigation } from './mobile-navigation';
import { PublicStoreDropdown } from './public-store-dropdown';

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unknown error';
}

async function getPublicStoreMarkets() {
  try {
    return await getPublicQuaresMarkets();
  } catch (error) {
    console.error('[PublicHeader] Store markets query failed', {
      message: getErrorMessage(error),
    });

    return [];
  }
}

export async function PublicHeader() {
  const storeMarkets = await getPublicStoreMarkets();

  return (
    <header className="sticky top-0 z-40 border-b border-public-border bg-white/95 backdrop-blur-sm">
      <PublicContainer className="hidden h-16 items-center justify-between gap-8 xl:flex">
        <div className="flex min-w-0 items-center gap-8">
          <PublicLogo className="shrink-0" />

          <nav aria-label="Navegación principal" className="flex min-w-0 items-center gap-6">
            {publicNavigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="whitespace-nowrap text-sm font-medium text-public-ink transition hover:text-public-red focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-public-red focus-visible:ring-offset-2"
              >
                {item.label}
              </Link>
            ))}
            <PublicStoreDropdown markets={storeMarkets} />
          </nav>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-6">
          {siteConfig.contact.phone ? (
            <a
              href={`tel:${siteConfig.contact.phone.replaceAll(' ', '')}`}
              className="inline-flex items-center gap-2 whitespace-nowrap text-sm font-semibold text-public-ink transition hover:text-public-red focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-public-red focus-visible:ring-offset-2"
            >
              <Phone className="size-5" aria-hidden="true" />
              {siteConfig.contact.phone}
            </a>
          ) : null}
          <PublicButton
            href="/#publica-tu-libro"
            className="min-h-10 whitespace-nowrap rounded-full px-5"
          >
            Solicitar asesoría
          </PublicButton>
        </div>
      </PublicContainer>

      <PublicContainer className="flex h-16 items-center justify-between gap-4 xl:hidden">
        <div className="flex min-w-0 items-center gap-2.5">
          <MobileNavigation storeMarkets={storeMarkets} />
          <PublicLogo className="shrink-0" />
        </div>
        <div className="flex shrink-0 justify-end">
          <PublicButton
            href="/#publica-tu-libro"
            className="min-h-9 whitespace-nowrap rounded-lg px-2 text-[11px] sm:min-h-10 sm:px-3.5 sm:text-sm"
          >
            Solicitar asesoría
          </PublicButton>
        </div>
      </PublicContainer>
    </header>
  );
}
