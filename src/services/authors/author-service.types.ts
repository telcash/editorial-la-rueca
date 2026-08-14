import type { Author, Book } from '@/db/schema';
import type { ArchiveStatus } from '@/features/admin/lib/archive-status';
import type { PaginatedResult } from '@/features/admin/lib/list-query';
import type { CreateAuthorInput, UpdateAuthorInput } from '@/schemas/authors/author.schema';

export interface AuthorAdminListItem {
  author: Author;
  bookCount: number;
  publishedBooksCount: number;
  publishedBooksPreview: AuthorPublishedBookPreview[];
}

export interface AuthorPublishedBookPreview {
  id: string;
  title: string;
}

export type AuthorRelatedBook = Pick<
  Book,
  'id' | 'title' | 'slug' | 'coverUrl' | 'isPublished' | 'isArchived' | 'isFeatured' | 'updatedAt'
>;

export const AUTHOR_ADMIN_SORT_VALUES = [
  'name-asc',
  'name-desc',
  'updated-desc',
  'created-asc',
  'published-books-desc',
  'published-books-asc',
] as const;

export type AuthorAdminSort = (typeof AUTHOR_ADMIN_SORT_VALUES)[number];

export const DEFAULT_AUTHOR_ADMIN_SORT: AuthorAdminSort = 'name-asc';

export interface AuthorDashboardCounts {
  active: number;
  archived: number;
  withoutPhoto: number;
}

export type AuthorRecentItem = Pick<
  Author,
  'id' | 'name' | 'slug' | 'photoUrl' | 'isPublished' | 'createdAt' | 'updatedAt'
>;

export interface AuthorAdminListOptions {
  query?: string;
  page: number;
  pageSize: number;
  sort?: AuthorAdminSort;
  filters?: AuthorAdminListFilters;
}

export interface AuthorAdminListFilters {
  published?: boolean;
  featured?: boolean;
  withPhoto?: boolean;
}

export type AuthorBulkAction =
  'publish' | 'unpublish' | 'feature' | 'unfeature' | 'archive' | 'restore';

export interface AuthorBulkUpdateResult {
  requested: number;
  updated: number;
  skipped: number;
  errors: number;
}

export interface AuthorPublicListOptions {
  query?: string;
  page: number;
  pageSize: number;
}

export interface AuthorRepository {
  findById(id: string): Promise<Author | null>;
  findBySlug(slug: string): Promise<Author | null>;
  findByIds(ids: string[]): Promise<Author[]>;
  findAll(status?: ArchiveStatus): Promise<Author[]>;
  findAllWithBookCount(status?: ArchiveStatus): Promise<AuthorAdminListItem[]>;
  findAllWithBookCountPaginated(
    status: ArchiveStatus,
    options: AuthorAdminListOptions,
  ): Promise<PaginatedResult<AuthorAdminListItem>>;
  getDashboardCounts(): Promise<AuthorDashboardCounts>;
  findRecent(limit?: number): Promise<AuthorRecentItem[]>;
  findActive(): Promise<Author[]>;
  findArchived(): Promise<Author[]>;
  findPublished(): Promise<Author[]>;
  findPublishedPaginated(options: AuthorPublicListOptions): Promise<PaginatedResult<Author>>;
  findPublishedBySlug(slug: string): Promise<Author | null>;
  findBooksByAuthorId(authorId: string): Promise<AuthorRelatedBook[]>;
  countBooksByAuthorId(authorId: string): Promise<number>;
  existsBySlug(slug: string, excludeId?: string): Promise<boolean>;
  create(data: CreateAuthorInput): Promise<Author>;
  update(id: string, data: UpdateAuthorInput): Promise<Author | null>;
  archive(id: string): Promise<Author | null>;
  restore(id: string): Promise<Author | null>;
  bulkUpdate(ids: string[], action: AuthorBulkAction): Promise<AuthorBulkUpdateResult>;
  deleteById(id: string): Promise<Author | null>;
}
