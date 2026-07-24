import type { Author, Book, BookEdition } from '@/db/schema';
import type { ArchiveStatus } from '@/features/admin/lib/archive-status';
import type { PaginatedResult } from '@/features/admin/lib/list-query';
import type {
  BookEditionInput,
  CreateBookInput,
  UpdateBookInput,
} from '@/schemas/books/book.schema';

export interface BookAuthorSummary {
  id: Author['id'];
  name: Author['name'];
  slug: Author['slug'];
  photoUrl: Author['photoUrl'];
  isArchived: Author['isArchived'];
  sortOrder: number;
}

export interface BookCategorySummary {
  id: string;
  name: string;
  slug: string;
  isArchived: boolean;
  sortOrder: number;
}

export type BookEditionDetails = BookEdition;

export type BookWithDetails = Book & {
  authors: BookAuthorSummary[];
  categories: BookCategorySummary[];
  editions: BookEditionDetails[];
};

export type BookDataCreateInput = Omit<CreateBookInput, 'authorIds' | 'categoryIds' | 'editions'>;
export type BookDataUpdateInput = Omit<UpdateBookInput, 'authorIds' | 'categoryIds' | 'editions'>;

export interface BookDashboardCounts {
  active: number;
  published: number;
  drafts: number;
  archived: number;
  withoutCover: number;
}

export type BookRecentRow = Pick<
  Book,
  'id' | 'title' | 'slug' | 'coverUrl' | 'isPublished' | 'createdAt' | 'updatedAt'
>;

export type BookRecentItem = BookRecentRow & {
  authors: BookAuthorSummary[];
};

export interface BookAdminListOptions {
  query?: string;
  page: number;
  pageSize: number;
}

export interface BookRepository {
  findById(id: string): Promise<BookWithDetails | null>;
  findBySlug(slug: string): Promise<BookWithDetails | null>;
  findAll(status?: ArchiveStatus): Promise<BookWithDetails[]>;
  findAllPaginated(
    status: ArchiveStatus,
    options: BookAdminListOptions,
  ): Promise<PaginatedResult<BookWithDetails>>;
  getDashboardCounts(): Promise<BookDashboardCounts>;
  findRecent(limit?: number): Promise<BookRecentItem[]>;
  findActive(): Promise<BookWithDetails[]>;
  findArchived(): Promise<BookWithDetails[]>;
  findPublished(): Promise<BookWithDetails[]>;
  findFeaturedPublished(): Promise<BookWithDetails[]>;
  existsBySlug(slug: string, excludeId?: string): Promise<boolean>;
  existsByIsbn10(
    isbn10: string,
    excludeBookId?: string,
    excludeEditionId?: string,
  ): Promise<boolean>;
  existsByIsbn13(
    isbn13: string,
    excludeBookId?: string,
    excludeEditionId?: string,
  ): Promise<boolean>;
  create(
    bookData: BookDataCreateInput,
    authorIds: string[],
    categoryIds: string[],
    editions: BookEditionInput[],
  ): Promise<BookWithDetails>;
  update(
    id: string,
    bookData: BookDataUpdateInput,
    authorIds?: string[],
    categoryIds?: string[],
    editions?: BookEditionInput[],
  ): Promise<BookWithDetails | null>;
  archive(id: string): Promise<BookWithDetails | null>;
  restore(id: string): Promise<BookWithDetails | null>;
  deletePermanently(id: string): Promise<BookWithDetails | null>;
  findAuthorsByBookId(bookId: string): Promise<BookAuthorSummary[]>;
  findCategoriesByBookId(bookId: string): Promise<BookCategorySummary[]>;
  findEditionsByBookId(bookId: string): Promise<BookEditionDetails[]>;
}
