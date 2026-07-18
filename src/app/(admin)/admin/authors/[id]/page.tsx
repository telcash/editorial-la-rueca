import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { AuthorForm } from '@/features/admin/authors/components/author-form';
import { getAuthorFormValuesFromAuthor } from '@/features/admin/authors/lib/author-form-data';
import { ArchivedBadge } from '@/features/admin/components/data-display/archived-badge';
import { AdminPageHeader } from '@/features/admin/components/admin-page-header';
import { AuthorNotFoundError } from '@/services/authors/author.errors';
import * as AuthorService from '@/services/authors/author.service';

interface EditAuthorPageProps {
  params: Promise<{
    id: string;
  }>;
}

async function getAuthorForEdit(id: string) {
  try {
    return await AuthorService.getAuthorById(id);
  } catch (error) {
    if (error instanceof AuthorNotFoundError) {
      notFound();
    }

    throw error;
  }
}

export default async function EditAuthorPage({ params }: EditAuthorPageProps) {
  const { id } = await params;
  const author = await getAuthorForEdit(id);

  return (
    <section className="space-y-6">
      <AdminPageHeader
        title="Editar autor"
        description="Actualiza la información editorial y de publicación del autor."
        actions={
          <Button asChild variant="outline">
            <Link href="/admin/authors">
              <ArrowLeft className="size-4" aria-hidden="true" />
              Volver a autores
            </Link>
          </Button>
        }
      />
      {author.isArchived ? (
        <div className="flex items-center gap-3 rounded-md border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          <ArchivedBadge isArchived={author.isArchived} />
          Este autor está archivado. Puedes editarlo sin restaurarlo automáticamente.
        </div>
      ) : null}
      <AuthorForm
        mode="edit"
        authorId={author.id}
        initialValues={getAuthorFormValuesFromAuthor(author)}
      />
    </section>
  );
}
