import type { ComponentPropsWithoutRef } from 'react';

import { cn } from '@/lib/utils';

interface PublicSectionProps extends ComponentPropsWithoutRef<'section'> {
  variant?: 'default' | 'compact';
}

export function PublicSection({ className, variant = 'default', ...props }: PublicSectionProps) {
  return (
    <section
      className={cn(
        variant === 'default' ? 'py-12 md:py-20 lg:py-24' : 'py-8 md:py-12 lg:py-16',
        className,
      )}
      {...props}
    />
  );
}
