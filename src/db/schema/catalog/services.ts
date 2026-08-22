import { type InferInsertModel, type InferSelectModel } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

export const services = pgTable(
  'services',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 160 }).notNull(),
    slug: varchar('slug', { length: 180 }).notNull(),
    shortDescription: varchar('short_description', { length: 500 }),
    description: text('description'),
    isPublished: boolean('is_published').default(false).notNull(),
    isFeatured: boolean('is_featured').default(false).notNull(),
    isArchived: boolean('is_archived').default(false).notNull(),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
    sortOrder: integer('sort_order').default(0).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('services_slug_unique_idx').on(table.slug),
    index('services_is_published_idx').on(table.isPublished),
    index('services_is_featured_is_published_idx').on(table.isFeatured, table.isPublished),
    index('services_is_archived_idx').on(table.isArchived),
    index('services_sort_order_idx').on(table.sortOrder),
  ],
).enableRLS();

export type EditorialService = InferSelectModel<typeof services>;
export type NewEditorialService = InferInsertModel<typeof services>;
