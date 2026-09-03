import Link from 'next/link';
import { ArrowLeft, ArrowRight } from 'lucide-react';

import { BookAuthorsLinks } from '@/components/public/books/book-authors-links';
import { BookCategoryBadges } from '@/components/public/books/book-category-badges';
import { BookMetaGrid } from '@/components/public/books/book-meta-grid';
import { PublicBookCover } from '@/components/public/books/public-book-cover';
import { PublicButton } from '@/components/public/public-button';
import type { BookMetaItem } from '@/features/public/books/book-edition.helpers';
import type { BookEditionDetails, BookWithDetails } from '@/services/books/book.types';

interface BookDetailHeroProps {
  book: BookWithDetails;
  primaryEdition: BookEditionDetails | null;
  summary: string | null;
  metaItems: BookMetaItem[];
  hasPurchaseOptions: boolean;
}

function BackToCatalogLink() {
  return (
    <Link
      href="/libros"
      className="inline-flex items-center gap-2 text-sm font-bold text-public-red transition hover:text-public-red-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-public-red focus-visible:ring-offset-2 focus-visible:ring-offset-white"
    >
      <ArrowLeft className="size-4" aria-hidden="true" />
      Volver al catálogo
    </Link>
  );
}

export function BookDetailHero({
  book,
  primaryEdition,
  summary,
  metaItems,
  hasPurchaseOptions,
}: BookDetailHeroProps) {
  return (
    <div className="rounded-public-xl border border-public-border bg-[linear-gradient(135deg,#fffaf5_0%,#ffffff_52%,#f7f2ed_100%)] px-4 py-5 shadow-[0_24px_80px_rgba(23,23,23,0.08)] sm:px-6 sm:py-7 lg:px-8 lg:py-8">
      <div className="lg:hidden">
        <BackToCatalogLink />
        <BookCategoryBadges book={book} primaryEdition={primaryEdition} className="mt-5" />
      </div>

      <div className="mt-6 grid gap-7 lg:mt-0 lg:grid-cols-[minmax(17rem,21rem)_1fr] lg:items-start lg:gap-10 xl:grid-cols-[minmax(18rem,22rem)_1fr]">
        <PublicBookCover coverUrl={book.coverUrl} title={book.title} priority />

        <div className="min-w-0">
          <div className="hidden lg:block">
            <BackToCatalogLink />
            <BookCategoryBadges book={book} primaryEdition={primaryEdition} className="mt-6" />
          </div>

          <h1 className="mt-5 font-serif-public text-public-detail-title font-semibold tracking-normal text-public-ink lg:mt-6">
            {book.title}
          </h1>
          {book.subtitle ? (
            <p className="mt-3 max-w-public-reading text-public-lead text-public-muted">
              {book.subtitle}
            </p>
          ) : null}

          <div className="mt-4">
            <BookAuthorsLinks authors={book.authors} />
          </div>

          {summary ? (
            <p className="mt-6 max-w-public-reading text-public-body text-public-ink/78 md:text-public-lead">
              {summary}
            </p>
          ) : null}

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            {hasPurchaseOptions ? (
              <PublicButton href="#comprar" className="w-full sm:w-auto">
                Comprar
              </PublicButton>
            ) : null}
            <PublicButton href="/libros" variant="secondary" className="w-full sm:w-auto">
              Ver catálogo
            </PublicButton>
          </div>

          <BookMetaGrid items={metaItems} className="mt-8 lg:grid-cols-3" />
        </div>
      </div>
    </div>
  );
}
