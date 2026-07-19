import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { BookForm } from '@/features/admin/books/components/book-form';
import { AdminPageHeader } from '@/features/admin/components/admin-page-header';
import * as AuthorService from '@/services/authors/author.service';
import * as CategoryService from '@/services/categories/category.service';

export default async function AdminNewBookPage() {
  const [authors, categories] = await Promise.all([
    AuthorService.listActiveAuthors(),
    CategoryService.listActiveCategories(),
  ]);
  const authorOptions = authors.map((author) => ({
    id: author.id,
    name: author.name,
    slug: author.slug,
    photoUrl: author.photoUrl,
    isArchived: author.isArchived,
  }));
  const categoryOptions = categories.map((category) => ({
    id: category.id,
    name: category.name,
    slug: category.slug,
    isArchived: category.isArchived,
  }));

  return (
    <section className="space-y-6">
      <AdminPageHeader
        title="Nuevo libro"
        description="Añade los datos generales, autores y ediciones del libro."
        actions={
          <Button asChild variant="outline">
            <Link href="/admin/books">
              <ArrowLeft className="size-4" aria-hidden="true" />
              Volver a libros
            </Link>
          </Button>
        }
      />

      <BookForm mode="create" authors={authorOptions} categories={categoryOptions} />
    </section>
  );
}
