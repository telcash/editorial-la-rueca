import type { Metadata } from 'next';

import { AuthorCard } from '@/components/public/author-card';
import { PublicButton } from '@/components/public/public-button';
import { PublicContainer } from '@/components/public/public-container';
import { PublicEmptyState } from '@/components/public/public-empty-state';
import { PublicPageHeader } from '@/components/public/public-page-header';
import { PublicPagination, PublicResultCount } from '@/components/public/public-pagination';
import { PublicSearchForm } from '@/components/public/public-search-form';
import { PublicSection } from '@/components/public/public-section';
import {
  parsePublicPage,
  parsePublicSearchParam,
  PUBLIC_AUTHORS_PAGE_SIZE,
} from '@/features/public/lib/list-query';
import * as AuthorService from '@/services/authors/author.service';

export const metadata: Metadata = {
  title: 'Autores | Editorial La Rueca',
  description: 'Autores acompañados y publicados por Editorial La Rueca.',
};

interface PublicAuthorsPageProps {
  searchParams: Promise<{
    q?: string;
    page?: string;
  }>;
}

export default async function PublicAuthorsPage({ searchParams }: PublicAuthorsPageProps) {
  const params = await searchParams;
  const query = parsePublicSearchParam(params.q);
  const page = parsePublicPage(params.page);
  const authors = await AuthorService.listPublishedAuthorsPaginated({
    query,
    page,
    pageSize: PUBLIC_AUTHORS_PAGE_SIZE,
  });

  return (
    <PublicSection>
      <PublicContainer>
        <PublicPageHeader
          title="Autores"
          description="Conoce a las voces que forman parte del catálogo de Editorial La Rueca."
          variant="compact"
        />

        <div className="space-y-public-content-gap-sm">
          <PublicSearchForm
            action="/autores"
            query={query}
            queryLabel="Buscar autores"
            queryPlaceholder="Nombre del autor"
          />
          <PublicResultCount
            totalItems={authors.totalItems}
            singularLabel="autor"
            pluralLabel="autores"
          />
        </div>

        {authors.items.length > 0 ? (
          <>
            <div className="mt-public-content-gap-lg grid grid-cols-[minmax(0,min(82vw,17.5rem))] justify-center gap-5 sm:grid-cols-[repeat(2,13.75rem)] md:grid-cols-[repeat(3,13.75rem)] lg:grid-cols-[repeat(4,14rem)] xl:grid-cols-[repeat(5,14rem)]">
              {authors.items.map((author) => (
                <AuthorCard key={author.id} author={author} />
              ))}
            </div>
            <PublicPagination
              basePath="/autores"
              currentPage={authors.page}
              totalPages={authors.totalPages}
              query={query}
            />
          </>
        ) : (
          <div className="mt-public-content-gap-lg">
            <PublicEmptyState
              title="No hay autores para esta búsqueda"
              description="Prueba con otro nombre para seguir explorando el catálogo de autores."
              action={
                query ? (
                  <PublicButton href="/autores" variant="secondary">
                    Ver todos los autores
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
