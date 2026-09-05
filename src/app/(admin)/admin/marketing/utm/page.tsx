import type { Metadata } from 'next';

import { AdminPageHeader } from '@/features/admin/components/admin-page-header';
import { UtmGenerator } from '@/features/admin/marketing/utm-generator/utm-generator';
import { getPublicSiteUrl } from '@/lib/seo/public-site-url';
import * as AuthorService from '@/services/authors/author.service';
import * as BookService from '@/services/books/book.service';

export const metadata: Metadata = {
  title: 'Generador UTM | Panel editorial',
  robots: { index: false, follow: false },
};

export default async function UtmGeneratorPage() {
  const [books, authors] = await Promise.all([
    BookService.listPublishedBooks(),
    AuthorService.listPublishedAuthors(),
  ]);

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Generador UTM"
        description="Crea enlaces consistentes para medir la procedencia de tus solicitudes editoriales."
      />
      <UtmGenerator
        baseUrl={(getPublicSiteUrl() ?? new URL('http://localhost:3000/')).toString()}
        books={books.map(({ id, title, slug }) => ({ id, title, slug }))}
        authors={authors.map(({ id, name, slug }) => ({ id, name, slug }))}
      />
    </div>
  );
}
