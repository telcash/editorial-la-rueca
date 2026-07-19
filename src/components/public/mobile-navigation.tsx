'use client';

import Link from 'next/link';
import { Menu } from 'lucide-react';
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

const mobileNavigation = [...publicNavigation, { label: 'Contacto', href: '#contacto' }];

export function MobileNavigation() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const menuId = useId();

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
        className="w-[min(21rem,86vw)] border-public-border bg-white p-0 text-public-ink"
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
          {mobileNavigation.map((item) => {
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
        </nav>
        <div className="mt-auto border-t border-public-border p-5">
          <SheetClose asChild>
            <PublicButton href="#contacto" className="w-full">
              Solicitar asesoría
            </PublicButton>
          </SheetClose>
        </div>
      </SheetContent>
    </Sheet>
  );
}
