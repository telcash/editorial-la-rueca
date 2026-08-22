import 'server-only';

import { and, count, desc, eq, gte, ilike, isNotNull, isNull, lte, or, sql } from 'drizzle-orm';

import { db } from '@/db';
import { contactRequests, services, type ContactRequest } from '@/db/schema';
import { createPaginatedResult, getOffset } from '@/features/admin/lib/list-query';
import type { CreateContactRequestInput } from '@/schemas/contact-requests/contact-request.schema';
import type {
  ContactRequestAdminDetail,
  ContactRequestAdminFilters,
  ContactRequestAdminListItem,
  ContactRequestAdminListOptions,
  ContactRequestCounts,
} from '@/services/contact-requests/contact-request.types';
import type {
  ContactRequestSource,
  ContactRequestStatus,
  UpdateContactRequestAdminInput,
} from '@/schemas/contact-requests/contact-request.schema';

function getSearchCondition(query: string | undefined) {
  const normalizedQuery = query?.trim();

  if (!normalizedQuery) {
    return undefined;
  }

  const pattern = `%${normalizedQuery}%`;

  return or(
    ilike(contactRequests.name, pattern),
    ilike(contactRequests.email, pattern),
    ilike(contactRequests.phone, pattern),
    ilike(contactRequests.province, pattern),
  );
}

function getFilterCondition(filters: ContactRequestAdminFilters = {}) {
  const conditions = [
    getSearchCondition(filters.query),
    filters.status && filters.status !== 'all'
      ? eq(contactRequests.status, filters.status)
      : undefined,
    filters.serviceId ? eq(contactRequests.serviceId, filters.serviceId) : undefined,
    filters.source && filters.source !== 'all'
      ? eq(contactRequests.source, filters.source)
      : undefined,
    filters.emailStatus === 'sent'
      ? and(isNotNull(contactRequests.emailSentAt), isNull(contactRequests.emailError))
      : undefined,
    filters.emailStatus === 'problem'
      ? or(isNull(contactRequests.emailSentAt), isNotNull(contactRequests.emailError))
      : undefined,
    filters.dateFrom ? gte(contactRequests.createdAt, filters.dateFrom) : undefined,
    filters.dateTo ? lte(contactRequests.createdAt, filters.dateTo) : undefined,
  ].filter((condition) => condition !== undefined);

  return conditions.length > 0 ? and(...conditions) : undefined;
}

function mapListRow(row: {
  contactRequest: ContactRequest;
  service: { id: string; name: string; slug: string };
}): ContactRequestAdminListItem {
  return {
    id: row.contactRequest.id,
    name: row.contactRequest.name,
    email: row.contactRequest.email,
    phone: row.contactRequest.phone,
    province: row.contactRequest.province,
    status: row.contactRequest.status as ContactRequestStatus,
    source: row.contactRequest.source as ContactRequestSource,
    emailSentAt: row.contactRequest.emailSentAt,
    emailError: row.contactRequest.emailError,
    createdAt: row.contactRequest.createdAt,
    updatedAt: row.contactRequest.updatedAt,
    service: row.service,
  };
}

function mapDetailRow(row: {
  contactRequest: ContactRequest;
  service: { id: string; name: string; slug: string };
}): ContactRequestAdminDetail {
  return {
    ...row.contactRequest,
    status: row.contactRequest.status as ContactRequestStatus,
    source: row.contactRequest.source as ContactRequestSource,
    service: row.service,
  };
}

async function findDetailById(id: string): Promise<ContactRequestAdminDetail | null> {
  const [row] = await db
    .select({
      contactRequest: contactRequests,
      service: {
        id: services.id,
        name: services.name,
        slug: services.slug,
      },
    })
    .from(contactRequests)
    .innerJoin(services, eq(services.id, contactRequests.serviceId))
    .where(eq(contactRequests.id, id))
    .limit(1);

  return row ? mapDetailRow(row) : null;
}

export async function findById(id: string): Promise<ContactRequestAdminDetail | null> {
  return findDetailById(id);
}

export async function findAllPaginated(options: ContactRequestAdminListOptions) {
  const whereCondition = getFilterCondition(options.filters);
  const [{ totalItems = 0 } = {}] = await db
    .select({ totalItems: count() })
    .from(contactRequests)
    .innerJoin(services, eq(services.id, contactRequests.serviceId))
    .where(whereCondition);
  const totalPages = Math.max(1, Math.ceil(totalItems / options.pageSize));
  const safePage = Math.min(Math.max(options.page, 1), totalPages);
  const rows = await db
    .select({
      contactRequest: contactRequests,
      service: {
        id: services.id,
        name: services.name,
        slug: services.slug,
      },
    })
    .from(contactRequests)
    .innerJoin(services, eq(services.id, contactRequests.serviceId))
    .where(whereCondition)
    .orderBy(desc(contactRequests.createdAt), desc(contactRequests.id))
    .limit(options.pageSize)
    .offset(getOffset(safePage, options.pageSize));

  return createPaginatedResult(rows.map(mapListRow), totalItems, safePage, options.pageSize);
}

export async function create(input: CreateContactRequestInput): Promise<ContactRequest> {
  const [contactRequest] = await db.insert(contactRequests).values(input).returning();

  if (!contactRequest) {
    throw new Error('Contact request creation did not return a record.');
  }

  return contactRequest;
}

export async function update(
  id: string,
  input: UpdateContactRequestAdminInput,
): Promise<ContactRequestAdminDetail | null> {
  const [contactRequest] = await db
    .update(contactRequests)
    .set({
      ...input,
      updatedAt: new Date(),
    })
    .where(eq(contactRequests.id, id))
    .returning({ id: contactRequests.id });

  return contactRequest ? findDetailById(contactRequest.id) : null;
}

export async function updateStatus(
  id: string,
  status: ContactRequestStatus,
): Promise<ContactRequestAdminDetail | null> {
  return update(id, { status });
}

export async function updateInternalNotes(
  id: string,
  internalNotes: string | null,
): Promise<ContactRequestAdminDetail | null> {
  return update(id, { internalNotes });
}

export async function markEmailNotificationSent(
  id: string,
  sentAt: Date,
): Promise<ContactRequestAdminDetail | null> {
  const [contactRequest] = await db
    .update(contactRequests)
    .set({
      emailSentAt: sentAt,
      emailError: null,
      updatedAt: new Date(),
    })
    .where(eq(contactRequests.id, id))
    .returning({ id: contactRequests.id });

  return contactRequest ? findDetailById(contactRequest.id) : null;
}

export async function markEmailNotificationFailed(
  id: string,
  emailError: string,
): Promise<ContactRequestAdminDetail | null> {
  const [contactRequest] = await db
    .update(contactRequests)
    .set({
      emailSentAt: null,
      emailError,
      updatedAt: new Date(),
    })
    .where(eq(contactRequests.id, id))
    .returning({ id: contactRequests.id });

  return contactRequest ? findDetailById(contactRequest.id) : null;
}

export async function getCounts(
  filters: ContactRequestAdminFilters = {},
): Promise<ContactRequestCounts> {
  const whereCondition = getFilterCondition(filters);
  const [result] = await db
    .select({
      total: count().mapWith(Number),
      new: sql<number>`count(*) filter (where ${contactRequests.status} = 'new')`.mapWith(Number),
      inProgress:
        sql<number>`count(*) filter (where ${contactRequests.status} = 'in_progress')`.mapWith(
          Number,
        ),
      won: sql<number>`count(*) filter (where ${contactRequests.status} = 'won')`.mapWith(Number),
    })
    .from(contactRequests)
    .innerJoin(services, eq(services.id, contactRequests.serviceId))
    .where(whereCondition);

  return {
    total: result?.total ?? 0,
    new: result?.new ?? 0,
    inProgress: result?.inProgress ?? 0,
    won: result?.won ?? 0,
  };
}
