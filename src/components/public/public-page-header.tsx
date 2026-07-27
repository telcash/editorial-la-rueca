import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

interface PublicPageHeaderProps {
  title: string;
  description?: string;
  children?: ReactNode;
  className?: string;
}

export function PublicPageHeader({
  title,
  description,
  children,
  className,
}: PublicPageHeaderProps) {
  return (
    <header className={cn('pb-5 md:pb-6 lg:pb-8', className)}>
      <div className="max-w-3xl">
        <h1 className="m-0 font-serif-public text-[clamp(2.25rem,5vw,4rem)] leading-[0.98] tracking-normal text-public-ink">
          {title}
        </h1>
        {description ? (
          <p className="mt-3 max-w-[48rem] whitespace-normal break-words text-base leading-7 text-public-muted md:mt-4 md:text-lg md:leading-8">
            {description}
          </p>
        ) : null}
      </div>
      {children ? <div className="mt-6 md:mt-8">{children}</div> : null}
    </header>
  );
}
