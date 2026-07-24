import Link from 'next/link';
import { Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { BooksTable } from '@/features/admin/books/components/books-table';
import { EmptyBooksState } from '@/features/admin/books/components/empty-books-state';
import { ArchiveStatusFilter } from '@/features/admin/components/archive-status-filter';
import { AdminFeedbackBanner } from '@/features/admin/components/feedback/admin-feedback-banner';
import { ListPagination } from '@/features/admin/components/list-pagination';
import { ListSearchForm } from '@/features/admin/components/list-search-form';
import { AdminPageHeader } from '@/features/admin/components/admin-page-header';
import { getAdminFeedbackMessage } from '@/features/admin/lib/feedback-messages';
import { parseAdminListQuery } from '@/features/admin/lib/list-query';
import { requireEditorialStaff } from '@/services/auth/access.service';
import * as BookService from '@/services/books/book.service';

interface AdminBooksPageProps {
  searchParams: Promise<{
    status?: string;
    q?: string;
    page?: string;
    feedback?: string;
  }>;
}

export default async function AdminBooksPage({ searchParams }: AdminBooksPageProps) {
  const params = await searchParams;
  const { status, query, page, pageSize } = parseAdminListQuery(params);
  const feedbackMessage = getAdminFeedbackMessage(params.feedback);
  const staff = await requireEditorialStaff();
  const books = await BookService.listBooksPaginated(status, {
    query,
    page,
    pageSize,
  });

  return (
    <section className="space-y-6">
      {feedbackMessage ? <AdminFeedbackBanner tone="success" message={feedbackMessage} /> : null}

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

      <ArchiveStatusFilter baseHref="/admin/books" currentStatus={status} query={query} />
      <ListSearchForm
        action="/admin/books"
        status={status}
        query={query}
        placeholder="Buscar por título, slug o ISBN..."
      />

      {books.items.length > 0 ? (
        <>
          <BooksTable books={books.items} canDeletePermanently={staff.role === 'admin'} />
          <ListPagination
            baseHref="/admin/books"
            status={status}
            query={query}
            page={books.page}
            totalPages={books.totalPages}
            totalItems={books.totalItems}
          />
        </>
      ) : (
        <EmptyBooksState status={status} />
      )}
    </section>
  );
}
