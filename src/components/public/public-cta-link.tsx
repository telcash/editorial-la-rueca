import Link from 'next/link';
import type { ComponentPropsWithoutRef } from 'react';
import { ArrowRight } from 'lucide-react';

import { cn } from '@/lib/utils';

type PublicCtaLinkProps = ComponentPropsWithoutRef<typeof Link>;

export function PublicCtaLink({ className, children, ...props }: PublicCtaLinkProps) {
  return (
    <Link
      className={cn(
        'inline-flex items-center gap-2 text-sm font-semibold text-public-red transition hover:text-public-red-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-public-red focus-visible:ring-offset-2',
        className,
      )}
      {...props}
    >
      {children}
      <ArrowRight className="size-4" aria-hidden="true" />
    </Link>
  );
}
