import { Search } from 'lucide-react';

import { PublicCard } from './public-card';

interface PublicSearchFormProps {
  action: string;
  query?: string;
  queryLabel: string;
  queryPlaceholder: string;
  category?: string;
  categoryOptions?: Array<{ label: string; value: string }>;
}

export function PublicSearchForm({
  action,
  query,
  queryLabel,
  queryPlaceholder,
  category,
  categoryOptions = [],
}: PublicSearchFormProps) {
  return (
    <PublicCard className="p-4 sm:p-5">
      <form action={action} className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
        <div className="grid gap-2">
          <label htmlFor="public-search" className="text-sm font-bold text-public-ink">
            {queryLabel}
          </label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-public-muted"
              aria-hidden="true"
            />
            <input
              id="public-search"
              name="q"
              type="search"
              defaultValue={query}
              placeholder={queryPlaceholder}
              className="min-h-11 w-full rounded-lg border border-public-border bg-white py-2 pl-10 pr-3 text-sm text-public-ink outline-none transition placeholder:text-public-muted/70 focus:border-public-red focus:ring-2 focus:ring-public-red/20"
            />
          </div>
        </div>

        {categoryOptions.length > 0 ? (
          <div className="grid gap-2 md:min-w-56">
            <label htmlFor="public-category" className="text-sm font-bold text-public-ink">
              Categoría
            </label>
            <select
              id="public-category"
              name="category"
              defaultValue={category}
              className="min-h-11 rounded-lg border border-public-border bg-white px-3 text-sm text-public-ink outline-none transition focus:border-public-red focus:ring-2 focus:ring-public-red/20"
            >
              <option value="">Todas</option>
              {categoryOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <button
          type="submit"
          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-public-red px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-public-red-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-public-red focus-visible:ring-offset-2 focus-visible:ring-offset-white md:self-end"
        >
          Buscar
        </button>
      </form>
    </PublicCard>
  );
}
