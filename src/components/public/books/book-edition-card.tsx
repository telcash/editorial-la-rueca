import type { BookEditionDetails } from '@/services/books/book.types';
import {
  formatEditionFormat,
  formatEditionPrice,
  formatPublicationYear,
  getEditionIsbn,
} from '@/features/public/lib/book-format';
import { getEditionAvailabilityLabel } from '@/features/public/books/book-edition.helpers';
import { cn } from '@/lib/utils';

interface BookEditionCardProps {
  edition: BookEditionDetails;
  isPrimary?: boolean;
}

export function BookEditionCard({ edition, isPrimary = false }: BookEditionCardProps) {
  const isbn = getEditionIsbn(edition);
  const price = formatEditionPrice(edition);
  const year = formatPublicationYear(edition.publicationDate);
  const details = [
    isbn ? { label: 'ISBN', value: isbn } : null,
    year ? { label: 'Año', value: year } : null,
    edition.pages ? { label: 'Páginas', value: `${edition.pages}` } : null,
    price ? { label: 'Precio', value: price } : null,
  ].filter((item): item is { label: string; value: string } => Boolean(item));

  return (
    <article
      className={cn(
        'flex h-full flex-col rounded-2xl border bg-white p-5 shadow-[0_14px_40px_rgba(23,23,23,0.06)]',
        isPrimary ? 'border-public-red/35' : 'border-public-border',
      )}
    >
      <div className="flex flex-wrap gap-2">
        {isPrimary ? (
          <span className="rounded-full bg-public-red-soft px-3 py-1 text-xs font-bold text-public-red">
            Edición principal
          </span>
        ) : null}
        {edition.isFeatured ? (
          <span className="rounded-full bg-public-surface-subtle px-3 py-1 text-xs font-bold text-public-ink">
            Edición destacada
          </span>
        ) : null}
        <span className="rounded-full bg-public-surface-subtle px-3 py-1 text-xs font-bold text-public-muted">
          {getEditionAvailabilityLabel(edition)}
        </span>
      </div>

      <div className="mt-5">
        <h3 className="font-serif-public text-xl font-semibold leading-snug text-public-ink">
          {formatEditionFormat(edition.format)}
        </h3>
        {edition.editionLabel ? (
          <p className="mt-2 text-sm leading-5 text-public-muted">{edition.editionLabel}</p>
        ) : null}
      </div>

      {details.length > 0 ? (
        <dl className="mt-6 grid gap-4 sm:grid-cols-2">
          {details.map((detail) => (
            <div key={detail.label}>
              <dt className="text-xs font-semibold leading-5 text-public-ink">{detail.label}</dt>
              <dd className="mt-1 text-sm leading-5 text-public-muted">{detail.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </article>
  );
}
