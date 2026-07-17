import type { Author } from '@/db/schema';
import type { CreateAuthorInput, UpdateAuthorInput } from '@/schemas/authors/author.schema';

export interface AuthorRepository {
  findById(id: string): Promise<Author | null>;
  findBySlug(slug: string): Promise<Author | null>;
  findByIds(ids: string[]): Promise<Author[]>;
  findAll(): Promise<Author[]>;
  findPublished(): Promise<Author[]>;
  existsBySlug(slug: string, excludeId?: string): Promise<boolean>;
  create(data: CreateAuthorInput): Promise<Author>;
  update(id: string, data: UpdateAuthorInput): Promise<Author | null>;
}
