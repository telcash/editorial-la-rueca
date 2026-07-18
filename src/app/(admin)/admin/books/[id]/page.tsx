import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { BookForm } from '@/features/admin/books/components/book-form';
import {
  mapBookToFormInitialValues,
  mergeAvailableAuthors,
} from '@/features/admin/books/lib/book-edit-form.helpers';
import { AdminPageHeader } from '@/features/admin/components/admin-page-header';
import * as AuthorService from '@/services/authors/author.service';
import { BookNotFoundError } from '@/services/books/book.errors';
import * as BookService from '@/services/books/book.service';

interface EditBookPageProps {
  params: Promise<{
    id: string;
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

export default async function AdminEditBookPage({ params }: EditBookPageProps) {
  const { id } = await params;
  const [book, authors] = await Promise.all([getBookForEdit(id), AuthorService.listAuthors()]);
  const initialValues = mapBookToFormInitialValues(book);
  const authorOptions = mergeAvailableAuthors(
    authors.map((author) => ({
      id: author.id,
      name: author.name,
      slug: author.slug,
      photoUrl: author.photoUrl,
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

      <BookForm
        mode="edit"
        bookId={book.id}
        authors={authorOptions}
        initialValues={initialValues}
      />
    </section>
  );
}
