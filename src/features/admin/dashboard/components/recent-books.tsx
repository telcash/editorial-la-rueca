import Link from 'next/link';
import { BookOpenText } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AdminEmptyState } from '@/features/admin/components/feedback/admin-empty-state';
import { EntityThumbnail } from '@/features/admin/components/data-display/entity-thumbnail';
import { PublicationStatusBadge } from '@/features/admin/components/data-display/publication-status-badge';
import { formatAuthorsSummary } from '@/features/admin/books/lib/book-list.helpers';
import type { BookRecentItem } from '@/services/books/book.types';
import { formatAdminDate } from '../lib/format-admin-date';

interface RecentBooksProps {
  books: BookRecentItem[];
}

export function RecentBooks({ books }: RecentBooksProps) {
  return (
    <Card className="border-border bg-card">
      <CardHeader className="border-b border-border">
        <CardTitle>Últimos libros creados o modificados</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {books.length === 0 ? (
          <AdminEmptyState
            title="No hay libros recientes."
            description="Crea el primer libro del catálogo editorial."
            icon={<BookOpenText className="size-5" aria-hidden="true" />}
            action={
              <Button asChild size="sm">
                <Link href="/admin/books/new">Crear libro</Link>
              </Button>
            }
          />
        ) : (
          <ul className="divide-y divide-border">
            {books.map((book) => {
              const authorsSummary = formatAuthorsSummary(book.authors);

              return (
                <li key={book.id} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                  <EntityThumbnail
                    src={book.coverUrl}
                    alt={`Portada de ${book.title}`}
                    variant="cover"
                    className="h-16 w-11"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground" title={book.title}>
                          {book.title}
                        </p>
                        <p
                          className="mt-0.5 truncate text-sm text-muted-foreground"
                          title={authorsSummary}
                        >
                          {authorsSummary}
                        </p>
                      </div>
                      <PublicationStatusBadge isPublished={book.isPublished} />
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <time dateTime={book.updatedAt.toISOString()}>
                        {formatAdminDate(book.updatedAt)}
                      </time>
                      <Link
                        href={`/admin/books/${book.id}`}
                        className="font-medium text-primary underline-offset-4 hover:underline"
                      >
                        Editar
                      </Link>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
