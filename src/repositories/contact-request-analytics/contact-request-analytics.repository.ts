import 'server-only';

import { and, asc, desc, eq, gte, isNotNull, lte, ne, sql } from 'drizzle-orm';

import { db } from '@/db';
import { contactRequests, services } from '@/db/schema';
import type {
  ContactRequestAnalyticsRange,
  ContactRequestStatusCounts,
  PendingContactRequestAnalyticsItem,
} from '@/services/contact-request-analytics/contact-request-analytics.types';
import type { ContactRequestSource } from '@/schemas/contact-requests/contact-request.schema';

function getRangeCondition(range: ContactRequestAnalyticsRange) {
  const conditions = [
    range.startAt ? gte(contactRequests.createdAt, range.startAt) : undefined,
    lte(contactRequests.createdAt, range.endAt),
  ].filter((condition) => condition !== undefined);

  return conditions.length > 0 ? and(...conditions) : undefined;
}

const newCount = sql<number>`count(*) filter (where ${contactRequests.status} = 'new')`.mapWith(
  Number,
);
const contactedCount =
  sql<number>`count(*) filter (where ${contactRequests.status} = 'contacted')`.mapWith(Number);
const inProgressCount =
  sql<number>`count(*) filter (where ${contactRequests.status} = 'in_progress')`.mapWith(Number);
const wonCount = sql<number>`count(*) filter (where ${contactRequests.status} = 'won')`.mapWith(
  Number,
);
const lostCount = sql<number>`count(*) filter (where ${contactRequests.status} = 'lost')`.mapWith(
  Number,
);
const openCount =
  sql<number>`count(*) filter (where ${contactRequests.status} in ('new', 'contacted', 'in_progress'))`.mapWith(
    Number,
  );
const notificationProblemsCount =
  sql<number>`count(*) filter (where ${contactRequests.emailSentAt} is null or ${contactRequests.emailError} is not null)`.mapWith(
    Number,
  );

export async function getStatusCounts(
  range: ContactRequestAnalyticsRange,
): Promise<ContactRequestStatusCounts> {
  const [result] = await db
    .select({
      total: sql<number>`count(*)`.mapWith(Number),
      new: newCount,
      contacted: contactedCount,
      inProgress: inProgressCount,
      won: wonCount,
      lost: lostCount,
      open: openCount,
      notificationProblems: notificationProblemsCount,
    })
    .from(contactRequests)
    .where(getRangeCondition(range));

  return {
    total: result?.total ?? 0,
    new: result?.new ?? 0,
    contacted: result?.contacted ?? 0,
    inProgress: result?.inProgress ?? 0,
    won: result?.won ?? 0,
    lost: result?.lost ?? 0,
    open: result?.open ?? 0,
    notificationProblems: result?.notificationProblems ?? 0,
  };
}

export async function getServiceAnalytics(range: ContactRequestAnalyticsRange) {
  const total = sql<number>`count(*)`.mapWith(Number);
  const rows = await db
    .select({
      serviceId: services.id,
      serviceName: services.name,
      serviceSlug: services.slug,
      total,
      won: wonCount,
      lost: lostCount,
      open: openCount,
    })
    .from(contactRequests)
    .innerJoin(services, eq(services.id, contactRequests.serviceId))
    .where(getRangeCondition(range))
    .groupBy(services.id, services.name, services.slug)
    .orderBy(desc(total), asc(services.name), asc(services.id));

  return rows;
}

export async function getSourceAnalytics(range: ContactRequestAnalyticsRange) {
  const total = sql<number>`count(*)`.mapWith(Number);
  const rows = await db
    .select({
      source: contactRequests.source,
      total,
      won: wonCount,
      lost: lostCount,
    })
    .from(contactRequests)
    .where(getRangeCondition(range))
    .groupBy(contactRequests.source)
    .orderBy(desc(total), asc(contactRequests.source));

  return rows.map((row) => ({
    ...row,
    source: row.source as ContactRequestSource,
  }));
}

export async function getCampaignAnalytics(range: ContactRequestAnalyticsRange) {
  const total = sql<number>`count(*)`.mapWith(Number);
  const rows = await db
    .select({
      campaign: contactRequests.utmCampaign,
      total,
      won: wonCount,
      lost: lostCount,
    })
    .from(contactRequests)
    .where(
      and(
        getRangeCondition(range),
        isNotNull(contactRequests.utmCampaign),
        ne(contactRequests.utmCampaign, ''),
      ),
    )
    .groupBy(contactRequests.utmCampaign)
    .orderBy(desc(total), asc(contactRequests.utmCampaign));

  return rows
    .filter((row): row is typeof row & { campaign: string } => Boolean(row.campaign))
    .map((row) => ({
      campaign: row.campaign,
      total: row.total,
      won: row.won,
      lost: row.lost,
    }));
}

export async function getMonthlyAnalytics(range: ContactRequestAnalyticsRange) {
  const month = sql<string>`to_char(date_trunc('month', ${contactRequests.createdAt} AT TIME ZONE 'Europe/Madrid'), 'YYYY-MM')`;
  const rows = await db
    .select({
      month,
      total: sql<number>`count(*)`.mapWith(Number),
      won: wonCount,
      lost: lostCount,
    })
    .from(contactRequests)
    .where(getRangeCondition(range))
    .groupBy(month)
    .orderBy(asc(month));

  return rows;
}

export async function findPendingContactRequests(
  range: ContactRequestAnalyticsRange,
  limit: number,
): Promise<PendingContactRequestAnalyticsItem[]> {
  return db
    .select({
      id: contactRequests.id,
      name: contactRequests.name,
      serviceName: services.name,
      createdAt: contactRequests.createdAt,
    })
    .from(contactRequests)
    .innerJoin(services, eq(services.id, contactRequests.serviceId))
    .where(and(getRangeCondition(range), eq(contactRequests.status, 'new')))
    .orderBy(asc(contactRequests.createdAt), asc(contactRequests.id))
    .limit(limit);
}
