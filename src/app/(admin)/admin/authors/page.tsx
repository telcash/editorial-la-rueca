import Link from 'next/link';
import { Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { EmptyAuthorsState } from '@/features/admin/authors/components/empty-authors-state';
import { AuthorsTable } from '@/features/admin/authors/components/authors-table';
import { CatalogFilters } from '@/features/admin/components/catalog-filters';
import { AdminFeedbackBanner } from '@/features/admin/components/feedback/admin-feedback-banner';
import { ListPagination } from '@/features/admin/components/list-pagination';
import { AdminPageHeader } from '@/features/admin/components/admin-page-header';
import { getAdminFeedbackMessage } from '@/features/admin/lib/feedback-messages';
import { parseAdminListQuery, parseTriStateFilter } from '@/features/admin/lib/list-query';
import { requireEditorialStaff } from '@/services/auth/access.service';
import * as AuthorService from '@/services/authors/author.service';
import {
  AUTHOR_ADMIN_SORT_VALUES,
  DEFAULT_AUTHOR_ADMIN_SORT,
  type AuthorAdminSort,
} from '@/services/authors/author-service.types';

interface AdminAuthorsPageProps {
  searchParams: Promise<{
    status?: string;
    q?: string;
    page?: string;
    pageSize?: string;
    published?: string;
    featured?: string;
    image?: string;
    sort?: string;
    feedback?: string;
  }>;
}

const authorSortOptions: Array<{ value: AuthorAdminSort; label: string }> = [
  { value: 'name-asc', label: 'Nombre A-Z' },
  { value: 'name-desc', label: 'Nombre Z-A' },
  { value: 'updated-desc', label: 'Actualizados recientemente' },
  { value: 'created-asc', label: 'Más antiguos' },
  { value: 'published-books-desc', label: 'Más libros publicados' },
  { value: 'published-books-asc', label: 'Menos libros publicados' },
];

function parseAuthorAdminSort(value: string | undefined): AuthorAdminSort {
  return AUTHOR_ADMIN_SORT_VALUES.includes(value as AuthorAdminSort)
    ? (value as AuthorAdminSort)
    : DEFAULT_AUTHOR_ADMIN_SORT;
}

function toBooleanFilter(value: 'all' | 'true' | 'false') {
  if (value === 'all') {
    return undefined;
  }

  return value === 'true';
}

export default async function AdminAuthorsPage({ searchParams }: AdminAuthorsPageProps) {
  const params = await searchParams;
  const { status, query, page, pageSize } = parseAdminListQuery(params);
  const published = parseTriStateFilter(params.published);
  const featured = parseTriStateFilter(params.featured);
  const image = parseTriStateFilter(params.image);
  const sort = parseAuthorAdminSort(params.sort);
  const feedbackMessage = getAdminFeedbackMessage(params.feedback);
  const staff = await requireEditorialStaff();
  const authors = await AuthorService.listAuthorsForAdminPaginated(status, {
    query,
    page,
    pageSize,
    sort,
    filters: {
      published: toBooleanFilter(published),
      featured: toBooleanFilter(featured),
      withPhoto: toBooleanFilter(image),
    },
  });

  return (
    <section className="space-y-6">
      {feedbackMessage ? <AdminFeedbackBanner tone="success" message={feedbackMessage} /> : null}

      <AdminPageHeader
        title="Autores"
        description="Gestiona el listado editorial de autoras y autores."
        actions={
          <Button asChild>
            <Link href="/admin/authors/new">
              <Plus className="size-4" aria-hidden="true" />
              Nuevo autor
            </Link>
          </Button>
        }
      />

      <CatalogFilters
        action="/admin/authors"
        status={status}
        query={query}
        published={published}
        featured={featured}
        image={image}
        imageLabel="Foto"
        searchPlaceholder="Buscar por nombre o slug..."
        sort={sort}
        sortOptions={authorSortOptions}
        defaultSort={DEFAULT_AUTHOR_ADMIN_SORT}
        pageSize={pageSize}
      />

      {authors.items.length > 0 ? (
        <>
          <AuthorsTable authors={authors.items} canDeletePermanently={staff.role === 'admin'} />
          <ListPagination
            baseHref="/admin/authors"
            status={status}
            query={query}
            page={authors.page}
            pageSize={authors.pageSize}
            totalPages={authors.totalPages}
            totalItems={authors.totalItems}
            params={{
              published,
              featured,
              image,
              sort,
            }}
          />
        </>
      ) : (
        <EmptyAuthorsState status={status} />
      )}
    </section>
  );
}
