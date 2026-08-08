import type { ComponentPropsWithoutRef } from 'react';

import { cn } from '@/lib/utils';

type PublicCardProps = ComponentPropsWithoutRef<'div'>;

export function PublicCard({ className, ...props }: PublicCardProps) {
  return (
    <div
      className={cn(
        'rounded-public-lg border border-public-border bg-public-surface shadow-public-card',
        className,
      )}
      {...props}
    />
  );
}
