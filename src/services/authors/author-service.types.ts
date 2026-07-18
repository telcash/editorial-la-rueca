import type { Author } from '@/db/schema';
import type { ArchiveStatus } from '@/features/admin/lib/archive-status';
import type { CreateAuthorInput, UpdateAuthorInput } from '@/schemas/authors/author.schema';

export interface AuthorAdminListItem {
  author: Author;
  bookCount: number;
}

export interface AuthorDashboardCounts {
  active: number;
  archived: number;
}

export type AuthorRecentItem = Pick<
  Author,
  'id' | 'name' | 'slug' | 'photoUrl' | 'isPublished' | 'createdAt'
>;

export interface AuthorRepository {
  findById(id: string): Promise<Author | null>;
  findBySlug(slug: string): Promise<Author | null>;
  findByIds(ids: string[]): Promise<Author[]>;
  findAll(status?: ArchiveStatus): Promise<Author[]>;
  findAllWithBookCount(status?: ArchiveStatus): Promise<AuthorAdminListItem[]>;
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
