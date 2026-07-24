import type { Author } from '@/db/schema';
import type { ArchiveStatus } from '@/features/admin/lib/archive-status';
import type { PaginatedResult } from '@/features/admin/lib/list-query';
import type { CreateAuthorInput, UpdateAuthorInput } from '@/schemas/authors/author.schema';

export interface AuthorAdminListItem {
  author: Author;
  bookCount: number;
}

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
  countBooksByAuthorId(authorId: string): Promise<number>;
  existsBySlug(slug: string, excludeId?: string): Promise<boolean>;
  create(data: CreateAuthorInput): Promise<Author>;
  update(id: string, data: UpdateAuthorInput): Promise<Author | null>;
  archive(id: string): Promise<Author | null>;
  restore(id: string): Promise<Author | null>;
  deleteById(id: string): Promise<Author | null>;
}
