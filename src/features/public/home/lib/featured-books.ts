import type { FeaturedBook } from '@/components/public/featured-books-carousel';
import type { BookWithDetails } from '@/services/books/book.types';

export function toFeaturedBook(book: BookWithDetails): FeaturedBook {
  return {
    id: book.id,
    title: book.title,
    slug: book.slug,
    coverUrl: book.coverUrl,
    authors: book.authors.map((author) => author.name),
  };
}
