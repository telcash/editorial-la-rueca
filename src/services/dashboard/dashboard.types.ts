import type {
  AuthorDashboardCounts,
  AuthorRecentItem,
} from '@/services/authors/author-service.types';
import type {
  BookDashboardCounts,
  BookRecentItem,
  BookRepository,
} from '@/services/books/book.types';

export interface DashboardAuthorRepository {
  getDashboardCounts(): Promise<AuthorDashboardCounts>;
  findRecent(limit?: number): Promise<AuthorRecentItem[]>;
}

export type DashboardBookRepository = Pick<BookRepository, 'getDashboardCounts' | 'findRecent'>;

export interface AdminDashboardData {
  metrics: {
    authorsActive: number;
    authorsArchived: number;
    authorsWithoutPhoto: number;
    booksActive: number;
    booksPublished: number;
    booksDraft: number;
    booksArchived: number;
    booksWithoutCover: number;
  };
  recentBooks: BookRecentItem[];
  recentAuthors: AuthorRecentItem[];
}

export type { AuthorDashboardCounts, AuthorRecentItem, BookDashboardCounts, BookRecentItem };
