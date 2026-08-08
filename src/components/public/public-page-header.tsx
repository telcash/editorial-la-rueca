import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

interface PublicPageHeaderProps {
  title: string;
  description?: string;
  children?: ReactNode;
  variant?: 'default' | 'compact' | 'centered';
  className?: string;
}

const headerVariantClasses: Record<NonNullable<PublicPageHeaderProps['variant']>, string> = {
  default: 'pb-5 md:pb-6 lg:pb-8',
  compact: 'pb-4 md:pb-5 lg:pb-6',
  centered: 'pb-5 text-center md:pb-6 lg:pb-8',
};

const contentVariantClasses: Record<NonNullable<PublicPageHeaderProps['variant']>, string> = {
  default: 'max-w-public-reading',
  compact: 'max-w-public-reading',
  centered: 'mx-auto max-w-public-reading',
};

const childrenVariantClasses: Record<NonNullable<PublicPageHeaderProps['variant']>, string> = {
  default: 'mt-6 md:mt-8',
  compact: 'mt-public-content-gap-md',
  centered: 'mt-6 md:mt-8',
};

export function PublicPageHeader({
  title,
  description,
  children,
  variant = 'default',
  className,
}: PublicPageHeaderProps) {
  return (
    <header className={cn(headerVariantClasses[variant], className)}>
      <div className={contentVariantClasses[variant]}>
        <h1 className="m-0 font-serif-public text-public-page-title font-semibold tracking-normal text-public-ink">
          {title}
        </h1>
        {description ? (
          <p className="mt-3 max-w-public-reading whitespace-normal break-words text-public-lead text-public-muted md:mt-4">
            {description}
          </p>
        ) : null}
      </div>
      {children ? <div className={childrenVariantClasses[variant]}>{children}</div> : null}
    </header>
  );
}
