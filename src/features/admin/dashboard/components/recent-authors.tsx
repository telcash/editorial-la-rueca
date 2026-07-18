import Link from 'next/link';
import { UsersRound } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EntityThumbnail } from '@/features/admin/components/data-display/entity-thumbnail';
import { PublicationStatusBadge } from '@/features/admin/components/data-display/publication-status-badge';
import { AdminEmptyState } from '@/features/admin/components/feedback/admin-empty-state';
import type { AuthorRecentItem } from '@/services/authors/author-service.types';
import { formatAdminDate } from '../lib/format-admin-date';

interface RecentAuthorsProps {
  authors: AuthorRecentItem[];
}

export function RecentAuthors({ authors }: RecentAuthorsProps) {
  return (
    <Card className="border-border bg-card">
      <CardHeader className="border-b border-border">
        <CardTitle>Últimos autores añadidos</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {authors.length === 0 ? (
          <AdminEmptyState
            title="No hay autores recientes."
            description="Crea el primer autor del catálogo editorial."
            icon={<UsersRound className="size-5" aria-hidden="true" />}
            action={
              <Button asChild size="sm">
                <Link href="/admin/authors/new">Crear autor</Link>
              </Button>
            }
          />
        ) : (
          <ul className="divide-y divide-border">
            {authors.map((author) => (
              <li key={author.id} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                <EntityThumbnail
                  src={author.photoUrl}
                  alt={`Foto de ${author.name}`}
                  variant="avatar"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground" title={author.name}>
                        {author.name}
                      </p>
                      <p className="mt-0.5 truncate text-sm text-muted-foreground">{author.slug}</p>
                    </div>
                    <PublicationStatusBadge isPublished={author.isPublished} />
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <time dateTime={author.createdAt.toISOString()}>
                      {formatAdminDate(author.createdAt)}
                    </time>
                    <Link
                      href={`/admin/authors/${author.id}`}
                      className="font-medium text-primary underline-offset-4 hover:underline"
                    >
                      Editar
                    </Link>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
