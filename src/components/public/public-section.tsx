import type { ComponentPropsWithoutRef } from 'react';

import { cn } from '@/lib/utils';

interface PublicSectionProps extends ComponentPropsWithoutRef<'section'> {
  variant?: 'default' | 'compact' | 'hero' | 'flushTop';
}

const sectionVariantClasses: Record<NonNullable<PublicSectionProps['variant']>, string> = {
  default: 'pt-7 pb-12 md:pt-10 md:pb-20 lg:pt-12 lg:pb-24',
  compact: 'pt-6 pb-8 md:pt-8 md:pb-12 lg:pt-10 lg:pb-16',
  hero: 'py-public-section-hero',
  flushTop: 'pt-0 pb-8 md:pb-12 lg:pb-16',
};

export function PublicSection({ className, variant = 'default', ...props }: PublicSectionProps) {
  return <section className={cn(sectionVariantClasses[variant], className)} {...props} />;
}
