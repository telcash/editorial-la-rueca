import 'server-only';

import { and, asc, count, eq, ilike, ne, or } from 'drizzle-orm';

import { db } from '@/db';
import { services, type EditorialService } from '@/db/schema';
import type { ArchiveStatus } from '@/features/admin/lib/archive-status';
import type { PaginatedResult } from '@/features/admin/lib/list-query';
import { createPaginatedResult, getOffset } from '@/features/admin/lib/list-query';
import type {
  EditorialServiceAdminListOptions,
  EditorialServicePublicItem,
} from '@/services/editorial-services/editorial-service.types';
import type {
  CreateServiceInput,
  UpdateServiceInput,
} from '@/schemas/editorial-services/editorial-service.schema';

function getArchiveCondition(status: ArchiveStatus = 'active') {
  if (status === 'all') {
    return undefined;
  }

  return eq(services.isArchived, status === 'archived');
}

function getServiceSearchCondition(query: string | undefined) {
  const normalizedQuery = query?.trim();

  if (!normalizedQuery) {
    return undefined;
  }

  const pattern = `%${normalizedQuery}%`;

  return or(ilike(services.name, pattern), ilike(services.slug, pattern));
}

function getServiceListCondition(status: ArchiveStatus, query: string | undefined) {
  const conditions = [getArchiveCondition(status), getServiceSearchCondition(query)].filter(
    (condition) => condition !== undefined,
  );

  return conditions.length > 0 ? and(...conditions) : undefined;
}

function getServiceOrder() {
  return [asc(services.sortOrder), asc(services.name), asc(services.id)];
}

export async function findById(id: string): Promise<EditorialService | null> {
  const [service] = await db.select().from(services).where(eq(services.id, id)).limit(1);

  return service ?? null;
}

export async function findBySlug(slug: string): Promise<EditorialService | null> {
  const [service] = await db.select().from(services).where(eq(services.slug, slug)).limit(1);

  return service ?? null;
}

export async function findAll(
  status: ArchiveStatus = 'active',
  options: Pick<EditorialServiceAdminListOptions, 'query'> = {},
): Promise<EditorialService[]> {
  return db
    .select()
    .from(services)
    .where(getServiceListCondition(status, options.query))
    .orderBy(...getServiceOrder());
}

export async function findAllPaginated(
  status: ArchiveStatus = 'active',
  options: EditorialServiceAdminListOptions,
): Promise<PaginatedResult<EditorialService>> {
  const whereCondition = getServiceListCondition(status, options.query);
  const [{ totalItems = 0 } = {}] = await db
    .select({ totalItems: count() })
    .from(services)
    .where(whereCondition);
  const totalPages = Math.max(1, Math.ceil(totalItems / options.pageSize));
  const safePage = Math.min(Math.max(options.page, 1), totalPages);
  const serviceRows = await db
    .select()
    .from(services)
    .where(whereCondition)
    .orderBy(...getServiceOrder())
    .limit(options.pageSize)
    .offset(getOffset(safePage, options.pageSize));

  return createPaginatedResult(serviceRows, totalItems, safePage, options.pageSize);
}

export async function findActive(): Promise<EditorialService[]> {
  return findAll('active');
}

export async function findArchived(): Promise<EditorialService[]> {
  return findAll('archived');
}

export async function findPublished(): Promise<EditorialServicePublicItem[]> {
  return db
    .select({
      id: services.id,
      name: services.name,
      slug: services.slug,
      shortDescription: services.shortDescription,
      description: services.description,
      isFeatured: services.isFeatured,
    })
    .from(services)
    .where(and(eq(services.isPublished, true), eq(services.isArchived, false)))
    .orderBy(...getServiceOrder());
}

export async function existsBySlug(slug: string, excludeId?: string): Promise<boolean> {
  const conditions = excludeId
    ? and(eq(services.slug, slug), ne(services.id, excludeId))
    : eq(services.slug, slug);
  const [service] = await db.select({ id: services.id }).from(services).where(conditions).limit(1);

  return service !== undefined;
}

export async function create(data: CreateServiceInput): Promise<EditorialService> {
  const [service] = await db.insert(services).values(data).returning();

  if (!service) {
    throw new Error('Service creation did not return a record.');
  }

  return service;
}

export async function update(
  id: string,
  data: UpdateServiceInput,
): Promise<EditorialService | null> {
  const [service] = await db
    .update(services)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(services.id, id))
    .returning();

  return service ?? null;
}

export async function archive(id: string): Promise<EditorialService | null> {
  const [service] = await db
    .update(services)
    .set({
      isArchived: true,
      archivedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(services.id, id))
    .returning();

  return service ?? null;
}

export async function restore(id: string): Promise<EditorialService | null> {
  const [service] = await db
    .update(services)
    .set({
      isArchived: false,
      archivedAt: null,
      updatedAt: new Date(),
    })
    .where(eq(services.id, id))
    .returning();

  return service ?? null;
}
