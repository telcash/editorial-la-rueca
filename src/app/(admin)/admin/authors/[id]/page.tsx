import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { AuthorBooksSection } from '@/features/admin/authors/components/author-books-section';
import { AuthorForm } from '@/features/admin/authors/components/author-form';
import { getAuthorFormValuesFromAuthor } from '@/features/admin/authors/lib/author-form-data';
import { ArchivedBadge } from '@/features/admin/components/data-display/archived-badge';
import { AdminFeedbackBanner } from '@/features/admin/components/feedback/admin-feedback-banner';
import { AdminPageHeader } from '@/features/admin/components/admin-page-header';
import { getAdminFeedbackMessage } from '@/features/admin/lib/feedback-messages';
import { AuthorNotFoundError } from '@/services/authors/author.errors';
import * as AuthorService from '@/services/authors/author.service';

interface EditAuthorPageProps {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    feedback?: string;
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

export default async function EditAuthorPage({ params, searchParams }: EditAuthorPageProps) {
  const { id } = await params;
  const { feedback } = await searchParams;
  const feedbackMessage = getAdminFeedbackMessage(feedback);
  const author = await getAuthorForEdit(id);
  const authorBooks = await AuthorService.listBooksByAuthorId(author.id);

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
      {feedbackMessage ? (
        <AdminFeedbackBanner
          tone={feedback === 'authorPhotoUploadFailed' ? 'warning' : 'success'}
          message={feedbackMessage}
        />
      ) : null}
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
      <AuthorBooksSection books={authorBooks} />
    </section>
  );
}
