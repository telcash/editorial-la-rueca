import { relations, sql, type InferInsertModel, type InferSelectModel } from 'drizzle-orm';
import {
  boolean,
  date,
  index,
  integer,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { authors } from './authors';

export const books = pgTable(
  'books',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    title: varchar('title', { length: 220 }).notNull(),
    subtitle: varchar('subtitle', { length: 220 }),
    slug: varchar('slug', { length: 220 }).notNull(),
    description: text('description'),
    excerpt: text('excerpt'),
    coverUrl: text('cover_url'),
    originalPublicationDate: date('original_publication_date'),
    language: varchar('language', { length: 3 }),
    isFeatured: boolean('is_featured').default(false).notNull(),
    isPublished: boolean('is_published').default(false).notNull(),
    isArchived: boolean('is_archived').default(false).notNull(),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
    sortOrder: integer('sort_order').default(0).notNull(),
    metaTitle: varchar('meta_title', { length: 160 }),
    metaDescription: text('meta_description'),
    canonicalUrl: text('canonical_url'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('books_slug_unique_idx').on(table.slug),
    index('books_is_published_idx').on(table.isPublished),
    index('books_is_published_is_featured_idx').on(table.isPublished, table.isFeatured),
    index('books_is_archived_idx').on(table.isArchived),
    index('books_is_published_is_archived_idx').on(table.isPublished, table.isArchived),
    index('books_original_publication_date_idx').on(table.originalPublicationDate),
    index('books_sort_order_idx').on(table.sortOrder),
    index('books_created_at_idx').on(table.createdAt),
  ],
).enableRLS();

export const bookAuthors = pgTable(
  'book_authors',
  {
    bookId: uuid('book_id')
      .notNull()
      .references(() => books.id, { onDelete: 'cascade' }),
    authorId: uuid('author_id')
      .notNull()
      .references(() => authors.id, { onDelete: 'restrict' }),
    sortOrder: integer('sort_order').default(0).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.bookId, table.authorId], name: 'book_authors_pk' }),
    index('book_authors_book_id_idx').on(table.bookId),
    index('book_authors_author_id_idx').on(table.authorId),
    index('book_authors_book_id_sort_order_idx').on(table.bookId, table.sortOrder),
  ],
).enableRLS();

export const bookEditions = pgTable(
  'book_editions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    bookId: uuid('book_id')
      .notNull()
      .references(() => books.id, { onDelete: 'cascade' }),
    format: varchar('format', { length: 40 }).notNull(),
    editionLabel: varchar('edition_label', { length: 120 }),
    publicationDate: date('publication_date'),
    isbn10: varchar('isbn10', { length: 10 }),
    isbn13: varchar('isbn13', { length: 13 }),
    price: numeric('price', { precision: 10, scale: 2 }),
    currency: varchar('currency', { length: 3 }).default('EUR').notNull(),
    pages: integer('pages'),
    isAvailable: boolean('is_available').default(true).notNull(),
    isFeatured: boolean('is_featured').default(false).notNull(),
    sortOrder: integer('sort_order').default(0).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('book_editions_book_id_idx').on(table.bookId),
    index('book_editions_book_id_sort_order_idx').on(table.bookId, table.sortOrder),
    index('book_editions_format_idx').on(table.format),
    index('book_editions_publication_date_idx').on(table.publicationDate),
    index('book_editions_is_available_idx').on(table.isAvailable),
    index('book_editions_book_id_is_available_idx').on(table.bookId, table.isAvailable),
    uniqueIndex('book_editions_isbn10_unique_idx')
      .on(table.isbn10)
      .where(sql`${table.isbn10} is not null`),
    uniqueIndex('book_editions_isbn13_unique_idx')
      .on(table.isbn13)
      .where(sql`${table.isbn13} is not null`),
  ],
).enableRLS();

export const booksRelations = relations(books, ({ many }) => ({
  bookAuthors: many(bookAuthors),
  editions: many(bookEditions),
}));

export const bookAuthorsRelations = relations(bookAuthors, ({ one }) => ({
  book: one(books, {
    fields: [bookAuthors.bookId],
    references: [books.id],
  }),
  author: one(authors, {
    fields: [bookAuthors.authorId],
    references: [authors.id],
  }),
}));

export const bookEditionsRelations = relations(bookEditions, ({ one }) => ({
  book: one(books, {
    fields: [bookEditions.bookId],
    references: [books.id],
  }),
}));

export const authorsRelations = relations(authors, ({ many }) => ({
  bookAuthors: many(bookAuthors),
}));

export type Book = InferSelectModel<typeof books>;
export type NewBook = InferInsertModel<typeof books>;
export type BookAuthor = InferSelectModel<typeof bookAuthors>;
export type NewBookAuthor = InferInsertModel<typeof bookAuthors>;
export type BookEdition = InferSelectModel<typeof bookEditions>;
export type NewBookEdition = InferInsertModel<typeof bookEditions>;
