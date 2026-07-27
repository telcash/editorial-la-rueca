import Link from 'next/link';
import { Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { BooksTable } from '@/features/admin/books/components/books-table';
import { EmptyBooksState } from '@/features/admin/books/components/empty-books-state';
import { CatalogFilters } from '@/features/admin/components/catalog-filters';
import { AdminFeedbackBanner } from '@/features/admin/components/feedback/admin-feedback-banner';
import { ListPagination } from '@/features/admin/components/list-pagination';
import { AdminPageHeader } from '@/features/admin/components/admin-page-header';
import { getAdminFeedbackMessage } from '@/features/admin/lib/feedback-messages';
import { parseAdminListQuery, parseTriStateFilter } from '@/features/admin/lib/list-query';
import { requireEditorialStaff } from '@/services/auth/access.service';
import * as BookService from '@/services/books/book.service';
import * as CategoryService from '@/services/categories/category.service';

interface AdminBooksPageProps {
  searchParams: Promise<{
    status?: string;
    q?: string;
    page?: string;
    pageSize?: string;
    published?: string;
    featured?: string;
    image?: string;
    category?: string;
    feedback?: string;
  }>;
}

function toBooleanFilter(value: 'all' | 'true' | 'false') {
  if (value === 'all') {
    return undefined;
  }

  return value === 'true';
}

export default async function AdminBooksPage({ searchParams }: AdminBooksPageProps) {
  const params = await searchParams;
  const { status, query, page, pageSize } = parseAdminListQuery(params);
  const published = parseTriStateFilter(params.published);
  const featured = parseTriStateFilter(params.featured);
  const image = parseTriStateFilter(params.image);
  const category = params.category?.trim() || undefined;
  const feedbackMessage = getAdminFeedbackMessage(params.feedback);
  const staff = await requireEditorialStaff();
  const [books, categories] = await Promise.all([
    BookService.listBooksPaginated(status, {
      query,
      page,
      pageSize,
      filters: {
        published: toBooleanFilter(published),
        featured: toBooleanFilter(featured),
        withCover: toBooleanFilter(image),
        categorySlug: category,
      },
    }),
    CategoryService.listActiveCategories(),
  ]);

  return (
    <section className="space-y-6">
      {feedbackMessage ? <AdminFeedbackBanner tone="success" message={feedbackMessage} /> : null}

      <AdminPageHeader
        title="Libros"
        description="Gestiona el catálogo, sus autores, ediciones y precios."
        actions={
          <Button asChild>
            <Link href="/admin/books/new">
              <Plus className="size-4" aria-hidden="true" />
              Nuevo libro
            </Link>
          </Button>
        }
      />

      <CatalogFilters
        action="/admin/books"
        status={status}
        query={query}
        published={published}
        featured={featured}
        image={image}
        imageLabel="Portada"
        searchPlaceholder="Buscar por título, slug o ISBN..."
        category={category}
        categoryOptions={categories.map((item) => ({ value: item.slug, label: item.name }))}
        pageSize={pageSize}
      />

      {books.items.length > 0 ? (
        <>
          <BooksTable books={books.items} canDeletePermanently={staff.role === 'admin'} />
          <ListPagination
            baseHref="/admin/books"
            status={status}
            query={query}
            page={books.page}
            pageSize={books.pageSize}
            totalPages={books.totalPages}
            totalItems={books.totalItems}
            params={{
              published,
              featured,
              image,
              category,
            }}
          />
        </>
      ) : (
        <EmptyBooksState status={status} />
      )}
    </section>
  );
}
