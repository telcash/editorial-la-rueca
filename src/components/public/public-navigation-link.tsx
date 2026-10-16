'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils';

type PublicNavigationLinkProps = Omit<ComponentProps<typeof Link>, 'href' | 'aria-current'> & {
  href: string;
  variant?: 'desktop' | 'mobile';
};

export function PublicNavigationLink({
  href,
  variant = 'desktop',
  className,
  children,
  ...props
}: PublicNavigationLinkProps) {
  const pathname = usePathname();
  const isActive = pathname === href || (href !== '/' && Boolean(pathname?.startsWith(`${href}/`)));

  return (
    <Link
      {...props}
      href={href}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        variant === 'desktop'
          ? 'relative whitespace-nowrap text-sm font-medium text-public-ink transition hover:text-public-red focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-public-red focus-visible:ring-offset-2'
          : 'rounded-lg px-3 py-3 text-base font-medium transition hover:bg-public-red-soft hover:text-public-red focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-public-red',
        variant === 'mobile' && (isActive ? 'text-public-red' : 'text-public-ink'),
        className,
      )}
    >
      {children}
      {variant === 'desktop' && isActive ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 -bottom-1.5 h-0.5 rounded-full bg-public-red"
        />
      ) : null}
    </Link>
  );
}
