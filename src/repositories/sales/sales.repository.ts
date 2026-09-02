import 'server-only';

import { and, asc, eq, isNull, notInArray, or, sql } from 'drizzle-orm';

import { db } from '@/db';
import {
  bookSalesMarketAvailability,
  bookSalesProducts,
  books,
  salesChannelMarkets,
  salesChannels,
  type BookSalesMarketAvailability,
  type BookSalesProduct,
  type NewBookSalesProduct,
  type NewSalesChannel,
  type NewSalesChannelMarket,
  type SalesChannel,
  type SalesChannelMarket,
} from '@/db/schema';
import type {
  BookSalesChannelPersistenceInput,
  BookSalesConfigurationPersistenceInput,
  BookSalesPublicRow,
  PublicSalesChannelMarketRow,
} from '@/services/sales/sales.types';
import type { BookSalesProductStatus } from '@/services/sales/sales-product-status';
import type { SalesSeedApplyResult, SalesSeedPlan } from '@/features/sales-seed/types';

type SalesSeedPlanShape = Pick<SalesSeedPlan, 'channels' | 'markets'>;

export async function findChannels(): Promise<SalesChannel[]> {
  return db
    .select()
    .from(salesChannels)
    .orderBy(asc(salesChannels.sortOrder), asc(salesChannels.name), asc(salesChannels.id));
}

export async function findMarketsByChannelId(
  salesChannelId: string,
): Promise<SalesChannelMarket[]> {
  return db
    .select()
    .from(salesChannelMarkets)
    .where(eq(salesChannelMarkets.salesChannelId, salesChannelId))
    .orderBy(
      asc(salesChannelMarkets.sortOrder),
      asc(salesChannelMarkets.name),
      asc(salesChannelMarkets.id),
    );
}

export async function findChannelBySlug(slug: string): Promise<SalesChannel | null> {
  const [channel] = await db
    .select()
    .from(salesChannels)
    .where(eq(salesChannels.slug, slug))
    .limit(1);

  return channel ?? null;
}

export async function findPublicMarketsByChannelSlug(
  slug: string,
): Promise<PublicSalesChannelMarketRow[]> {
  return db
    .select({
      id: salesChannelMarkets.id,
      name: salesChannelMarkets.name,
      countryCode: salesChannelMarkets.countryCode,
      baseUrl: salesChannelMarkets.baseUrl,
      sortOrder: salesChannelMarkets.sortOrder,
      channelIsActive: salesChannels.isActive,
      marketIsActive: salesChannelMarkets.isActive,
    })
    .from(salesChannelMarkets)
    .innerJoin(salesChannels, eq(salesChannels.id, salesChannelMarkets.salesChannelId))
    .where(
      and(
        eq(salesChannels.slug, slug),
        eq(salesChannels.isActive, true),
        eq(salesChannelMarkets.isActive, true),
      ),
    )
    .orderBy(
      asc(salesChannelMarkets.sortOrder),
      asc(salesChannelMarkets.name),
      asc(salesChannelMarkets.id),
    );
}

async function applyChannel(
  transaction: Parameters<Parameters<typeof db.transaction>[0]>[0],
  plan: SalesSeedPlanShape['channels'][number],
): Promise<SalesChannel> {
  const values: NewSalesChannel = {
    name: plan.expected.name,
    slug: plan.expected.slug,
    websiteUrl: plan.expected.websiteUrl,
    isActive: plan.expected.isActive,
    sortOrder: plan.expected.sortOrder,
  };

  if (plan.operation === 'create') {
    const [channel] = await transaction.insert(salesChannels).values(values).returning();

    if (!channel) {
      throw new Error(`Sales channel "${plan.slug}" creation did not return a record.`);
    }

    return channel;
  }

  if (plan.operation === 'update' && plan.existing) {
    const [channel] = await transaction
      .update(salesChannels)
      .set({
        name: values.name,
        websiteUrl: values.websiteUrl,
        isActive: values.isActive,
        sortOrder: values.sortOrder,
        updatedAt: new Date(),
      })
      .where(eq(salesChannels.id, plan.existing.id))
      .returning();

    if (!channel) {
      throw new Error(`Sales channel "${plan.slug}" update did not return a record.`);
    }

    return channel;
  }

  if (plan.existing) {
    return plan.existing;
  }

  throw new Error(`Sales channel "${plan.slug}" cannot be applied.`);
}

async function applyMarket(
  transaction: Parameters<Parameters<typeof db.transaction>[0]>[0],
  salesChannelId: string,
  plan: SalesSeedPlanShape['markets'][number],
): Promise<SalesChannelMarket> {
  const values: NewSalesChannelMarket = {
    salesChannelId,
    name: plan.expected.name,
    countryCode: plan.expected.countryCode,
    baseUrl: plan.expected.baseUrl,
    productUrlTemplate: plan.expected.productUrlTemplate,
    isActive: plan.expected.isActive,
    sortOrder: plan.expected.sortOrder,
  };

  if (plan.operation === 'create') {
    const [market] = await transaction.insert(salesChannelMarkets).values(values).returning();

    if (!market) {
      throw new Error(`Sales market "${plan.channelSlug}/${plan.countryCode}" creation failed.`);
    }

    return market;
  }

  if (plan.operation === 'update' && plan.existing) {
    const [market] = await transaction
      .update(salesChannelMarkets)
      .set({
        name: values.name,
        countryCode: values.countryCode,
        baseUrl: values.baseUrl,
        productUrlTemplate: values.productUrlTemplate,
        isActive: values.isActive,
        sortOrder: values.sortOrder,
        updatedAt: new Date(),
      })
      .where(eq(salesChannelMarkets.id, plan.existing.id))
      .returning();

    if (!market) {
      throw new Error(`Sales market "${plan.channelSlug}/${plan.countryCode}" update failed.`);
    }

    return market;
  }

  if (plan.existing) {
    return plan.existing;
  }

  throw new Error(`Sales market "${plan.channelSlug}/${plan.countryCode}" cannot be applied.`);
}

export async function applyInitialSalesConfiguration(
  plan: SalesSeedPlanShape,
): Promise<SalesSeedApplyResult> {
  if (
    plan.channels.some((item) => item.operation === 'conflict') ||
    plan.markets.some((item) => item.operation === 'conflict')
  ) {
    throw new Error('No se puede aplicar sales seed con conflictos pendientes.');
  }

  return db.transaction(async (transaction) => {
    const channelsBySlug = new Map<string, SalesChannel>();

    const result: SalesSeedApplyResult = {
      channelsCreated: 0,
      channelsUpdated: 0,
      channelsUnchanged: 0,
      marketsCreated: 0,
      marketsUpdated: 0,
      marketsUnchanged: 0,
    };

    for (const channelPlan of plan.channels) {
      const channel = await applyChannel(transaction, channelPlan);

      channelsBySlug.set(channelPlan.slug, channel);

      if (channelPlan.operation === 'create') {
        result.channelsCreated += 1;
      } else if (channelPlan.operation === 'update') {
        result.channelsUpdated += 1;
      } else {
        result.channelsUnchanged += 1;
      }
    }

    for (const marketPlan of plan.markets) {
      const channel = channelsBySlug.get(marketPlan.channelSlug);

      if (!channel) {
        throw new Error(`No se encontró el canal "${marketPlan.channelSlug}" para crear markets.`);
      }

      await applyMarket(transaction, channel.id, marketPlan);

      if (marketPlan.operation === 'create') {
        result.marketsCreated += 1;
      } else if (marketPlan.operation === 'update') {
        result.marketsUpdated += 1;
      } else {
        result.marketsUnchanged += 1;
      }
    }

    return result;
  });
}

export async function findProductsByBookId(bookId: string): Promise<BookSalesProduct[]> {
  return db
    .select()
    .from(bookSalesProducts)
    .where(eq(bookSalesProducts.bookId, bookId))
    .orderBy(
      asc(bookSalesProducts.sortOrder),
      asc(bookSalesProducts.salesChannelId),
      asc(bookSalesProducts.id),
    );
}

export async function findAvailabilityByProductId(
  bookSalesProductId: string,
): Promise<BookSalesMarketAvailability[]> {
  return db
    .select()
    .from(bookSalesMarketAvailability)
    .where(eq(bookSalesMarketAvailability.bookSalesProductId, bookSalesProductId))
    .orderBy(
      asc(bookSalesMarketAvailability.bookSalesProductId),
      asc(bookSalesMarketAvailability.salesChannelMarketId),
    );
}

type SalesTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function persistBookSalesChannel(
  transaction: SalesTransaction,
  bookId: string,
  configuration: BookSalesChannelPersistenceInput,
): Promise<BookSalesProduct | null> {
  if (!configuration.enabled) {
    await transaction
      .update(bookSalesProducts)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(bookSalesProducts.bookId, bookId),
          eq(bookSalesProducts.salesChannelId, configuration.channelId),
        ),
      );

    return null;
  }

  const values: NewBookSalesProduct = {
    bookId,
    salesChannelId: configuration.channelId,
    externalProductId: configuration.externalProductId,
    purchaseUrl: configuration.purchaseUrl,
    status: configuration.status,
    isActive: true,
  };

  const [product] = await transaction
    .insert(bookSalesProducts)
    .values(values)
    .onConflictDoUpdate({
      target: [bookSalesProducts.bookId, bookSalesProducts.salesChannelId],
      set: {
        externalProductId: configuration.externalProductId,
        purchaseUrl: configuration.purchaseUrl,
        status: configuration.status,
        isActive: true,
        updatedAt: new Date(),
      },
    })
    .returning();

  if (!product) {
    throw new Error('No se pudo guardar el producto comercial del libro.');
  }

  return product;
}

async function syncBookSalesMarkets(
  transaction: SalesTransaction,
  productId: string,
  marketIds: string[],
): Promise<void> {
  const availabilityForProduct = eq(bookSalesMarketAvailability.bookSalesProductId, productId);

  if (marketIds.length === 0) {
    await transaction.delete(bookSalesMarketAvailability).where(availabilityForProduct);

    return;
  }

  await transaction
    .delete(bookSalesMarketAvailability)
    .where(
      and(
        availabilityForProduct,
        notInArray(bookSalesMarketAvailability.salesChannelMarketId, marketIds),
      ),
    );

  await transaction
    .insert(bookSalesMarketAvailability)
    .values(
      marketIds.map((marketId) => ({
        bookSalesProductId: productId,
        salesChannelMarketId: marketId,
      })),
    )
    .onConflictDoNothing();
}

export async function saveBookSalesConfiguration(
  input: BookSalesConfigurationPersistenceInput,
): Promise<void> {
  await db.transaction(async (transaction) => {
    const quaresProduct = await persistBookSalesChannel(transaction, input.bookId, input.quares);

    if (quaresProduct) {
      await syncBookSalesMarkets(transaction, quaresProduct.id, input.quares.marketIds);
    }

    await persistBookSalesChannel(transaction, input.bookId, input.amazon);
  });
}

export async function findPublicPurchaseRowsByBookId(
  bookId: string,
): Promise<BookSalesPublicRow[]> {
  return db
    .select({
      productId: bookSalesProducts.id,
      productExternalProductId: bookSalesProducts.externalProductId,
      productPurchaseUrl: bookSalesProducts.purchaseUrl,
      productStatus: sql<BookSalesProductStatus>`${bookSalesProducts.status}`,
      productIsActive: bookSalesProducts.isActive,
      productSortOrder: bookSalesProducts.sortOrder,
      channelId: salesChannels.id,
      channelSlug: salesChannels.slug,
      channelName: salesChannels.name,
      channelIsActive: salesChannels.isActive,
      channelSortOrder: salesChannels.sortOrder,
      marketId: salesChannelMarkets.id,
      marketName: salesChannelMarkets.name,
      marketCountryCode: salesChannelMarkets.countryCode,
      marketProductUrlTemplate: salesChannelMarkets.productUrlTemplate,
      marketIsActive: salesChannelMarkets.isActive,
      marketSortOrder: salesChannelMarkets.sortOrder,
    })
    .from(bookSalesProducts)
    .innerJoin(books, eq(books.id, bookSalesProducts.bookId))
    .innerJoin(salesChannels, eq(salesChannels.id, bookSalesProducts.salesChannelId))
    .leftJoin(
      bookSalesMarketAvailability,
      eq(bookSalesMarketAvailability.bookSalesProductId, bookSalesProducts.id),
    )
    .leftJoin(
      salesChannelMarkets,
      eq(salesChannelMarkets.id, bookSalesMarketAvailability.salesChannelMarketId),
    )
    .where(
      and(
        eq(bookSalesProducts.bookId, bookId),
        eq(books.isPublished, true),
        eq(books.isArchived, false),
        eq(salesChannels.isActive, true),
        eq(bookSalesProducts.isActive, true),
        eq(bookSalesProducts.status, 'available'),
        or(isNull(salesChannelMarkets.id), eq(salesChannelMarkets.isActive, true)),
      ),
    )
    .orderBy(
      asc(salesChannels.sortOrder),
      asc(salesChannels.name),
      asc(salesChannels.id),
      asc(bookSalesProducts.sortOrder),
      asc(bookSalesProducts.id),
      asc(salesChannelMarkets.sortOrder),
      asc(salesChannelMarkets.name),
      asc(salesChannelMarkets.id),
    );
}

export async function findProductsByChannelId(salesChannelId: string): Promise<BookSalesProduct[]> {
  return db
    .select()
    .from(bookSalesProducts)
    .where(eq(bookSalesProducts.salesChannelId, salesChannelId))
    .orderBy(asc(bookSalesProducts.bookId), asc(bookSalesProducts.id));
}

export interface QuaresImportPersistenceRow {
  bookId: string;
  salesChannelId: string;
  externalProductId: string;
  marketIds: string[];
}

export async function applyQuaresImportRows(rows: QuaresImportPersistenceRow[]): Promise<number> {
  return db.transaction(async (transaction) => {
    let applied = 0;

    for (const row of rows) {
      /*
       * Protect external identity at apply time.
       */
      const [externalOwner] = await transaction
        .select()
        .from(bookSalesProducts)
        .where(
          and(
            eq(bookSalesProducts.salesChannelId, row.salesChannelId),
            eq(bookSalesProducts.externalProductId, row.externalProductId),
          ),
        )
        .limit(1);

      if (externalOwner && externalOwner.bookId !== row.bookId) {
        throw new Error(`Quares ID ${row.externalProductId} already belongs to another book.`);
      }

      const [existing] = await transaction
        .select()
        .from(bookSalesProducts)
        .where(
          and(
            eq(bookSalesProducts.bookId, row.bookId),
            eq(bookSalesProducts.salesChannelId, row.salesChannelId),
          ),
        )
        .limit(1);

      let product: BookSalesProduct;

      if (existing) {
        if (!existing.isActive || existing.status !== 'available') {
          throw new Error(
            `Existing Quares product for book ${row.bookId} is inactive or non-available.`,
          );
        }

        const existingExternalId = existing.externalProductId?.trim();

        if (existingExternalId && existingExternalId !== row.externalProductId) {
          throw new Error(
            `Existing Quares ID ${existingExternalId} for book ${row.bookId} conflicts with ${row.externalProductId}.`,
          );
        }

        const [updated] = await transaction
          .update(bookSalesProducts)
          .set({
            externalProductId: row.externalProductId,
            updatedAt: new Date(),
          })
          .where(eq(bookSalesProducts.id, existing.id))
          .returning();

        if (!updated) {
          throw new Error(`Failed updating Quares product for book ${row.bookId}.`);
        }

        product = updated;
      } else {
        const [created] = await transaction
          .insert(bookSalesProducts)
          .values({
            bookId: row.bookId,
            salesChannelId: row.salesChannelId,
            externalProductId: row.externalProductId,
            purchaseUrl: null,
            status: 'available',
            isActive: true,
          })
          .returning();

        if (!created) {
          throw new Error(`Failed creating Quares product for book ${row.bookId}.`);
        }

        product = created;
      }

      await syncBookSalesMarkets(transaction, product.id, row.marketIds);

      applied += 1;
    }

    return applied;
  });
}

export interface AmazonImportPersistenceRow {
  bookId: string;
  salesChannelId: string;
  externalProductId: string;
  purchaseUrl: string;
}

export async function applyAmazonImportRows(rows: AmazonImportPersistenceRow[]): Promise<number> {
  return db.transaction(async (transaction) => {
    let applied = 0;

    for (const row of rows) {
      const externalProductId = row.externalProductId.trim().toUpperCase();

      const purchaseUrl = row.purchaseUrl.trim();

      if (!externalProductId) {
        throw new Error(`Amazon product for book ${row.bookId} has an empty ASIN.`);
      }

      if (!purchaseUrl) {
        throw new Error(`Amazon product for book ${row.bookId} has an empty purchase URL.`);
      }

      /*
       * Protect Amazon external identity at apply time.
       *
       * One ASIN must never be silently assigned to another
       * internal book.
       */
      const [externalOwner] = await transaction
        .select()
        .from(bookSalesProducts)
        .where(
          and(
            eq(bookSalesProducts.salesChannelId, row.salesChannelId),
            eq(bookSalesProducts.externalProductId, externalProductId),
          ),
        )
        .limit(1);

      if (externalOwner && externalOwner.bookId !== row.bookId) {
        throw new Error(`Amazon ASIN ${externalProductId} already belongs to another book.`);
      }

      const [existing] = await transaction
        .select()
        .from(bookSalesProducts)
        .where(
          and(
            eq(bookSalesProducts.bookId, row.bookId),
            eq(bookSalesProducts.salesChannelId, row.salesChannelId),
          ),
        )
        .limit(1);

      if (existing) {
        if (!existing.isActive || existing.status !== 'available') {
          throw new Error(
            `Existing Amazon product for book ${row.bookId} is inactive or non-available.`,
          );
        }

        const existingExternalId = existing.externalProductId?.trim().toUpperCase() || null;

        const existingPurchaseUrl = existing.purchaseUrl?.trim() || null;

        if (existingExternalId && existingExternalId !== externalProductId) {
          throw new Error(
            `Existing Amazon ASIN ${existingExternalId} for book ${row.bookId} conflicts with ${externalProductId}.`,
          );
        }

        if (existingPurchaseUrl && existingPurchaseUrl !== purchaseUrl) {
          throw new Error(
            `Existing Amazon purchase URL for book ${row.bookId} conflicts with source URL.`,
          );
        }

        const [updated] = await transaction
          .update(bookSalesProducts)
          .set({
            externalProductId,
            purchaseUrl,
            updatedAt: new Date(),
          })
          .where(eq(bookSalesProducts.id, existing.id))
          .returning();

        if (!updated) {
          throw new Error(`Failed updating Amazon product for book ${row.bookId}.`);
        }
      } else {
        const [created] = await transaction
          .insert(bookSalesProducts)
          .values({
            bookId: row.bookId,
            salesChannelId: row.salesChannelId,
            externalProductId,
            purchaseUrl,
            status: 'available',
            isActive: true,
          })
          .returning();

        if (!created) {
          throw new Error(`Failed creating Amazon product for book ${row.bookId}.`);
        }
      }

      applied += 1;
    }

    return applied;
  });
}
