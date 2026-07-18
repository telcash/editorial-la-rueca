import Link from 'next/link';

import { Button } from '@/components/ui/button';
import type { Author } from '@/db/schema';
import { AuthorArchiveActionButton } from '@/features/admin/authors/components/author-archive-action-button';
import { ArchivedBadge } from '@/features/admin/components/data-display/archived-badge';
import { EntityThumbnail } from '@/features/admin/components/data-display/entity-thumbnail';
import { FeaturedBadge } from '@/features/admin/components/data-display/featured-badge';
import { PublicationStatusBadge } from '@/features/admin/components/data-display/publication-status-badge';

interface AuthorsTableProps {
  authors: Author[];
}

export function AuthorsTable({ authors }: AuthorsTableProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead className="border-b border-border bg-muted/60 text-xs font-medium uppercase text-muted-foreground">
            <tr>
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
            {authors.map((author) => (
              <tr key={author.id} className="bg-card">
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
                <td className="px-4 py-3 text-muted-foreground">{author.country ?? 'Sin país'}</td>
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
                  <div className="flex justify-end gap-2">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/admin/authors/${author.id}`}>Editar</Link>
                    </Button>
                    <AuthorArchiveActionButton
                      authorId={author.id}
                      isArchived={author.isArchived}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
