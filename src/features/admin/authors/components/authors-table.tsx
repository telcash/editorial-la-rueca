import Link from 'next/link';
import { ImageIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { Author } from '@/db/schema';
import { AuthorStatusBadge } from './author-status-badge';
import { FeaturedBadge } from './featured-badge';

interface AuthorsTableProps {
  authors: Author[];
}

function AuthorPhoto({ name, photoUrl }: { name: string; photoUrl: string | null }) {
  return (
    <div className="flex size-11 items-center justify-center overflow-hidden rounded-md border border-border bg-muted text-muted-foreground">
      {photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photoUrl} alt="" className="size-full object-cover" />
      ) : (
        <ImageIcon className="size-4" aria-label={`Sin foto de ${name}`} />
      )}
    </div>
  );
}

export function AuthorsTable({ authors }: AuthorsTableProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
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
                Orden
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
                  <AuthorPhoto name={author.name} photoUrl={author.photoUrl} />
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium text-foreground">{author.name}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{author.slug}</div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{author.country ?? 'Sin país'}</td>
                <td className="px-4 py-3">
                  <AuthorStatusBadge isPublished={author.isPublished} />
                </td>
                <td className="px-4 py-3">
                  <FeaturedBadge isFeatured={author.isFeatured} />
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                  {author.sortOrder}
                </td>
                <td className="px-4 py-3 text-right">
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/admin/authors/${author.id}/edit`}>Editar</Link>
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
