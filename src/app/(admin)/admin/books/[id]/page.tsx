import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { BookForm } from '@/features/admin/books/components/book-form';
import {
  mapBookToFormInitialValues,
  mergeAvailableAuthors,
} from '@/features/admin/books/lib/book-edit-form.helpers';
import { ArchivedBadge } from '@/features/admin/components/data-display/archived-badge';
import { AdminPageHeader } from '@/features/admin/components/admin-page-header';
import * as AuthorService from '@/services/authors/author.service';
import { BookNotFoundError } from '@/services/books/book.errors';
import * as BookService from '@/services/books/book.service';

interface EditBookPageProps {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    coverUpload?: string;
  }>;
}

async function getBookForEdit(id: string) {
  try {
    return await BookService.getBookById(id);
  } catch (error) {
    if (error instanceof BookNotFoundError) {
      notFound();
    }

    throw error;
  }
}

export default async function AdminEditBookPage({ params, searchParams }: EditBookPageProps) {
  const { id } = await params;
  const { coverUpload } = await searchParams;
  const [book, authors] = await Promise.all([getBookForEdit(id), AuthorService.listAuthors()]);
  const initialValues = mapBookToFormInitialValues(book);
  const authorOptions = mergeAvailableAuthors(
    authors.map((author) => ({
      id: author.id,
      name: author.name,
      slug: author.slug,
      photoUrl: author.photoUrl,
      isArchived: author.isArchived,
    })),
    initialValues.selectedAuthors,
  );

  return (
    <section className="space-y-6">
      <AdminPageHeader
        title="Editar libro"
        description={`Actualiza la información editorial y comercial de «${book.title}».`}
        actions={
          <Button asChild variant="outline">
            <Link href="/admin/books">
              <ArrowLeft className="size-4" aria-hidden="true" />
              Volver a libros
            </Link>
          </Button>
        }
      />

      {book.isArchived ? (
        <div className="flex items-center gap-3 rounded-md border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          <ArchivedBadge isArchived={book.isArchived} />
          Este libro está archivado. Puedes editarlo sin restaurarlo automáticamente.
        </div>
      ) : null}

      {coverUpload === 'failed' ? (
        <div
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          El libro se creó correctamente, pero no se pudo subir la portada. Puedes seleccionar una
          imagen e intentarlo de nuevo.
        </div>
      ) : null}

      <BookForm
        mode="edit"
        bookId={book.id}
        authors={authorOptions}
        initialValues={initialValues}
      />
    </section>
  );
}
