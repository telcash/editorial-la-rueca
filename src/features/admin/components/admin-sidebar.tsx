'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@/lib/utils';
import { AdminBrand, adminNavigationItems } from './admin-navigation';

function isActivePath(pathname: string, href: string) {
  return href === '/admin' ? pathname === href : pathname.startsWith(href);
}

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden min-h-screen w-64 shrink-0 border-r border-neutral-800 bg-neutral-950 lg:block">
      <div className="flex h-full flex-col">
        <div className="px-5 py-5">
          <AdminBrand />
        </div>

        <nav aria-label="Navegación principal" className="flex-1 space-y-1 px-3 py-2">
          {adminNavigationItems.map((item) => {
            const Icon = item.icon;
            const active = isActivePath(pathname, item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-neutral-300 transition hover:bg-neutral-900 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                  active && 'bg-primary text-primary-foreground hover:bg-primary hover:text-white',
                  item.disabled && 'text-neutral-500 hover:text-neutral-300',
                )}
              >
                <Icon className="size-4" aria-hidden="true" />
                <span className="flex-1">{item.label}</span>
                {item.disabled ? <span className="text-[10px] uppercase">Próx.</span> : null}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
