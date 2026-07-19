import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { CategoryForm } from '@/features/admin/categories/components/category-form';
import { getCategoryFormValuesFromCategory } from '@/features/admin/categories/lib/category-form-data';
import { ArchivedBadge } from '@/features/admin/components/data-display/archived-badge';
import { AdminPageHeader } from '@/features/admin/components/admin-page-header';
import { CategoryNotFoundError } from '@/services/categories/category.errors';
import * as CategoryService from '@/services/categories/category.service';

interface EditCategoryPageProps {
  params: Promise<{
    id: string;
  }>;
}

async function getCategoryOrNotFound(id: string) {
  try {
    return await CategoryService.getCategoryById(id);
  } catch (error) {
    if (error instanceof CategoryNotFoundError) {
      notFound();
    }

    throw error;
  }
}

export default async function EditCategoryPage({ params }: EditCategoryPageProps) {
  const { id } = await params;
  const category = await getCategoryOrNotFound(id);

  return (
    <section className="space-y-6">
      <AdminPageHeader
        title="Editar categoría"
        description="Actualiza la información editorial y de publicación de la categoría."
        actions={
          <Button asChild variant="outline">
            <Link href="/admin/categories">
              <ArrowLeft className="size-4" aria-hidden="true" />
              Volver
            </Link>
          </Button>
        }
      />

      <div className="flex flex-wrap gap-2">
        <ArchivedBadge isArchived={category.isArchived} />
      </div>

      <CategoryForm
        mode="edit"
        categoryId={category.id}
        initialValues={getCategoryFormValuesFromCategory(category)}
      />
    </section>
  );
}
