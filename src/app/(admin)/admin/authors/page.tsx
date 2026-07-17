import Link from 'next/link';
import { Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { EmptyAuthorsState } from '@/features/admin/authors/components/empty-authors-state';
import { AuthorsTable } from '@/features/admin/authors/components/authors-table';
import { AdminPageHeader } from '@/features/admin/components/admin-page-header';
import * as AuthorService from '@/services/authors/author.service';

export default async function AdminAuthorsPage() {
  const authors = await AuthorService.listAuthors();

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

      {authors.length > 0 ? <AuthorsTable authors={authors} /> : <EmptyAuthorsState />}
    </section>
  );
}
