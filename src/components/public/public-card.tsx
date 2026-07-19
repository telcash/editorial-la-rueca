import type { ComponentPropsWithoutRef } from 'react';

import { cn } from '@/lib/utils';

type PublicCardProps = ComponentPropsWithoutRef<'div'>;

export function PublicCard({ className, ...props }: PublicCardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-public-border bg-public-surface shadow-[0_14px_40px_rgba(23,23,23,0.06)]',
        className,
      )}
      {...props}
    />
  );
}
