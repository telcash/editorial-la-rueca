import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ArrowLeft, BookOpen } from 'lucide-react';

import { BookCard } from '@/components/public/book-card';
import { PublicCard } from '@/components/public/public-card';
import { PublicContainer } from '@/components/public/public-container';
import { PublicSection } from '@/components/public/public-section';
import { SectionHeading } from '@/components/public/section-heading';
import {
  formatEditionFormat,
  formatEditionPrice,
  formatPublicationYear,
  getEditionIsbn,
} from '@/features/public/lib/book-format';
import { toPlainPublicText } from '@/features/public/lib/text-format';
import { BookNotFoundError } from '@/services/books/book.errors';
import * as BookService from '@/services/books/book.service';
import type { BookWithDetails } from '@/services/books/book.types';

interface PublicBookDetailPageProps {
  params: Promise<{
    slug: string;
  }>;
}

async function getPublicBook(slug: string) {
  try {
    return await BookService.getPublishedBookBySlug(slug);
  } catch (error) {
    if (error instanceof BookNotFoundError) {
      notFound();
    }

    throw error;
  }
}

export async function generateMetadata({ params }: PublicBookDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const book = await getPublicBook(slug);

  return {
    title: `${book.metaTitle ?? book.title} | Editorial La Rueca`,
    description:
      toPlainPublicText(book.metaDescription ?? book.excerpt ?? book.description) ?? undefined,
  };
}

function BookCover({ book }: { book: BookWithDetails }) {
  return (
    <div className="relative aspect-[3/4] overflow-hidden rounded-2xl border border-public-border bg-public-surface-subtle shadow-[0_18px_50px_rgba(23,23,23,0.08)]">
      {book.coverUrl ? (
        <Image
          src={book.coverUrl}
          alt={`Portada de ${book.title}`}
          fill
          sizes="(min-width: 1024px) 33vw, 90vw"
          className="object-cover"
          priority
        />
      ) : (
        <div className="flex h-full items-center justify-center text-public-muted">
          <BookOpen className="size-20" aria-hidden="true" />
        </div>
      )}
    </div>
  );
}

function EditionCard({ edition }: { edition: BookWithDetails['editions'][number] }) {
  const isbn = getEditionIsbn(edition);
  const price = formatEditionPrice(edition);
  const year = formatPublicationYear(edition.publicationDate);

  return (
    <PublicCard className="p-5">
      <h2 className="text-base font-bold text-public-ink">{formatEditionFormat(edition.format)}</h2>
      {edition.editionLabel ? (
        <p className="mt-1 text-sm text-public-muted">{edition.editionLabel}</p>
      ) : null}
      <dl className="mt-4 grid gap-3 text-sm">
        {isbn ? (
          <div>
            <dt className="font-bold text-public-ink">ISBN</dt>
            <dd className="text-public-muted">{isbn}</dd>
          </div>
        ) : null}
        {year ? (
          <div>
            <dt className="font-bold text-public-ink">Año</dt>
            <dd className="text-public-muted">{year}</dd>
          </div>
        ) : null}
        {edition.pages ? (
          <div>
            <dt className="font-bold text-public-ink">Páginas</dt>
            <dd className="text-public-muted">{edition.pages}</dd>
          </div>
        ) : null}
        {price ? (
          <div>
            <dt className="font-bold text-public-ink">Precio</dt>
            <dd className="text-public-muted">{price}</dd>
          </div>
        ) : null}
      </dl>
    </PublicCard>
  );
}

export default async function PublicBookDetailPage({ params }: PublicBookDetailPageProps) {
  const { slug } = await params;
  const book = await getPublicBook(slug);
  const description = toPlainPublicText(book.description);
  const excerpt = toPlainPublicText(book.excerpt);
  const relatedBooks = await BookService.listRelatedPublishedBooksByAuthorIds(
    book.authors.map((author) => author.id),
    book.id,
    4,
  );

  return (
    <>
      <PublicSection>
        <PublicContainer>
          <Link
            href="/libros"
            className="inline-flex items-center gap-2 text-sm font-bold text-public-red transition hover:text-public-red-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-public-red focus-visible:ring-offset-2"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Volver al catálogo
          </Link>

          <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(16rem,24rem)_1fr] lg:items-start">
            <BookCover book={book} />

            <div>
              <div className="flex flex-wrap gap-2">
                {book.categories.map((category) => (
                  <Link
                    key={category.id}
                    href={`/libros?category=${category.slug}`}
                    className="rounded-full border border-public-red/20 bg-public-red-soft px-3 py-1 text-xs font-bold uppercase tracking-normal text-public-red transition hover:border-public-red focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-public-red focus-visible:ring-offset-2"
                  >
                    {category.name}
                  </Link>
                ))}
              </div>

              <h1 className="mt-5 font-serif-public text-[clamp(2.5rem,7vw,4.75rem)] font-semibold leading-[0.95] tracking-normal text-public-ink">
                {book.title}
              </h1>
              {book.subtitle ? (
                <p className="mt-4 text-xl leading-8 text-public-muted">{book.subtitle}</p>
              ) : null}
              {book.authors.length > 0 ? (
                <p className="mt-5 text-base leading-7 text-public-muted">
                  Por{' '}
                  {book.authors.map((author, index) => (
                    <span key={author.id}>
                      <Link
                        href={`/autores/${author.slug}`}
                        className="font-bold text-public-ink transition hover:text-public-red focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-public-red focus-visible:ring-offset-2"
                      >
                        {author.name}
                      </Link>
                      {index < book.authors.length - 1 ? ', ' : ''}
                    </span>
                  ))}
                </p>
              ) : null}

              {description ? (
                <div className="mt-8 max-w-3xl whitespace-pre-line text-base leading-8 text-public-ink/80">
                  {description}
                </div>
              ) : excerpt ? (
                <p className="mt-8 max-w-3xl text-base leading-8 text-public-ink/80">{excerpt}</p>
              ) : null}

              {book.editions.length > 0 ? (
                <div className="mt-10">
                  <h2 className="font-serif-public text-3xl font-semibold text-public-ink">
                    Ediciones
                  </h2>
                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    {book.editions.map((edition) => (
                      <EditionCard key={edition.id} edition={edition} />
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </PublicContainer>
      </PublicSection>

      {relatedBooks.length > 0 ? (
        <PublicSection variant="compact">
          <PublicContainer>
            <SectionHeading title="Más libros relacionados" />
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {relatedBooks.map((relatedBook) => (
                <BookCard key={relatedBook.id} book={relatedBook} />
              ))}
            </div>
          </PublicContainer>
        </PublicSection>
      ) : null}
    </>
  );
}
