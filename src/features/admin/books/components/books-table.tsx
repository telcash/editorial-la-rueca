'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { bulkUpdateBooksAction } from '@/features/admin/books/actions/bulk-book-actions';
import {
  BulkActionToolbar,
  type BulkActionOption,
} from '@/features/admin/components/bulk-action-toolbar';
import { ArchivedBadge } from '@/features/admin/components/data-display/archived-badge';
import { EntityThumbnail } from '@/features/admin/components/data-display/entity-thumbnail';
import { FeaturedBadge } from '@/features/admin/components/data-display/featured-badge';
import { PublicationStatusBadge } from '@/features/admin/components/data-display/publication-status-badge';
import type { BookBulkAction, BookWithDetails } from '@/services/books/book.types';
import { BookArchiveActionButton } from './book-archive-action-button';
import { BookPermanentDeleteButton } from './book-permanent-delete-button';
import {
  formatAuthorsSummary,
  formatEditionsSummary,
  getBookPriceSummary,
} from '../lib/book-list.helpers';

interface BooksTableProps {
  books: BookWithDetails[];
  canDeletePermanently: boolean;
}

export function BooksTable({ books, canDeletePermanently }: BooksTableProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const visibleBookIds = useMemo(() => books.map((book) => book.id), [books]);
  const allVisibleSelected =
    visibleBookIds.length > 0 && visibleBookIds.every((id) => selectedIds.has(id));
  const bulkActions: Array<BulkActionOption<BookBulkAction>> = [
    { value: 'publish', label: 'Publicar' },
    { value: 'unpublish', label: 'Despublicar' },
    { value: 'feature', label: 'Destacar' },
    { value: 'unfeature', label: 'Quitar destacado' },
    {
      value: 'archive',
      label: 'Archivar',
      requiresConfirmation: true,
      confirmationMessage:
        '¿Archivar los libros seleccionados? Dejarán de aparecer en vistas activas y públicas.',
    },
    {
      value: 'restore',
      label: 'Restaurar',
      requiresConfirmation: true,
      confirmationMessage: '¿Restaurar los libros seleccionados?',
    },
  ];

  function toggleBook(bookId: string) {
    setSelectedIds((currentIds) => {
      const nextIds = new Set(currentIds);

      if (nextIds.has(bookId)) {
        nextIds.delete(bookId);
      } else {
        nextIds.add(bookId);
      }

      return nextIds;
    });
  }

  function toggleAllVisible() {
    setSelectedIds((currentIds) => {
      if (allVisibleSelected) {
        return new Set();
      }

      return new Set([...currentIds, ...visibleBookIds]);
    });
  }

  return (
    <div className="space-y-3">
      <BulkActionToolbar
        selectedCount={selectedIds.size}
        actions={bulkActions}
        onClearSelection={() => setSelectedIds(new Set())}
        onAction={(action) => bulkUpdateBooksAction([...selectedIds], action)}
      />
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="border-b border-border bg-muted/60 text-xs font-medium uppercase text-muted-foreground">
              <tr>
                <th scope="col" className="w-12 px-4 py-3">
                  <input
                    type="checkbox"
                    aria-label="Seleccionar todos los libros visibles"
                    checked={allVisibleSelected}
                    onChange={toggleAllVisible}
                    className="size-4 rounded border-border"
                  />
                </th>
                <th scope="col" className="w-24 px-4 py-3">
                  Portada
                </th>
                <th scope="col" className="px-4 py-3">
                  Libro
                </th>
                <th scope="col" className="px-4 py-3">
                  Autores
                </th>
                <th scope="col" className="px-4 py-3">
                  Ediciones
                </th>
                <th scope="col" className="px-4 py-3">
                  Precio
                </th>
                <th scope="col" className="px-4 py-3">
                  Estado
                </th>
                <th scope="col" className="px-4 py-3">
                  Destacado
                </th>
                <th scope="col" className="px-4 py-3 text-right">
                  Acción
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {books.map((book) => {
                const authorsSummary = formatAuthorsSummary(book.authors);
                const editionsSummary = formatEditionsSummary(book.editions);
                const priceSummary = getBookPriceSummary(book.editions);

                return (
                  <tr key={book.id} className="bg-card">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        aria-label={`Seleccionar ${book.title}`}
                        checked={selectedIds.has(book.id)}
                        onChange={() => toggleBook(book.id)}
                        className="size-4 rounded border-border"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <EntityThumbnail
                        src={book.coverUrl}
                        alt={`Portada de ${book.title}`}
                        variant="cover"
                        className="h-16 w-11"
                      />
                    </td>
                    <td className="max-w-72 px-4 py-3">
                      <div className="truncate font-medium text-foreground" title={book.title}>
                        {book.title}
                      </div>
                      {book.subtitle ? (
                        <div
                          className="mt-0.5 truncate text-xs text-muted-foreground"
                          title={book.subtitle}
                        >
                          {book.subtitle}
                        </div>
                      ) : null}
                      <div
                        className="mt-0.5 truncate text-xs text-muted-foreground"
                        title={book.slug}
                      >
                        {book.slug}
                      </div>
                    </td>
                    <td className="max-w-56 px-4 py-3 text-muted-foreground">
                      <span className="block truncate" title={authorsSummary}>
                        {authorsSummary}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">{editionsSummary.count}</div>
                      {editionsSummary.formats ? (
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          {editionsSummary.formats}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{priceSummary.label}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <PublicationStatusBadge isPublished={book.isPublished} />
                        <ArchivedBadge isArchived={book.isArchived} />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <FeaturedBadge isFeatured={book.isFeatured} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/admin/books/${book.id}`}>Editar</Link>
                        </Button>
                        <BookArchiveActionButton bookId={book.id} isArchived={book.isArchived} />
                        {canDeletePermanently && book.isArchived ? (
                          <BookPermanentDeleteButton bookId={book.id} bookTitle={book.title} />
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
    </div>
  );
}
