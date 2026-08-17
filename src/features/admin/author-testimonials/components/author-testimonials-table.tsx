import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { FeaturedBadge } from '@/features/admin/components/data-display/featured-badge';
import { PublicationStatusBadge } from '@/features/admin/components/data-display/publication-status-badge';
import type { AuthorTestimonialAdminListItem } from '@/services/author-testimonials/author-testimonial.types';
import { AuthorTestimonialDeleteButton } from './author-testimonial-delete-button';

interface AuthorTestimonialsTableProps {
  testimonials: AuthorTestimonialAdminListItem[];
  canDeletePermanently: boolean;
}

function getQuotePreview(quote: string) {
  return quote.length > 140 ? `${quote.slice(0, 140)}…` : quote;
}

export function AuthorTestimonialsTable({
  testimonials,
  canDeletePermanently,
}: AuthorTestimonialsTableProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="border-b border-border bg-muted/60 text-xs font-medium uppercase text-muted-foreground">
            <tr>
              <th scope="col" className="px-4 py-3">
                Testimonio
              </th>
              <th scope="col" className="px-4 py-3">
                Autor
              </th>
              <th scope="col" className="px-4 py-3">
                Libro
              </th>
              <th scope="col" className="px-4 py-3">
                Estado
              </th>
              <th scope="col" className="px-4 py-3">
                Destacado
              </th>
              <th scope="col" className="px-4 py-3">
                Orden
              </th>
              <th scope="col" className="px-4 py-3 text-right">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {testimonials.map(({ testimonial, author, book }) => (
              <tr key={testimonial.id} className="bg-card">
                <td className="px-4 py-3">
                  <p className="max-w-lg text-foreground">{getQuotePreview(testimonial.quote)}</p>
                  {testimonial.source ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Fuente: {testimonial.source}
                    </p>
                  ) : null}
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/authors/${author.id}`}
                    className="font-medium text-foreground hover:text-primary"
                  >
                    {author.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {book ? (
                    <Link href={`/admin/books/${book.id}`} className="hover:text-primary">
                      {book.title}
                    </Link>
                  ) : (
                    'Sin libro asociado'
                  )}
                </td>
                <td className="px-4 py-3">
                  <PublicationStatusBadge isPublished={testimonial.isPublished} />
                </td>
                <td className="px-4 py-3">
                  <FeaturedBadge isFeatured={testimonial.isFeatured} />
                </td>
                <td className="px-4 py-3 text-muted-foreground">{testimonial.sortOrder}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/admin/testimonials/${testimonial.id}`}>Editar</Link>
                    </Button>
                    {canDeletePermanently ? (
                      <AuthorTestimonialDeleteButton
                        testimonialId={testimonial.id}
                        authorName={author.name}
                      />
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
