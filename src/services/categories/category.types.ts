import type { Category } from '@/db/schema';
import type { ArchiveStatus } from '@/features/admin/lib/archive-status';
import type { PaginatedResult } from '@/features/admin/lib/list-query';
import type {
  CreateCategoryInput,
  UpdateCategoryInput,
} from '@/schemas/categories/category.schema';

export interface CategoryAdminListItem {
  category: Category;
  bookCount: number;
}

export interface CategorySummary {
  id: Category['id'];
  name: Category['name'];
  slug: Category['slug'];
  isArchived: Category['isArchived'];
  sortOrder: number;
}

export interface CategoryAdminListOptions {
  query?: string;
  page: number;
  pageSize: number;
}

export interface CategoryRepository {
  findById(id: string): Promise<Category | null>;
  findBySlug(slug: string): Promise<Category | null>;
  findByIds(ids: string[]): Promise<Category[]>;
  findAll(status?: ArchiveStatus): Promise<Category[]>;
  findAllWithBookCount(status?: ArchiveStatus): Promise<CategoryAdminListItem[]>;
  findAllWithBookCountPaginated(
    status: ArchiveStatus,
    options: CategoryAdminListOptions,
  ): Promise<PaginatedResult<CategoryAdminListItem>>;
  findActive(): Promise<Category[]>;
  findArchived(): Promise<Category[]>;
  findPublished(): Promise<Category[]>;
  existsBySlug(slug: string, excludeId?: string): Promise<boolean>;
  create(data: CreateCategoryInput): Promise<Category>;
  update(id: string, data: UpdateCategoryInput): Promise<Category | null>;
  archive(id: string): Promise<Category | null>;
  restore(id: string): Promise<Category | null>;
  deleteById(id: string): Promise<Category | null>;
  countBooksByCategoryId(categoryId: string): Promise<number>;
}
