import Link from 'next/link';
import { Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { EmptyAuthorsState } from '@/features/admin/authors/components/empty-authors-state';
import { AuthorsTable } from '@/features/admin/authors/components/authors-table';
import { ArchiveStatusFilter } from '@/features/admin/components/archive-status-filter';
import { AdminPageHeader } from '@/features/admin/components/admin-page-header';
import { parseArchiveStatus } from '@/features/admin/lib/archive-status';
import * as AuthorService from '@/services/authors/author.service';

interface AdminAuthorsPageProps {
  searchParams: Promise<{
    status?: string;
  }>;
}

export default async function AdminAuthorsPage({ searchParams }: AdminAuthorsPageProps) {
  const { status: statusParam } = await searchParams;
  const status = parseArchiveStatus(statusParam);
  const authors = await AuthorService.listAuthors(status);

  return (
    <section className="space-y-6">
      <AdminPageHeader
        title="Autores"
        description="Gestiona el listado editorial de autoras y autores."
        actions={
          <Button asChild>
            <Link href="/admin/authors/new">
              <Plus className="size-4" aria-hidden="true" />
              Nuevo autor
            </Link>
          </Button>
        }
      />

      <ArchiveStatusFilter baseHref="/admin/authors" currentStatus={status} />

      {authors.length > 0 ? (
        <AuthorsTable authors={authors} />
      ) : (
        <EmptyAuthorsState status={status} />
      )}
    </section>
  );
}
