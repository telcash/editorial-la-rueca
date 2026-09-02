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

import { books } from './books';

export const salesChannels = pgTable(
  'sales_channels',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 120 }).notNull(),
    slug: varchar('slug', { length: 140 }).notNull(),
    websiteUrl: text('website_url'),
    isActive: boolean('is_active').default(true).notNull(),
    sortOrder: integer('sort_order').default(0).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('sales_channels_slug_unique_idx').on(table.slug),
    index('sales_channels_is_active_idx').on(table.isActive),
    index('sales_channels_sort_order_idx').on(table.sortOrder),
  ],
).enableRLS();

export const salesChannelMarkets = pgTable(
  'sales_channel_markets',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    salesChannelId: uuid('sales_channel_id')
      .notNull()
      .references(() => salesChannels.id, { onDelete: 'restrict' }),
    name: varchar('name', { length: 120 }).notNull(),
    countryCode: varchar('country_code', { length: 10 }),
    baseUrl: text('base_url').notNull(),
    productUrlTemplate: text('product_url_template'),
    isActive: boolean('is_active').default(true).notNull(),
    sortOrder: integer('sort_order').default(0).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('sales_channel_markets_sales_channel_id_idx').on(table.salesChannelId),
    index('sales_channel_markets_is_active_idx').on(table.isActive),
    index('sales_channel_markets_sort_order_idx').on(table.sortOrder),
  ],
).enableRLS();

export const bookSalesProducts = pgTable(
  'book_sales_products',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    bookId: uuid('book_id')
      .notNull()
      .references(() => books.id, { onDelete: 'restrict' }),
    salesChannelId: uuid('sales_channel_id')
      .notNull()
      .references(() => salesChannels.id, { onDelete: 'restrict' }),
    externalProductId: varchar('external_product_id', { length: 255 }),
    purchaseUrl: text('purchase_url'),
    status: varchar('status', { length: 40 }).default('available').notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    sortOrder: integer('sort_order').default(0).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    check(
      'book_sales_products_status_check',
      sql`${table.status} in ('available', 'unavailable', 'external_account', 'pending')`,
    ),
    uniqueIndex('book_sales_products_book_id_sales_channel_id_unique_idx').on(
      table.bookId,
      table.salesChannelId,
    ),
    index('book_sales_products_book_id_idx').on(table.bookId),
    index('book_sales_products_sales_channel_id_idx').on(table.salesChannelId),
    index('book_sales_products_status_idx').on(table.status),
    index('book_sales_products_is_active_idx').on(table.isActive),
    index('book_sales_products_sort_order_idx').on(table.sortOrder),
  ],
).enableRLS();

export const bookSalesMarketAvailability = pgTable(
  'book_sales_market_availability',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    bookSalesProductId: uuid('book_sales_product_id')
      .notNull()
      .references(() => bookSalesProducts.id, { onDelete: 'restrict' }),
    salesChannelMarketId: uuid('sales_channel_market_id')
      .notNull()
      .references(() => salesChannelMarkets.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('book_sales_market_availability_product_market_unique_idx').on(
      table.bookSalesProductId,
      table.salesChannelMarketId,
    ),
    index('book_sales_market_availability_product_id_idx').on(table.bookSalesProductId),
    index('book_sales_market_availability_market_id_idx').on(table.salesChannelMarketId),
  ],
).enableRLS();

export const salesChannelsRelations = relations(salesChannels, ({ many }) => ({
  markets: many(salesChannelMarkets),
  bookProducts: many(bookSalesProducts),
}));

export const booksSalesRelations = relations(books, ({ many }) => ({
  salesProducts: many(bookSalesProducts),
}));

export const salesChannelMarketsRelations = relations(salesChannelMarkets, ({ one, many }) => ({
  salesChannel: one(salesChannels, {
    fields: [salesChannelMarkets.salesChannelId],
    references: [salesChannels.id],
  }),
  marketAvailability: many(bookSalesMarketAvailability),
}));

export const bookSalesProductsRelations = relations(bookSalesProducts, ({ one, many }) => ({
  book: one(books, {
    fields: [bookSalesProducts.bookId],
    references: [books.id],
  }),
  salesChannel: one(salesChannels, {
    fields: [bookSalesProducts.salesChannelId],
    references: [salesChannels.id],
  }),
  marketAvailability: many(bookSalesMarketAvailability),
}));

export const bookSalesMarketAvailabilityRelations = relations(
  bookSalesMarketAvailability,
  ({ one }) => ({
    product: one(bookSalesProducts, {
      fields: [bookSalesMarketAvailability.bookSalesProductId],
      references: [bookSalesProducts.id],
    }),
    market: one(salesChannelMarkets, {
      fields: [bookSalesMarketAvailability.salesChannelMarketId],
      references: [salesChannelMarkets.id],
    }),
  }),
);

export type SalesChannel = InferSelectModel<typeof salesChannels>;
export type NewSalesChannel = InferInsertModel<typeof salesChannels>;
export type SalesChannelMarket = InferSelectModel<typeof salesChannelMarkets>;
export type NewSalesChannelMarket = InferInsertModel<typeof salesChannelMarkets>;
export type BookSalesProduct = InferSelectModel<typeof bookSalesProducts>;
export type NewBookSalesProduct = InferInsertModel<typeof bookSalesProducts>;
export type BookSalesMarketAvailability = InferSelectModel<typeof bookSalesMarketAvailability>;
export type NewBookSalesMarketAvailability = InferInsertModel<typeof bookSalesMarketAvailability>;
