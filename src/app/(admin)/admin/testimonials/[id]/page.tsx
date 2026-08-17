import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { AuthorTestimonialForm } from '@/features/admin/author-testimonials/components/author-testimonial-form';
import { getAuthorTestimonialFormValuesFromTestimonial } from '@/features/admin/author-testimonials/lib/author-testimonial-form-data';
import { AdminPageHeader } from '@/features/admin/components/admin-page-header';
import { AuthorTestimonialNotFoundError } from '@/services/author-testimonials/author-testimonial.errors';
import * as AuthorTestimonialService from '@/services/author-testimonials/author-testimonial.service';
import * as AuthorService from '@/services/authors/author.service';
import * as BookService from '@/services/books/book.service';

interface EditAuthorTestimonialPageProps {
  params: Promise<{
    id: string;
  }>;
}

async function getTestimonialOrNotFound(id: string) {
  try {
    return await AuthorTestimonialService.getTestimonialById(id);
  } catch (error) {
    if (error instanceof AuthorTestimonialNotFoundError) {
      notFound();
    }

    throw error;
  }
}

export default async function EditAuthorTestimonialPage({
  params,
}: EditAuthorTestimonialPageProps) {
  const { id } = await params;
  const [testimonial, authors, books] = await Promise.all([
    getTestimonialOrNotFound(id),
    AuthorService.listActiveAuthors(),
    BookService.listActiveBooks(),
  ]);

  return (
    <section className="space-y-6">
      <AdminPageHeader
        title="Editar testimonio"
        description="Actualiza el contenido, publicación y orden del testimonio."
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
        mode="edit"
        testimonialId={testimonial.id}
        initialValues={getAuthorTestimonialFormValuesFromTestimonial(testimonial)}
        authors={authors.map((author) => ({ id: author.id, label: author.name }))}
        books={books.map((book) => ({ id: book.id, label: book.title }))}
      />
    </section>
  );
}
