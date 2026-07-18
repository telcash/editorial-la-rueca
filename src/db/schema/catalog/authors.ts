import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';
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

export const authors = pgTable(
  'authors',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 160 }).notNull(),
    slug: varchar('slug', { length: 180 }).notNull(),
    shortBio: varchar('short_bio', { length: 500 }),
    biography: text('biography'),
    photoUrl: text('photo_url'),
    websiteUrl: text('website_url'),
    instagramUrl: text('instagram_url'),
    facebookUrl: text('facebook_url'),
    country: varchar('country', { length: 100 }),
    isFeatured: boolean('is_featured').default(false).notNull(),
    isPublished: boolean('is_published').default(false).notNull(),
    isArchived: boolean('is_archived').default(false).notNull(),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
    sortOrder: integer('sort_order').default(0).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('authors_slug_unique_idx').on(table.slug),
    index('authors_is_published_idx').on(table.isPublished),
    index('authors_is_featured_is_published_idx').on(table.isFeatured, table.isPublished),
    index('authors_is_archived_idx').on(table.isArchived),
    index('authors_sort_order_idx').on(table.sortOrder),
  ],
).enableRLS();

export type Author = InferSelectModel<typeof authors>;
export type NewAuthor = InferInsertModel<typeof authors>;
