import type { Metadata } from 'next';

import { BookCard } from '@/components/public/book-card';
import { PublicButton } from '@/components/public/public-button';
import { PublicContainer } from '@/components/public/public-container';
import { PublicEmptyState } from '@/components/public/public-empty-state';
import { PublicPageHeader } from '@/components/public/public-page-header';
import { PublicPagination, PublicResultCount } from '@/components/public/public-pagination';
import { PublicSearchForm } from '@/components/public/public-search-form';
import { PublicSection } from '@/components/public/public-section';
import { BOOK_CARD_GRID_GAP, BOOK_CARD_WIDTH } from '@/features/public/books/book-card.helpers';
import {
  parsePublicPage,
  parsePublicSearchParam,
  PUBLIC_BOOKS_PAGE_SIZE,
} from '@/features/public/lib/list-query';
import * as BookService from '@/services/books/book.service';
import * as CategoryService from '@/services/categories/category.service';

export const metadata: Metadata = {
  title: 'Libros | Editorial La Rueca',
  description: 'Catálogo de libros publicados por Editorial La Rueca.',
};

interface PublicBooksPageProps {
  searchParams: Promise<{
    q?: string;
    category?: string;
    page?: string;
  }>;
}

export default async function PublicBooksPage({ searchParams }: PublicBooksPageProps) {
  const params = await searchParams;
  const query = parsePublicSearchParam(params.q);
  const categorySlug = parsePublicSearchParam(params.category);
  const page = parsePublicPage(params.page);
  const [books, categories] = await Promise.all([
    BookService.listPublishedBooksPaginated({
      query,
      categorySlug,
      page,
      pageSize: PUBLIC_BOOKS_PAGE_SIZE,
    }),
    CategoryService.listPublishedCategories(),
  ]);

  return (
    <PublicSection>
      <PublicContainer>
        <PublicPageHeader
          title="Libros"
          description="Explora el catálogo editorial de La Rueca por título, autor o categoría."
        />

        <div className="space-y-5">
          <PublicSearchForm
            action="/libros"
            query={query}
            queryLabel="Buscar libros"
            queryPlaceholder="Título, autor o ISBN"
            category={categorySlug}
            categoryOptions={categories.map((category) => ({
              label: category.name,
              value: category.slug,
            }))}
          />

          <PublicResultCount
            totalItems={books.totalItems}
            singularLabel="libro"
            pluralLabel="libros"
          />
        </div>

        {books.items.length > 0 ? (
          <>
            <div
              className="mt-8 grid justify-center"
              style={{
                gridTemplateColumns: `repeat(auto-fill, minmax(${BOOK_CARD_WIDTH}px, ${BOOK_CARD_WIDTH}px))`,
                gap: BOOK_CARD_GRID_GAP,
              }}
            >
              {books.items.map((book) => (
                <BookCard key={book.id} book={book} />
              ))}
            </div>
            <PublicPagination
              basePath="/libros"
              currentPage={books.page}
              totalPages={books.totalPages}
              query={query}
              category={categorySlug}
            />
          </>
        ) : (
          <div className="mt-8">
            <PublicEmptyState
              title="No hay libros para esta búsqueda"
              description="Prueba con otro título, autor o categoría para seguir explorando el catálogo."
              action={
                query || categorySlug ? (
                  <PublicButton href="/libros" variant="secondary">
                    Ver todo el catálogo
                  </PublicButton>
                ) : null
              }
            />
          </div>
        )}
      </PublicContainer>
    </PublicSection>
  );
}
