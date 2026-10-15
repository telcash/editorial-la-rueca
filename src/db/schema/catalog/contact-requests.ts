import { relations, sql, type InferInsertModel, type InferSelectModel } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { profiles } from '../auth/profiles';
import { services } from './services';

export const contactRequestStatuses = pgTable(
  'contact_request_statuses',
  {
    key: varchar('key', { length: 40 }).primaryKey(),
    label: varchar('label', { length: 80 }).notNull(),
    classification: varchar('classification', { length: 8 }).notNull(),
    sortOrder: integer('sort_order').default(0).notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    check(
      'contact_request_statuses_key_check',
      sql`char_length(${table.key}) >= 2 and ${table.key} ~ '^[a-z][a-z0-9]*(_[a-z0-9]+)*$'`,
    ),
    check('contact_request_statuses_label_check', sql`btrim(${table.label}) <> ''`),
    check(
      'contact_request_statuses_classification_check',
      sql`${table.classification} in ('open', 'won', 'lost')`,
    ),
    check('contact_request_statuses_sort_order_check', sql`${table.sortOrder} between 0 and 10000`),
    check(
      'contact_request_statuses_initial_active_check',
      sql`${table.key} <> 'new' or ${table.isActive} = true`,
    ),
    index('contact_request_statuses_active_order_idx').on(table.isActive, table.sortOrder),
  ],
).enableRLS();

export const contactRequests = pgTable(
  'contact_requests',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 160 }).notNull(),
    email: varchar('email', { length: 254 }).notNull(),
    phone: varchar('phone', { length: 80 }),
    province: varchar('province', { length: 120 }),
    serviceId: uuid('service_id').references(() => services.id, { onDelete: 'restrict' }),
    message: text('message').notNull(),
    status: varchar('status', { length: 40 })
      .default('new')
      .notNull()
      .references(() => contactRequestStatuses.key, { onDelete: 'restrict' }),
    source: varchar('source', { length: 40 }).default('website').notNull(),
    utmSource: varchar('utm_source', { length: 160 }),
    utmMedium: varchar('utm_medium', { length: 160 }),
    utmCampaign: varchar('utm_campaign', { length: 180 }),
    utmContent: varchar('utm_content', { length: 180 }),
    utmTerm: varchar('utm_term', { length: 180 }),
    metaLeadId: varchar('meta_lead_id', { length: 128 }),
    metaFormId: varchar('meta_form_id', { length: 128 }),
    metaFormName: varchar('meta_form_name', { length: 255 }),
    emailSentAt: timestamp('email_sent_at', { withTimezone: true }),
    emailError: text('email_error'),
    internalNotes: text('internal_notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('contact_requests_service_id_idx').on(table.serviceId),
    index('contact_requests_status_idx').on(table.status),
    index('contact_requests_source_idx').on(table.source),
    index('contact_requests_created_at_idx').on(table.createdAt),
    index('contact_requests_service_id_status_idx').on(table.serviceId, table.status),
    index('contact_requests_status_created_at_idx').on(table.status, table.createdAt),
    uniqueIndex('contact_requests_meta_lead_id_unique').on(table.metaLeadId),
  ],
).enableRLS();

export const contactRequestNotes = pgTable(
  'contact_request_notes',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    contactRequestId: uuid('contact_request_id')
      .notNull()
      .references(() => contactRequests.id, { onDelete: 'cascade' }),
    authorProfileId: uuid('author_profile_id').references(() => profiles.id, {
      onDelete: 'restrict',
    }),
    body: text('body').notNull(),
    isLegacy: boolean('is_legacy').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    check(
      'contact_request_notes_body_check',
      sql`${table.isLegacy} or (
        char_length(${table.body}) between 1 and 10000
        and btrim(${table.body}, ' ' || chr(9) || chr(10) || chr(11) || chr(12) || chr(13)) <> ''
      )`,
    ),
    check(
      'contact_request_notes_author_check',
      sql`${table.isLegacy} = true or ${table.authorProfileId} is not null`,
    ),
    index('contact_request_notes_request_created_idx').on(table.contactRequestId, table.createdAt),
    uniqueIndex('contact_request_notes_legacy_request_unique')
      .on(table.contactRequestId)
      .where(sql`${table.isLegacy} = true`),
  ],
).enableRLS();

export const contactRequestStatusHistory = pgTable(
  'contact_request_status_history',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    contactRequestId: uuid('contact_request_id')
      .notNull()
      .references(() => contactRequests.id, { onDelete: 'cascade' }),
    previousStatus: varchar('previous_status', { length: 40 }).references(
      () => contactRequestStatuses.key,
      { onDelete: 'restrict' },
    ),
    newStatus: varchar('new_status', { length: 40 })
      .notNull()
      .references(() => contactRequestStatuses.key, { onDelete: 'restrict' }),
    changedByProfileId: uuid('changed_by_profile_id').references(() => profiles.id, {
      onDelete: 'restrict',
    }),
    isLegacy: boolean('is_legacy').default(false).notNull(),
    changedAt: timestamp('changed_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    check(
      'contact_request_status_history_actor_check',
      sql`${table.isLegacy} = true or ${table.changedByProfileId} is not null`,
    ),
    index('contact_request_status_history_request_changed_idx').on(
      table.contactRequestId,
      table.changedAt,
    ),
    uniqueIndex('contact_request_status_history_legacy_request_unique')
      .on(table.contactRequestId)
      .where(sql`${table.isLegacy} = true`),
    check(
      'contact_request_status_history_transition_check',
      sql`${table.previousStatus} is null or ${table.previousStatus} <> ${table.newStatus}`,
    ),
  ],
).enableRLS();

export const contactRequestStatusesRelations = relations(contactRequestStatuses, ({ many }) => ({
  contactRequests: many(contactRequests),
  previousTransitions: many(contactRequestStatusHistory, { relationName: 'previousStatus' }),
  nextTransitions: many(contactRequestStatusHistory, { relationName: 'newStatus' }),
}));

export const contactRequestsRelations = relations(contactRequests, ({ many, one }) => ({
  service: one(services, {
    fields: [contactRequests.serviceId],
    references: [services.id],
  }),
  statusDefinition: one(contactRequestStatuses, {
    fields: [contactRequests.status],
    references: [contactRequestStatuses.key],
  }),
  notes: many(contactRequestNotes),
  statusHistory: many(contactRequestStatusHistory),
}));

export const contactRequestNotesRelations = relations(contactRequestNotes, ({ one }) => ({
  contactRequest: one(contactRequests, {
    fields: [contactRequestNotes.contactRequestId],
    references: [contactRequests.id],
  }),
  author: one(profiles, {
    fields: [contactRequestNotes.authorProfileId],
    references: [profiles.id],
  }),
}));

export const contactRequestStatusHistoryRelations = relations(
  contactRequestStatusHistory,
  ({ one }) => ({
    contactRequest: one(contactRequests, {
      fields: [contactRequestStatusHistory.contactRequestId],
      references: [contactRequests.id],
    }),
    previousStatus: one(contactRequestStatuses, {
      fields: [contactRequestStatusHistory.previousStatus],
      references: [contactRequestStatuses.key],
      relationName: 'previousStatus',
    }),
    newStatus: one(contactRequestStatuses, {
      fields: [contactRequestStatusHistory.newStatus],
      references: [contactRequestStatuses.key],
      relationName: 'newStatus',
    }),
    changedBy: one(profiles, {
      fields: [contactRequestStatusHistory.changedByProfileId],
      references: [profiles.id],
    }),
  }),
);

export const servicesContactRequestsRelations = relations(services, ({ many }) => ({
  contactRequests: many(contactRequests),
}));

export type ContactRequest = InferSelectModel<typeof contactRequests>;
export type NewContactRequest = InferInsertModel<typeof contactRequests>;
export type ContactRequestStatusDefinition = InferSelectModel<typeof contactRequestStatuses>;
export type NewContactRequestStatusDefinition = InferInsertModel<typeof contactRequestStatuses>;
export type ContactRequestNote = InferSelectModel<typeof contactRequestNotes>;
export type NewContactRequestNote = InferInsertModel<typeof contactRequestNotes>;
export type ContactRequestStatusHistoryEntry = InferSelectModel<typeof contactRequestStatusHistory>;
export type NewContactRequestStatusHistoryEntry = InferInsertModel<
  typeof contactRequestStatusHistory
>;
