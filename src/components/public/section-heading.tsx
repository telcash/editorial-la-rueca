import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

interface SectionHeadingProps {
  title: string;
  description?: string;
  action?: ReactNode;
  align?: 'left' | 'center';
  className?: string;
}

export function SectionHeading({
  title,
  description,
  action,
  align = 'left',
  className,
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between',
        align === 'center' && 'items-center text-center sm:flex-col sm:items-center',
        className,
      )}
    >
      <div className="max-w-2xl">
        <h2 className="font-serif-public text-[clamp(1.75rem,4vw,2.625rem)] leading-tight tracking-normal text-public-ink">
          {title}
        </h2>
        {description ? (
          <p className="mt-3 text-base leading-7 text-public-muted md:text-lg">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
