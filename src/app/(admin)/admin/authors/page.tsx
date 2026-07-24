import Link from 'next/link';
import { Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { EmptyAuthorsState } from '@/features/admin/authors/components/empty-authors-state';
import { AuthorsTable } from '@/features/admin/authors/components/authors-table';
import { ArchiveStatusFilter } from '@/features/admin/components/archive-status-filter';
import { AdminFeedbackBanner } from '@/features/admin/components/feedback/admin-feedback-banner';
import { ListPagination } from '@/features/admin/components/list-pagination';
import { ListSearchForm } from '@/features/admin/components/list-search-form';
import { AdminPageHeader } from '@/features/admin/components/admin-page-header';
import { getAdminFeedbackMessage } from '@/features/admin/lib/feedback-messages';
import { parseAdminListQuery } from '@/features/admin/lib/list-query';
import { requireEditorialStaff } from '@/services/auth/access.service';
import * as AuthorService from '@/services/authors/author.service';

interface AdminAuthorsPageProps {
  searchParams: Promise<{
    status?: string;
    q?: string;
    page?: string;
    feedback?: string;
  }>;
}

export default async function AdminAuthorsPage({ searchParams }: AdminAuthorsPageProps) {
  const params = await searchParams;
  const { status, query, page, pageSize } = parseAdminListQuery(params);
  const feedbackMessage = getAdminFeedbackMessage(params.feedback);
  const staff = await requireEditorialStaff();
  const authors = await AuthorService.listAuthorsForAdminPaginated(status, {
    query,
    page,
    pageSize,
  });

  return (
    <section className="space-y-6">
      {feedbackMessage ? <AdminFeedbackBanner tone="success" message={feedbackMessage} /> : null}

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

      <ArchiveStatusFilter baseHref="/admin/authors" currentStatus={status} query={query} />
      <ListSearchForm
        action="/admin/authors"
        status={status}
        query={query}
        placeholder="Buscar por nombre o slug..."
      />

      {authors.items.length > 0 ? (
        <>
          <AuthorsTable authors={authors.items} canDeletePermanently={staff.role === 'admin'} />
          <ListPagination
            baseHref="/admin/authors"
            status={status}
            query={query}
            page={authors.page}
            totalPages={authors.totalPages}
            totalItems={authors.totalItems}
          />
        </>
      ) : (
        <EmptyAuthorsState status={status} />
      )}
    </section>
  );
}
