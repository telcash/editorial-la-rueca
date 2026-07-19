import type { AuthorRepository } from '@/services/authors/author-service.types';
import type { BookRepository } from '@/services/books/book.types';

export interface PublicHomeMetrics {
  publishedBooks: number;
  activeAuthors: number;
}

export type PublicHomeAuthorRepository = Pick<AuthorRepository, 'getDashboardCounts'>;
export type PublicHomeBookRepository = Pick<BookRepository, 'getDashboardCounts'>;
