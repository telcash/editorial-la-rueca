import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { ArchiveStatus } from '../lib/archive-status';
import { buildListHref, type TriStateFilter } from '../lib/list-query';

interface CatalogFilterOption {
  value: string;
  label: string;
}

interface CatalogFiltersProps {
  action: string;
  status: ArchiveStatus;
  query: string;
  published: TriStateFilter;
  featured: TriStateFilter;
  image: TriStateFilter;
  imageLabel: string;
  searchPlaceholder: string;
  category?: string;
  categoryOptions?: CatalogFilterOption[];
  sort?: string;
  sortOptions?: CatalogFilterOption[];
  defaultSort?: string;
  pageSize: number;
}

const archiveOptions: Array<{ value: ArchiveStatus; label: string }> = [
  { value: 'active', label: 'Activos' },
  { value: 'archived', label: 'Archivados' },
  { value: 'all', label: 'Todos' },
];

const triStateOptions: CatalogFilterOption[] = [
  { value: 'all', label: 'Todos' },
  { value: 'true', label: 'Sí' },
  { value: 'false', label: 'No' },
];

function getActiveFilterLabels({
  status,
  published,
  featured,
  image,
  imageLabel,
  category,
  categoryOptions = [],
  sort,
  sortOptions = [],
  defaultSort,
}: Pick<
  CatalogFiltersProps,
  | 'status'
  | 'published'
  | 'featured'
  | 'image'
  | 'imageLabel'
  | 'category'
  | 'categoryOptions'
  | 'sort'
  | 'sortOptions'
  | 'defaultSort'
>) {
  const labels: string[] = [];

  if (status !== 'active') {
    labels.push(status === 'archived' ? 'Archivados' : 'Todos los estados');
  }

  if (published !== 'all') {
    labels.push(published === 'true' ? 'Publicados' : 'Borradores');
  }

  if (featured !== 'all') {
    labels.push(featured === 'true' ? 'Destacados' : 'No destacados');
  }

  if (image !== 'all') {
    labels.push(image === 'true' ? `Con ${imageLabel}` : `Sin ${imageLabel}`);
  }

  if (category) {
    labels.push(categoryOptions.find((option) => option.value === category)?.label ?? category);
  }

  if (sort && sort !== defaultSort) {
    const sortLabel = sortOptions.find((option) => option.value === sort)?.label;

    labels.push(sortLabel ? `Orden: ${sortLabel}` : `Orden: ${sort}`);
  }

  return labels;
}

export function CatalogFilters({
  action,
  status,
  query,
  published,
  featured,
  image,
  imageLabel,
  searchPlaceholder,
  category,
  categoryOptions = [],
  sort,
  sortOptions = [],
  defaultSort,
  pageSize,
}: CatalogFiltersProps) {
  const activeLabels = getActiveFilterLabels({
    status,
    published,
    featured,
    image,
    imageLabel,
    category,
    categoryOptions,
    sort,
    sortOptions,
    defaultSort,
  });

  return (
    <div className="space-y-3 rounded-lg border border-border bg-card p-4">
      <form action={action} className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        <input type="hidden" name="pageSize" value={pageSize} />
        <div className="grid gap-1.5 xl:col-span-2">
          <label htmlFor="admin-catalog-query" className="text-sm font-medium text-foreground">
            Buscar
          </label>
          <Input
            id="admin-catalog-query"
            type="search"
            name="q"
            defaultValue={query}
            placeholder={searchPlaceholder}
          />
        </div>

        <div className="grid gap-1.5">
          <label htmlFor="admin-catalog-status" className="text-sm font-medium text-foreground">
            Estado
          </label>
          <select
            id="admin-catalog-status"
            name="status"
            defaultValue={status}
            className="min-h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            {archiveOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-1.5">
          <label htmlFor="admin-catalog-published" className="text-sm font-medium text-foreground">
            Publicado
          </label>
          <select
            id="admin-catalog-published"
            name="published"
            defaultValue={published}
            className="min-h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            {triStateOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-1.5">
          <label htmlFor="admin-catalog-featured" className="text-sm font-medium text-foreground">
            Destacado
          </label>
          <select
            id="admin-catalog-featured"
            name="featured"
            defaultValue={featured}
            className="min-h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            {triStateOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-1.5">
          <label htmlFor="admin-catalog-image" className="text-sm font-medium text-foreground">
            {imageLabel}
          </label>
          <select
            id="admin-catalog-image"
            name="image"
            defaultValue={image}
            className="min-h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            {triStateOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {categoryOptions.length > 0 ? (
          <div className="grid gap-1.5">
            <label htmlFor="admin-catalog-category" className="text-sm font-medium text-foreground">
              Categoría
            </label>
            <select
              id="admin-catalog-category"
              name="category"
              defaultValue={category}
              className="min-h-10 rounded-md border border-input bg-background px-3 text-sm"
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

        {sortOptions.length > 0 ? (
          <div className="grid gap-1.5">
            <label htmlFor="admin-catalog-sort" className="text-sm font-medium text-foreground">
              Orden
            </label>
            <select
              id="admin-catalog-sort"
              name="sort"
              defaultValue={sort ?? defaultSort}
              className="min-h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <div className="flex items-end gap-2">
          <Button type="submit">Aplicar filtros</Button>
          <Button asChild variant="outline">
            <Link href={buildListHref(action, { pageSize })}>Limpiar filtros</Link>
          </Button>
        </div>
      </form>

      {activeLabels.length > 0 || query ? (
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          {query ? (
            <span className="rounded-full bg-muted px-2 py-1">Búsqueda: {query}</span>
          ) : null}
          {activeLabels.map((label) => (
            <span key={label} className="rounded-full bg-muted px-2 py-1">
              {label}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
