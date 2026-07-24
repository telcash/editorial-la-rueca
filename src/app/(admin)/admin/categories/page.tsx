import Link from 'next/link';
import { Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { CategoriesTable } from '@/features/admin/categories/components/categories-table';
import { EmptyCategoriesState } from '@/features/admin/categories/components/empty-categories-state';
import { ArchiveStatusFilter } from '@/features/admin/components/archive-status-filter';
import { AdminFeedbackBanner } from '@/features/admin/components/feedback/admin-feedback-banner';
import { ListPagination } from '@/features/admin/components/list-pagination';
import { ListSearchForm } from '@/features/admin/components/list-search-form';
import { AdminPageHeader } from '@/features/admin/components/admin-page-header';
import { getAdminFeedbackMessage } from '@/features/admin/lib/feedback-messages';
import { parseAdminListQuery } from '@/features/admin/lib/list-query';
import { requireEditorialStaff } from '@/services/auth/access.service';
import * as CategoryService from '@/services/categories/category.service';

interface AdminCategoriesPageProps {
  searchParams: Promise<{
    status?: string;
    q?: string;
    page?: string;
    feedback?: string;
  }>;
}

export default async function AdminCategoriesPage({ searchParams }: AdminCategoriesPageProps) {
  const params = await searchParams;
  const { status, query, page, pageSize } = parseAdminListQuery(params);
  const feedbackMessage = getAdminFeedbackMessage(params.feedback);
  const staff = await requireEditorialStaff();
  const categories = await CategoryService.listCategoriesPaginated(status, {
    query,
    page,
    pageSize,
  });

  return (
    <section className="space-y-6">
      {feedbackMessage ? <AdminFeedbackBanner tone="success" message={feedbackMessage} /> : null}

      <AdminPageHeader
        title="Categorías"
        description="Organiza el catálogo editorial por categorías temáticas."
        actions={
          <Button asChild>
            <Link href="/admin/categories/new">
              <Plus className="size-4" aria-hidden="true" />
              Nueva categoría
            </Link>
          </Button>
        }
      />

      <ArchiveStatusFilter baseHref="/admin/categories" currentStatus={status} query={query} />
      <ListSearchForm
        action="/admin/categories"
        status={status}
        query={query}
        placeholder="Buscar por nombre o slug..."
      />

      {categories.items.length > 0 ? (
        <>
          <CategoriesTable
            categories={categories.items}
            canDeletePermanently={staff.role === 'admin'}
          />
          <ListPagination
            baseHref="/admin/categories"
            status={status}
            query={query}
            page={categories.page}
            totalPages={categories.totalPages}
            totalItems={categories.totalItems}
          />
        </>
      ) : (
        <EmptyCategoriesState status={status} />
      )}
    </section>
  );
}
