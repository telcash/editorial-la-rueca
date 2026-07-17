'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';

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
import { AdminBrand, adminNavigationItems } from './admin-navigation';

function isActivePath(pathname: string, href: string) {
  return href === '/admin' ? pathname === href : pathname.startsWith(href);
}

export function AdminMobileNavigation() {
  const pathname = usePathname();

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="lg:hidden" aria-label="Abrir navegación">
          <Menu className="size-4" aria-hidden="true" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80 border-neutral-800 bg-neutral-950 p-0 text-white">
        <SheetHeader className="border-b border-neutral-800 p-5 text-left">
          <SheetTitle>
            <AdminBrand />
          </SheetTitle>
          <SheetDescription className="sr-only">
            Navegación del panel administrativo
          </SheetDescription>
        </SheetHeader>
        <nav aria-label="Navegación móvil" className="space-y-1 px-3 py-4">
          {adminNavigationItems.map((item) => {
            const Icon = item.icon;
            const active = isActivePath(pathname, item.href);

            return (
              <SheetClose asChild key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-neutral-300 transition hover:bg-neutral-900 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                    active &&
                      'bg-primary text-primary-foreground hover:bg-primary hover:text-white',
                    item.disabled && 'text-neutral-500 hover:text-neutral-300',
                  )}
                >
                  <Icon className="size-4" aria-hidden="true" />
                  <span className="flex-1">{item.label}</span>
                  {item.disabled ? <span className="text-[10px] uppercase">Próx.</span> : null}
                </Link>
              </SheetClose>
            );
          })}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
