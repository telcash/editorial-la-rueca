import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

import { BookDetailHero } from '@/components/public/books/book-detail-hero';
import { BookEditionsSection } from '@/components/public/books/book-editions-section';
import { BookMetaGrid } from '@/components/public/books/book-meta-grid';
import { BookRelatedSection } from '@/components/public/books/book-related-section';
import { PublicContainer } from '@/components/public/public-container';
import { PublicSection } from '@/components/public/public-section';
import { SectionHeading } from '@/components/public/section-heading';
import {
  getBookDetailSummary,
  getBookEditorialFactItems,
  getBookSynopsis,
  getPrimaryEditionMetaItems,
  selectPrimaryBookEdition,
} from '@/features/public/books/book-edition.helpers';
import { toPlainPublicText } from '@/features/public/lib/text-format';
import { BookNotFoundError } from '@/services/books/book.errors';
import * as BookService from '@/services/books/book.service';

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

export default async function PublicBookDetailPage({ params }: PublicBookDetailPageProps) {
  const { slug } = await params;
  const book = await getPublicBook(slug);
  const primaryEdition = selectPrimaryBookEdition(book.editions);
  const heroSummary = getBookDetailSummary(book);
  const synopsis = getBookSynopsis(book);
  const heroMetaItems = getPrimaryEditionMetaItems(book, primaryEdition);
  const editorialFactItems = getBookEditorialFactItems(book, primaryEdition);
  const relatedBooks = await BookService.listRelatedPublishedBooksByAuthorIds(
    book.authors.map((author) => author.id),
    book.id,
    4,
  );

  return (
    <>
      <PublicSection>
        <PublicContainer>
          <BookDetailHero
            book={book}
            primaryEdition={primaryEdition}
            summary={heroSummary}
            metaItems={heroMetaItems}
          />
        </PublicContainer>
      </PublicSection>

      {synopsis ? (
        <PublicSection variant="compact">
          <PublicContainer>
            <div className="mx-auto max-w-public-reading border-l-2 border-public-red/25 pl-5 md:pl-7">
              <SectionHeading title="Sinopsis" variant="compact" />
              <div className="mt-public-content-gap-md whitespace-pre-line text-public-body text-public-ink/80 md:text-public-lead">
                {synopsis}
              </div>
            </div>
          </PublicContainer>
        </PublicSection>
      ) : null}

      {editorialFactItems.length > 0 ? (
        <PublicSection variant="compact">
          <PublicContainer>
            <SectionHeading
              title="Ficha editorial"
              description="Datos principales del libro y de su edición de referencia."
              variant="compact"
            />
            <BookMetaGrid
              items={editorialFactItems}
              className="mt-8 md:grid-cols-2 xl:grid-cols-3"
              itemClassName="bg-public-surface"
            />
          </PublicContainer>
        </PublicSection>
      ) : null}

      <BookEditionsSection editions={book.editions} primaryEditionId={primaryEdition?.id} />
      <BookRelatedSection books={relatedBooks} />
    </>
  );
}
