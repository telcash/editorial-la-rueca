import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { AuthorTestimonialForm } from '@/features/admin/author-testimonials/components/author-testimonial-form';
import { AdminPageHeader } from '@/features/admin/components/admin-page-header';
import * as AuthorService from '@/services/authors/author.service';
import * as BookService from '@/services/books/book.service';

export default async function NewAuthorTestimonialPage() {
  const [authors, books] = await Promise.all([
    AuthorService.listActiveAuthors(),
    BookService.listActiveBooks(),
  ]);

  return (
    <section className="space-y-6">
      <AdminPageHeader
        title="Nuevo testimonio"
        description="Registra un testimonio de autor sobre su experiencia con Editorial La Rueca."
        actions={
          <Button asChild variant="outline">
            <Link href="/admin/testimonials">
              <ArrowLeft className="size-4" aria-hidden="true" />
              Volver
            </Link>
          </Button>
        }
      />

      <AuthorTestimonialForm
        authors={authors.map((author) => ({ id: author.id, label: author.name }))}
        books={books.map((book) => ({ id: book.id, label: book.title }))}
      />
    </section>
  );
}
