import type { ComponentPropsWithoutRef } from 'react';

import { cn } from '@/lib/utils';

type PublicContainerSize = 'default' | 'wide' | 'reading' | 'narrow';

interface PublicContainerProps extends ComponentPropsWithoutRef<'div'> {
  size?: PublicContainerSize;
}

const containerSizeClasses: Record<PublicContainerSize, string> = {
  default: 'max-w-public-default',
  wide: 'max-w-public-wide',
  reading: 'max-w-public-reading',
  narrow: 'max-w-public-narrow',
};

export function PublicContainer({ className, size = 'default', ...props }: PublicContainerProps) {
  return (
    <div
      className={cn(
        'mx-auto w-full px-4 sm:px-6 lg:px-8 xl:px-10',
        containerSizeClasses[size],
        className,
      )}
      {...props}
    />
  );
}
