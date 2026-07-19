import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { CategoryForm } from '@/features/admin/categories/components/category-form';
import { AdminPageHeader } from '@/features/admin/components/admin-page-header';

export default function NewCategoryPage() {
  return (
    <section className="space-y-6">
      <AdminPageHeader
        title="Nueva categoría"
        description="Crea una categoría editorial para clasificar libros."
        actions={
          <Button asChild variant="outline">
            <Link href="/admin/categories">
              <ArrowLeft className="size-4" aria-hidden="true" />
              Volver
            </Link>
          </Button>
        }
      />
      <CategoryForm />
    </section>
  );
}
