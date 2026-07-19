import type { ComponentPropsWithoutRef } from 'react';

import { cn } from '@/lib/utils';

type PublicContainerProps = ComponentPropsWithoutRef<'div'>;

export function PublicContainer({ className, ...props }: PublicContainerProps) {
  return (
    <div
      className={cn('mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 xl:px-10', className)}
      {...props}
    />
  );
}
