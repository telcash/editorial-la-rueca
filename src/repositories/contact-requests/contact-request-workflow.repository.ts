import 'server-only';

import { and, asc, desc, eq } from 'drizzle-orm';

import { db } from '@/db';
import {
  contactRequestNotes,
  contactRequestStatusHistory,
  contactRequestStatuses,
  contactRequests,
} from '@/db/schema';
import { profiles } from '@/db/schema/auth/profiles';
import type {
  CreateContactRequestStatusInput,
  PersistContactRequestNoteInput,
  UpdateContactRequestStatusDefinitionInput,
} from '@/schemas/contact-requests/contact-request-workflow.schema';

export async function findStatuses(includeInactive: boolean) {
  return db
    .select()
    .from(contactRequestStatuses)
    .where(includeInactive ? undefined : eq(contactRequestStatuses.isActive, true))
    .orderBy(asc(contactRequestStatuses.sortOrder), asc(contactRequestStatuses.key));
}

export async function findStatusesForFilters() {
  const usedStatuses = await db
    .selectDistinct({ status: contactRequests.status })
    .from(contactRequests);
  const usedKeys = new Set(usedStatuses.map(({ status }) => status));
  const allStatuses = await findStatuses(true);

  return allStatuses.filter((status) => status.isActive || usedKeys.has(status.key));
}

export async function findStatusByKey(key: string) {
  const [status] = await db
    .select()
    .from(contactRequestStatuses)
    .where(eq(contactRequestStatuses.key, key))
    .limit(1);

  return status ?? null;
}

export async function createStatus(input: CreateContactRequestStatusInput) {
  const [status] = await db.insert(contactRequestStatuses).values(input).returning();
  return status;
}

export async function updateStatusDefinition(
  key: string,
  input: UpdateContactRequestStatusDefinitionInput,
) {
  const [status] = await db
    .update(contactRequestStatuses)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(contactRequestStatuses.key, key))
    .returning();

  return status ?? null;
}

export async function findCurrentStatus(contactRequestId: string) {
  const [request] = await db
    .select({ status: contactRequests.status })
    .from(contactRequests)
    .where(eq(contactRequests.id, contactRequestId))
    .limit(1);

  return request?.status ?? null;
}

export async function createNote(input: PersistContactRequestNoteInput) {
  const [note] = await db
    .insert(contactRequestNotes)
    .values({
      contactRequestId: input.contactRequestId,
      authorProfileId: input.authorProfileId,
      body: input.body,
    })
    .returning();

  return note;
}

export async function findNotes(contactRequestId: string) {
  return db
    .select({ note: contactRequestNotes, authorName: profiles.displayName })
    .from(contactRequestNotes)
    .leftJoin(profiles, eq(profiles.id, contactRequestNotes.authorProfileId))
    .where(eq(contactRequestNotes.contactRequestId, contactRequestId))
    .orderBy(asc(contactRequestNotes.createdAt), asc(contactRequestNotes.id));
}

export async function transitionStatus(input: {
  contactRequestId: string;
  previousStatus: string;
  newStatus: string;
  changedByProfileId: string;
}) {
  return db.transaction(async (transaction) => {
    const [activeStatus] = await transaction
      .select({ key: contactRequestStatuses.key })
      .from(contactRequestStatuses)
      .where(
        and(
          eq(contactRequestStatuses.key, input.newStatus),
          eq(contactRequestStatuses.isActive, true),
        ),
      )
      .for('share');

    if (!activeStatus) {
      return null;
    }

    const [updatedRequest] = await transaction
      .update(contactRequests)
      .set({ status: input.newStatus, updatedAt: new Date() })
      .where(
        and(
          eq(contactRequests.id, input.contactRequestId),
          eq(contactRequests.status, input.previousStatus),
        ),
      )
      .returning({ id: contactRequests.id });

    if (!updatedRequest) {
      return null;
    }

    const [historyEntry] = await transaction
      .insert(contactRequestStatusHistory)
      .values({
        contactRequestId: input.contactRequestId,
        previousStatus: input.previousStatus,
        newStatus: input.newStatus,
        changedByProfileId: input.changedByProfileId,
      })
      .returning();

    return historyEntry;
  });
}

export async function findStatusHistory(contactRequestId: string) {
  return db
    .select({ history: contactRequestStatusHistory, authorName: profiles.displayName })
    .from(contactRequestStatusHistory)
    .leftJoin(profiles, eq(profiles.id, contactRequestStatusHistory.changedByProfileId))
    .where(eq(contactRequestStatusHistory.contactRequestId, contactRequestId))
    .orderBy(desc(contactRequestStatusHistory.changedAt), desc(contactRequestStatusHistory.id));
}
