import type { EditorialService } from '@/db/schema';
import type { ArchiveStatus } from '@/features/admin/lib/archive-status';
import type { PaginatedResult } from '@/features/admin/lib/list-query';
import type {
  CreateServiceInput,
  UpdateServiceInput,
} from '@/schemas/editorial-services/editorial-service.schema';

export interface EditorialServiceAdminListOptions {
  query?: string;
  page: number;
  pageSize: number;
}

export interface EditorialServicePublicItem {
  id: EditorialService['id'];
  name: EditorialService['name'];
  slug: EditorialService['slug'];
  shortDescription: EditorialService['shortDescription'];
  description: EditorialService['description'];
  isFeatured: EditorialService['isFeatured'];
}

export interface EditorialServiceRepository {
  findById(id: string): Promise<EditorialService | null>;
  findBySlug(slug: string): Promise<EditorialService | null>;
  findAll(
    status?: ArchiveStatus,
    options?: Pick<EditorialServiceAdminListOptions, 'query'>,
  ): Promise<EditorialService[]>;
  findAllPaginated(
    status: ArchiveStatus,
    options: EditorialServiceAdminListOptions,
  ): Promise<PaginatedResult<EditorialService>>;
  findActive(): Promise<EditorialService[]>;
  findArchived(): Promise<EditorialService[]>;
  findPublished(): Promise<EditorialServicePublicItem[]>;
  existsBySlug(slug: string, excludeId?: string): Promise<boolean>;
  create(data: CreateServiceInput): Promise<EditorialService>;
  update(id: string, data: UpdateServiceInput): Promise<EditorialService | null>;
  archive(id: string): Promise<EditorialService | null>;
  restore(id: string): Promise<EditorialService | null>;
}
