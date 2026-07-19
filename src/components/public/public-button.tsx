import Link from 'next/link';
import type { ComponentPropsWithoutRef } from 'react';

import { cn } from '@/lib/utils';

interface PublicButtonProps extends ComponentPropsWithoutRef<typeof Link> {
  variant?: 'primary' | 'secondary' | 'ghost';
}

export function PublicButton({ className, variant = 'primary', ...props }: PublicButtonProps) {
  return (
    <Link
      className={cn(
        'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-public-red focus-visible:ring-offset-2 focus-visible:ring-offset-white',
        variant === 'primary' &&
          'bg-public-red text-white hover:bg-public-red-hover active:bg-public-red-hover',
        variant === 'secondary' &&
          'border border-public-red bg-white text-public-ink hover:bg-public-red-soft hover:text-public-red',
        variant === 'ghost' && 'text-public-red hover:text-public-red-hover',
        className,
      )}
      {...props}
    />
  );
}
