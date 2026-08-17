import { relations, type InferInsertModel, type InferSelectModel } from 'drizzle-orm';
import { boolean, index, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { authors } from './authors';
import { books } from './books';

export const authorTestimonials = pgTable(
  'author_testimonials',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    authorId: uuid('author_id')
      .notNull()
      .references(() => authors.id, { onDelete: 'restrict' }),
    bookId: uuid('book_id').references(() => books.id, { onDelete: 'set null' }),
    quote: text('quote').notNull(),
    source: text('source'),
    rating: integer('rating'),
    isPublished: boolean('is_published').default(false).notNull(),
    isFeatured: boolean('is_featured').default(false).notNull(),
    sortOrder: integer('sort_order').default(0).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('author_testimonials_author_id_idx').on(table.authorId),
    index('author_testimonials_book_id_idx').on(table.bookId),
    index('author_testimonials_is_published_idx').on(table.isPublished),
    index('author_testimonials_is_published_is_featured_idx').on(
      table.isPublished,
      table.isFeatured,
    ),
    index('author_testimonials_sort_order_idx').on(table.sortOrder),
  ],
).enableRLS();

export const authorTestimonialsRelations = relations(authorTestimonials, ({ one }) => ({
  author: one(authors, {
    fields: [authorTestimonials.authorId],
    references: [authors.id],
  }),
  book: one(books, {
    fields: [authorTestimonials.bookId],
    references: [books.id],
  }),
}));

export type AuthorTestimonial = InferSelectModel<typeof authorTestimonials>;
export type NewAuthorTestimonial = InferInsertModel<typeof authorTestimonials>;
