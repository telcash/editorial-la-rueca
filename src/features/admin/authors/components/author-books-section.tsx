import Link from 'next/link';
import { BookOpen } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArchivedBadge } from '@/features/admin/components/data-display/archived-badge';
import { EntityThumbnail } from '@/features/admin/components/data-display/entity-thumbnail';
import { FeaturedBadge } from '@/features/admin/components/data-display/featured-badge';
import { PublicationStatusBadge } from '@/features/admin/components/data-display/publication-status-badge';
import { AdminEmptyState } from '@/features/admin/components/feedback/admin-empty-state';
import type { AuthorRelatedBook } from '@/services/authors/author-service.types';

interface AuthorBooksSectionProps {
  books: AuthorRelatedBook[];
}

export function AuthorBooksSection({ books }: AuthorBooksSectionProps) {
  const bookCountLabel = `${books.length} ${books.length === 1 ? 'libro' : 'libros'}`;

  return (
    <section className="space-y-5 rounded-lg border border-border bg-card px-4 py-5">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-foreground">Libros del autor</h2>
          <p className="text-sm text-muted-foreground">
            Obras vinculadas actualmente a este autor.
          </p>
        </div>
        <Badge variant="outline">{bookCountLabel}</Badge>
      </div>

      {books.length > 0 ? (
        <ul className="grid gap-2" aria-label="Libros del autor">
          {books.map((book) => (
            <li
              key={book.id}
              className="grid min-w-0 gap-3 rounded-lg border border-border px-3 py-3 sm:grid-cols-[auto_minmax(0,1fr)_auto_auto] sm:items-center"
            >
              <EntityThumbnail
                src={book.coverUrl}
                alt={`Portada de ${book.title}`}
                variant="portrait"
              />
              <div className="min-w-0 space-y-1">
                <p className="line-clamp-2 break-words text-sm font-medium text-foreground">
                  {book.title}
                </p>
                <p className="truncate text-xs text-muted-foreground">{book.slug}</p>
              </div>
              <div className="flex flex-wrap gap-2 sm:justify-end">
                {book.isArchived ? (
                  <ArchivedBadge isArchived={book.isArchived} />
                ) : (
                  <PublicationStatusBadge isPublished={book.isPublished} />
                )}
                {book.isFeatured ? <FeaturedBadge isFeatured={book.isFeatured} /> : null}
              </div>
              <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
                <Link href={`/admin/books/${book.id}`}>Editar</Link>
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <AdminEmptyState
          icon={<BookOpen className="size-5" aria-hidden="true" />}
          title="Sin libros asociados"
          description="Este autor todavía no tiene libros asociados."
        />
      )}
    </section>
  );
}
