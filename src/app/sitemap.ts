import type { MetadataRoute } from 'next';

import * as AuthorService from '@/services/authors/author.service';
import * as BookService from '@/services/books/book.service';
import { getPublicSiteUrl } from '@/lib/seo/public-site-url';

const staticRoutes = [
  '/',
  '/libros',
  '/autores',
  '/aviso-legal',
  '/politica-de-privacidad',
  '/politica-de-cookies',
] as const;

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getPublicSiteUrl();

  if (!siteUrl) {
    throw new Error('NEXT_PUBLIC_SITE_URL is required to generate the sitemap.');
  }

  const [books, authors] = await Promise.all([
    BookService.listPublishedBooks(),
    AuthorService.listPublishedAuthors(),
  ]);

  return [
    ...staticRoutes.map((route) => ({ url: new URL(route, siteUrl).toString() })),
    ...books.map((book) => ({
      url: new URL(`/libros/${book.slug}`, siteUrl).toString(),
      lastModified: book.updatedAt,
    })),
    ...authors.map((author) => ({
      url: new URL(`/autores/${author.slug}`, siteUrl).toString(),
      lastModified: author.updatedAt,
    })),
  ];
}
