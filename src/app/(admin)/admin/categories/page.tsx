import Link from 'next/link';
import { Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { CategoriesTable } from '@/features/admin/categories/components/categories-table';
import { EmptyCategoriesState } from '@/features/admin/categories/components/empty-categories-state';
import { ArchiveStatusFilter } from '@/features/admin/components/archive-status-filter';
import { AdminPageHeader } from '@/features/admin/components/admin-page-header';
import { parseArchiveStatus } from '@/features/admin/lib/archive-status';
import { requireEditorialStaff } from '@/services/auth/access.service';
import * as CategoryService from '@/services/categories/category.service';

interface AdminCategoriesPageProps {
  searchParams: Promise<{
    status?: string;
  }>;
}

export default async function AdminCategoriesPage({ searchParams }: AdminCategoriesPageProps) {
  const { status: statusParam } = await searchParams;
  const status = parseArchiveStatus(statusParam);
  const staff = await requireEditorialStaff();
  const categories = await CategoryService.listCategories(status);

  return (
    <section className="space-y-6">
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

      <ArchiveStatusFilter baseHref="/admin/categories" currentStatus={status} />

      {categories.length > 0 ? (
        <CategoriesTable categories={categories} canDeletePermanently={staff.role === 'admin'} />
      ) : (
        <EmptyCategoriesState status={status} />
      )}
    </section>
  );
}
