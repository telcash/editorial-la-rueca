import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { AuthorForm } from '@/features/admin/authors/components/author-form';
import { AdminPageHeader } from '@/features/admin/components/admin-page-header';

export default function NewAuthorPage() {
  return (
    <section className="space-y-6">
      <AdminPageHeader
        title="Nuevo autor"
        description="Registra un autor para el catálogo editorial."
        actions={
          <Button asChild variant="outline">
            <Link href="/admin/authors">
              <ArrowLeft className="size-4" aria-hidden="true" />
              Volver a autores
            </Link>
          </Button>
        }
      />
      <AuthorForm />
    </section>
  );
}
