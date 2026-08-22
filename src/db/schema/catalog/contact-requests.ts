import { relations, type InferInsertModel, type InferSelectModel } from 'drizzle-orm';
import { index, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

import { services } from './services';

export const contactRequests = pgTable(
  'contact_requests',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 160 }).notNull(),
    email: varchar('email', { length: 254 }).notNull(),
    phone: varchar('phone', { length: 80 }).notNull(),
    province: varchar('province', { length: 120 }).notNull(),
    serviceId: uuid('service_id')
      .notNull()
      .references(() => services.id, { onDelete: 'restrict' }),
    message: text('message').notNull(),
    status: varchar('status', { length: 40 }).default('new').notNull(),
    source: varchar('source', { length: 40 }).default('website').notNull(),
    utmSource: varchar('utm_source', { length: 160 }),
    utmMedium: varchar('utm_medium', { length: 160 }),
    utmCampaign: varchar('utm_campaign', { length: 180 }),
    utmContent: varchar('utm_content', { length: 180 }),
    utmTerm: varchar('utm_term', { length: 180 }),
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
  ],
).enableRLS();

export const contactRequestsRelations = relations(contactRequests, ({ one }) => ({
  service: one(services, {
    fields: [contactRequests.serviceId],
    references: [services.id],
  }),
}));

export const servicesContactRequestsRelations = relations(services, ({ many }) => ({
  contactRequests: many(contactRequests),
}));

export type ContactRequest = InferSelectModel<typeof contactRequests>;
export type NewContactRequest = InferInsertModel<typeof contactRequests>;
