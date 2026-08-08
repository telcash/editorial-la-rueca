import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

interface SectionHeadingProps {
  title: string;
  description?: string;
  action?: ReactNode;
  align?: 'left' | 'center';
  variant?: 'default' | 'compact' | 'centered';
  className?: string;
  titleClassName?: string;
  descriptionClassName?: string;
}

type SectionHeadingVariant = NonNullable<SectionHeadingProps['variant']>;

const headingLayoutClasses: Record<SectionHeadingVariant, string> = {
  default: 'flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between',
  compact: 'flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between',
  centered: 'flex flex-col items-center text-center',
};

const headingContentClasses: Record<SectionHeadingVariant, string> = {
  default: 'max-w-public-reading',
  compact: 'max-w-public-reading',
  centered: 'mx-auto max-w-public-reading',
};

const headingTitleClasses: Record<SectionHeadingVariant, string> = {
  default: 'font-serif-public text-public-section-title tracking-normal text-public-ink',
  compact: 'font-serif-public text-public-section-title tracking-normal text-public-ink',
  centered: 'font-serif-public text-public-section-title tracking-normal text-public-ink',
};

const headingDescriptionClasses: Record<SectionHeadingVariant, string> = {
  default: 'mt-3 text-public-body text-public-muted',
  compact: 'mt-2 text-public-body-small text-public-muted',
  centered: 'mt-3 text-public-body text-public-muted',
};

function joinClasses(...classes: Array<string | undefined>) {
  return classes.filter(Boolean).join(' ');
}

export function SectionHeading({
  title,
  description,
  action,
  align = 'left',
  variant,
  className,
  titleClassName,
  descriptionClassName,
}: SectionHeadingProps) {
  const resolvedVariant = variant ?? (align === 'center' ? 'centered' : 'default');

  return (
    <div className={cn(headingLayoutClasses[resolvedVariant], className)}>
      <div className={headingContentClasses[resolvedVariant]}>
        <h2 className={joinClasses(headingTitleClasses[resolvedVariant], titleClassName)}>
          {title}
        </h2>
        {description ? (
          <p
            className={joinClasses(
              headingDescriptionClasses[resolvedVariant],
              descriptionClassName,
            )}
          >
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
