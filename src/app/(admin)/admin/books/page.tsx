import Link from 'next/link';
import { Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { BooksTable } from '@/features/admin/books/components/books-table';
import { EmptyBooksState } from '@/features/admin/books/components/empty-books-state';
import { ArchiveStatusFilter } from '@/features/admin/components/archive-status-filter';
import { AdminPageHeader } from '@/features/admin/components/admin-page-header';
import { parseArchiveStatus } from '@/features/admin/lib/archive-status';
import { requireEditorialStaff } from '@/services/auth/access.service';
import * as BookService from '@/services/books/book.service';

interface AdminBooksPageProps {
  searchParams: Promise<{
    status?: string;
  }>;
}

export default async function AdminBooksPage({ searchParams }: AdminBooksPageProps) {
  const { status: statusParam } = await searchParams;
  const status = parseArchiveStatus(statusParam);
  const staff = await requireEditorialStaff();
  const books = await BookService.listBooks(status);

  return (
    <section className="space-y-6">
      <AdminPageHeader
        title="Libros"
        description="Gestiona el catálogo, sus autores, ediciones y precios."
        actions={
          <Button asChild>
            <Link href="/admin/books/new">
              <Plus className="size-4" aria-hidden="true" />
              Nuevo libro
            </Link>
          </Button>
        }
      />

      <ArchiveStatusFilter baseHref="/admin/books" currentStatus={status} />

      {books.length > 0 ? (
        <BooksTable books={books} canDeletePermanently={staff.role === 'admin'} />
      ) : (
        <EmptyBooksState status={status} />
      )}
    </section>
  );
}
