import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { ArchivedBadge } from '@/features/admin/components/data-display/archived-badge';
import { PublicationStatusBadge } from '@/features/admin/components/data-display/publication-status-badge';
import type { CategoryAdminListItem } from '@/services/categories/category.types';
import { CategoryArchiveActionButton } from './category-archive-action-button';
import { CategoryPermanentDeleteButton } from './category-permanent-delete-button';

interface CategoriesTableProps {
  categories: CategoryAdminListItem[];
  canDeletePermanently: boolean;
}

function formatBookCount(bookCount: number) {
  return bookCount === 1 ? '1 libro' : `${bookCount} libros`;
}

export function CategoriesTable({ categories, canDeletePermanently }: CategoriesTableProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-border bg-muted/60 text-xs font-medium uppercase text-muted-foreground">
            <tr>
              <th scope="col" className="px-4 py-3">
                Nombre
              </th>
              <th scope="col" className="px-4 py-3">
                Slug
              </th>
              <th scope="col" className="px-4 py-3">
                Estado
              </th>
              <th scope="col" className="px-4 py-3">
                Libros
              </th>
              <th scope="col" className="px-4 py-3">
                Archivado
              </th>
              <th scope="col" className="px-4 py-3 text-right">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {categories.map(({ category, bookCount }) => {
              const showPermanentDelete = canDeletePermanently && category.isArchived;

              return (
                <tr key={category.id} className="bg-card">
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground">{category.name}</div>
                    {category.description ? (
                      <div className="mt-0.5 max-w-72 truncate text-xs text-muted-foreground">
                        {category.description}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{category.slug}</td>
                  <td className="px-4 py-3">
                    <PublicationStatusBadge isPublished={category.isPublished} />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{formatBookCount(bookCount)}</td>
                  <td className="px-4 py-3">
                    <ArchivedBadge isArchived={category.isArchived} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/admin/categories/${category.id}`}>Editar</Link>
                      </Button>
                      <CategoryArchiveActionButton
                        categoryId={category.id}
                        isArchived={category.isArchived}
                      />
                      {showPermanentDelete ? (
                        <div className="flex flex-col items-end gap-1">
                          <CategoryPermanentDeleteButton
                            categoryId={category.id}
                            categoryName={category.name}
                            bookCount={bookCount}
                          />
                          {bookCount > 0 ? (
                            <span className="max-w-52 text-xs text-muted-foreground">
                              No se puede eliminar porque está relacionada con{' '}
                              {formatBookCount(bookCount)}.
                            </span>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
