import type { BookMetaItem } from '@/features/public/books/book-edition.helpers';
import { cn } from '@/lib/utils';

interface BookMetaGridProps {
  items: BookMetaItem[];
  className?: string;
  itemClassName?: string;
}

export function BookMetaGrid({ items, className, itemClassName }: BookMetaGridProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <dl className={cn('grid gap-3 sm:grid-cols-2 lg:grid-cols-3', className)}>
      {items.map((item) => (
        <div
          key={`${item.label}-${item.value}`}
          className={cn(
            'rounded-public-md border border-public-border bg-white/72 px-4 py-3 shadow-public-subtle',
            itemClassName,
          )}
        >
          <dt className="text-[0.75rem] font-semibold uppercase leading-5 tracking-normal text-public-muted">
            {item.label}
          </dt>
          <dd className="mt-1 text-[0.9375rem] font-medium leading-6 text-public-ink">
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
