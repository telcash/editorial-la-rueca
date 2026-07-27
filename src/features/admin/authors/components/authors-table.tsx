'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { bulkUpdateAuthorsAction } from '@/features/admin/authors/actions/bulk-author-actions';
import {
  BulkActionToolbar,
  type BulkActionOption,
} from '@/features/admin/components/bulk-action-toolbar';
import { AuthorArchiveActionButton } from '@/features/admin/authors/components/author-archive-action-button';
import { AuthorPermanentDeleteButton } from '@/features/admin/authors/components/author-permanent-delete-button';
import { ArchivedBadge } from '@/features/admin/components/data-display/archived-badge';
import { EntityThumbnail } from '@/features/admin/components/data-display/entity-thumbnail';
import { FeaturedBadge } from '@/features/admin/components/data-display/featured-badge';
import { PublicationStatusBadge } from '@/features/admin/components/data-display/publication-status-badge';
import type {
  AuthorAdminListItem,
  AuthorBulkAction,
} from '@/services/authors/author-service.types';

interface AuthorsTableProps {
  authors: AuthorAdminListItem[];
  canDeletePermanently: boolean;
}

export function AuthorsTable({ authors, canDeletePermanently }: AuthorsTableProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const visibleAuthorIds = useMemo(() => authors.map(({ author }) => author.id), [authors]);
  const allVisibleSelected =
    visibleAuthorIds.length > 0 && visibleAuthorIds.every((id) => selectedIds.has(id));
  const bulkActions: Array<BulkActionOption<AuthorBulkAction>> = [
    { value: 'publish', label: 'Publicar' },
    { value: 'unpublish', label: 'Despublicar' },
    { value: 'feature', label: 'Destacar' },
    { value: 'unfeature', label: 'Quitar destacado' },
    {
      value: 'archive',
      label: 'Archivar',
      requiresConfirmation: true,
      confirmationMessage:
        '¿Archivar los autores seleccionados? Dejarán de estar disponibles para nuevas selecciones.',
    },
    {
      value: 'restore',
      label: 'Restaurar',
      requiresConfirmation: true,
      confirmationMessage: '¿Restaurar los autores seleccionados?',
    },
  ];

  function toggleAuthor(authorId: string) {
    setSelectedIds((currentIds) => {
      const nextIds = new Set(currentIds);

      if (nextIds.has(authorId)) {
        nextIds.delete(authorId);
      } else {
        nextIds.add(authorId);
      }

      return nextIds;
    });
  }

  function toggleAllVisible() {
    setSelectedIds((currentIds) => {
      if (allVisibleSelected) {
        return new Set();
      }

      return new Set([...currentIds, ...visibleAuthorIds]);
    });
  }

  return (
    <div className="space-y-3">
      <BulkActionToolbar
        selectedCount={selectedIds.size}
        actions={bulkActions}
        onClearSelection={() => setSelectedIds(new Set())}
        onAction={(action) => bulkUpdateAuthorsAction([...selectedIds], action)}
      />
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[840px] text-left text-sm">
            <thead className="border-b border-border bg-muted/60 text-xs font-medium uppercase text-muted-foreground">
              <tr>
                <th scope="col" className="w-12 px-4 py-3">
                  <input
                    type="checkbox"
                    aria-label="Seleccionar todos los autores visibles"
                    checked={allVisibleSelected}
                    onChange={toggleAllVisible}
                    className="size-4 rounded border-border"
                  />
                </th>
                <th scope="col" className="w-20 px-4 py-3">
                  Foto
                </th>
                <th scope="col" className="px-4 py-3">
                  Nombre
                </th>
                <th scope="col" className="px-4 py-3">
                  País
                </th>
                <th scope="col" className="px-4 py-3">
                  Publicado
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
              {authors.map(({ author, bookCount }) => {
                const showPermanentDelete = canDeletePermanently && author.isArchived;

                return (
                  <tr key={author.id} className="bg-card">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        aria-label={`Seleccionar ${author.name}`}
                        checked={selectedIds.has(author.id)}
                        onChange={() => toggleAuthor(author.id)}
                        className="size-4 rounded border-border"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <EntityThumbnail
                        src={author.photoUrl}
                        alt={`Foto de ${author.name}`}
                        variant="avatar"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">{author.name}</div>
                      <div className="mt-0.5 text-xs text-muted-foreground">{author.slug}</div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {author.country ?? 'Sin país'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <PublicationStatusBadge isPublished={author.isPublished} />
                        <ArchivedBadge isArchived={author.isArchived} />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <FeaturedBadge isFeatured={author.isFeatured} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/admin/authors/${author.id}`}>Editar</Link>
                        </Button>
                        <AuthorArchiveActionButton
                          authorId={author.id}
                          isArchived={author.isArchived}
                        />
                        {showPermanentDelete ? (
                          <div className="flex flex-col items-end gap-1">
                            <AuthorPermanentDeleteButton
                              authorId={author.id}
                              authorName={author.name}
                              bookCount={bookCount}
                            />
                            {bookCount > 0 ? (
                              <span className="max-w-52 text-xs text-muted-foreground">
                                No se puede eliminar porque está relacionado con{' '}
                                {bookCount === 1 ? '1 libro' : `${bookCount} libros`}.
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
    </div>
  );
}
