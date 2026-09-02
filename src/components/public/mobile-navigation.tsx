'use client';

import Link from 'next/link';
import { ChevronDown, ExternalLink, Menu } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useId, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { PublicButton } from './public-button';
import { publicNavigation } from './public-navigation';
import type { PublicSalesChannelMarket } from '@/services/sales/sales.types';

interface MobileNavigationProps {
  storeMarkets?: PublicSalesChannelMarket[];
}

export function MobileNavigation({ storeMarkets = [] }: MobileNavigationProps) {
  const [open, setOpen] = useState(false);
  const [storeOpen, setStoreOpen] = useState(false);
  const pathname = usePathname();
  const menuId = useId();
  const storeMenuId = useId();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Abrir menú"
          aria-expanded={open}
          aria-controls={menuId}
          className="size-11 text-public-ink hover:bg-public-red-soft hover:text-public-red"
        >
          <Menu className="size-6" aria-hidden="true" />
        </Button>
      </SheetTrigger>
      <SheetContent
        id={menuId}
        side="left"
        className="w-[min(21rem,86vw)] overflow-y-auto border-public-border bg-white p-0 text-public-ink"
      >
        <SheetHeader className="border-b border-public-border px-5 py-5 text-left">
          <SheetTitle className="font-serif-public text-2xl text-public-ink">
            Editorial La Rueca
          </SheetTitle>
          <SheetDescription className="text-public-muted">
            Navegación principal de la web pública.
          </SheetDescription>
        </SheetHeader>
        <nav aria-label="Navegación móvil" className="flex flex-col px-3 py-4">
          {publicNavigation.map((item) => {
            const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);

            return (
              <SheetClose key={item.href} asChild>
                <Link
                  href={item.href}
                  className={cn(
                    'rounded-lg px-3 py-3 text-base font-medium transition hover:bg-public-red-soft hover:text-public-red focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-public-red',
                    isActive ? 'text-public-red' : 'text-public-ink',
                  )}
                >
                  {item.label}
                </Link>
              </SheetClose>
            );
          })}
          {storeMarkets.length > 0 ? (
            <div className="border-t border-public-border-soft pt-2">
              <button
                type="button"
                aria-expanded={storeOpen}
                aria-controls={storeMenuId}
                onClick={() => setStoreOpen((currentValue) => !currentValue)}
                className="flex min-h-12 w-full items-center justify-between rounded-lg px-3 py-3 text-left text-base font-medium transition hover:bg-public-red-soft hover:text-public-red focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-public-red"
              >
                Tienda
                <ChevronDown
                  className={cn('size-5 transition-transform', storeOpen && 'rotate-180')}
                  aria-hidden="true"
                />
              </button>
              {storeOpen ? (
                <div id={storeMenuId} className="grid gap-1 pb-2 pl-3">
                  {storeMarkets.map((market) => (
                    <SheetClose key={`${market.countryCode ?? 'market'}-${market.name}`} asChild>
                      <a
                        href={market.baseUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex min-h-11 items-center justify-between rounded-lg px-3 py-2.5 text-sm text-public-ink transition hover:bg-public-red-soft hover:text-public-red focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-public-red"
                      >
                        {market.name}
                        <ExternalLink className="size-4 text-public-muted" aria-hidden="true" />
                      </a>
                    </SheetClose>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </nav>
        <div className="mt-auto border-t border-public-border p-5">
          <SheetClose asChild>
            <PublicButton href="/#contacto" className="w-full">
              Solicitar asesoría
            </PublicButton>
          </SheetClose>
        </div>
      </SheetContent>
    </Sheet>
  );
}
