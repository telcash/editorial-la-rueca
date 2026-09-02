import { z } from 'zod';

import { updateBookSalesConfigurationSchema } from '@/schemas/sales/sales.schema';
import { isValidHttpUrl, resolvePurchaseUrl } from './purchase-url-resolver';
import {
  SalesChannelNotFoundError,
  SalesMarketChannelMismatchError,
  SalesMarketInactiveError,
  SalesMarketNotFoundError,
} from './sales.errors';
import {
  bookSalesProductStatusValues,
  isPurchasableBookSalesProductStatus,
} from './sales-product-status';
import type {
  BookSalesPublicRow,
  BookSalesAdminChannelConfiguration,
  BookSalesAdminConfiguration,
  ManagedSalesChannelSlug,
  PublicPurchaseChannel,
  PublicPurchaseOption,
  PublicSalesChannelMarket,
  PublicSalesChannelMarketRow,
  SalesRepository,
} from './sales.types';

const uuidSchema = z.string().uuid('El id debe ser un UUID valido.');
const QUARES_CHANNEL_SLUG = 'quares';
const AMAZON_CHANNEL_SLUG = 'amazon';
const channelSlugSchema = z
  .string()
  .trim()
  .min(1)
  .max(140)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

function assertSameSalesChannel(productSalesChannelId: string, marketSalesChannelId: string) {
  if (productSalesChannelId !== marketSalesChannelId) {
    throw new SalesMarketChannelMismatchError();
  }
}

function toPurchaseOption(row: BookSalesPublicRow): PublicPurchaseOption | null {
  if (
    !row.channelIsActive ||
    !row.productIsActive ||
    !isPurchasableBookSalesProductStatus(row.productStatus) ||
    row.marketIsActive === false
  ) {
    return null;
  }

  const url = resolvePurchaseUrl({
    purchaseUrl: row.productPurchaseUrl,
    externalProductId: row.productExternalProductId,
    productUrlTemplate: row.marketProductUrlTemplate,
  });

  if (!url) {
    return null;
  }

  return {
    marketName: row.marketName,
    countryCode: row.marketCountryCode,
    url,
  };
}

export function buildPublicPurchaseOptions(rows: BookSalesPublicRow[]): PublicPurchaseChannel[] {
  const channels = new Map<string, PublicPurchaseChannel>();

  for (const row of rows) {
    const option = toPurchaseOption(row);

    if (!option) {
      continue;
    }

    const existingChannel = channels.get(row.channelId);

    if (existingChannel) {
      existingChannel.options.push(option);
      continue;
    }

    channels.set(row.channelId, {
      channel: {
        slug: row.channelSlug,
        name: row.channelName,
      },
      options: [option],
    });
  }

  return Array.from(channels.values()).filter((channel) => channel.options.length > 0);
}

export function buildPublicChannelMarkets(
  rows: PublicSalesChannelMarketRow[],
): PublicSalesChannelMarket[] {
  return rows
    .filter(
      (row) => row.channelIsActive && row.marketIsActive && isValidHttpUrl(row.baseUrl.trim()),
    )
    .sort(
      (left, right) =>
        left.sortOrder - right.sortOrder ||
        left.name.localeCompare(right.name, 'es') ||
        left.id.localeCompare(right.id),
    )
    .map((row) => ({
      name: row.name,
      countryCode: row.countryCode,
      baseUrl: row.baseUrl.trim(),
      sortOrder: row.sortOrder,
    }));
}

function buildAdminChannelConfiguration(
  slug: ManagedSalesChannelSlug,
  channelName: string,
  channelIsActive: boolean,
  product: Awaited<ReturnType<SalesRepository['findProductsByBookId']>>[number] | undefined,
  marketIds: string[] = [],
): BookSalesAdminChannelConfiguration {
  return {
    channel: {
      slug,
      name: channelName,
      isActive: channelIsActive,
    },
    enabled: product?.isActive ?? false,
    status: product ? z.enum(bookSalesProductStatusValues).parse(product.status) : 'available',
    externalProductId: product?.externalProductId ?? '',
    purchaseUrl: product?.purchaseUrl ?? '',
    marketIds,
  };
}

function requireChannel<T extends { slug: string }>(channel: T | null, slug: string): T {
  if (!channel) {
    throw new SalesChannelNotFoundError(slug);
  }

  return channel;
}

export function createSalesService(repository: SalesRepository) {
  return {
    async listSalesChannels() {
      return repository.findChannels();
    },

    async listSalesChannelMarkets(salesChannelId: string) {
      const validSalesChannelId = uuidSchema.parse(salesChannelId);

      return repository.findMarketsByChannelId(validSalesChannelId);
    },

    async listBookSalesProducts(bookId: string) {
      const validBookId = uuidSchema.parse(bookId);

      return repository.findProductsByBookId(validBookId);
    },

    async listBookSalesMarketAvailability(bookSalesProductId: string) {
      const validBookSalesProductId = uuidSchema.parse(bookSalesProductId);

      return repository.findAvailabilityByProductId(validBookSalesProductId);
    },

    assertMarketBelongsToProductChannel: assertSameSalesChannel,

    async getPublicPurchaseOptionsByBookId(bookId: string) {
      const validBookId = uuidSchema.parse(bookId);
      const rows = await repository.findPublicPurchaseRowsByBookId(validBookId);

      return buildPublicPurchaseOptions(rows);
    },

    async getPublicChannelMarkets(slug: string): Promise<PublicSalesChannelMarket[]> {
      const validSlug = channelSlugSchema.parse(slug);
      const rows = await repository.findPublicMarketsByChannelSlug(validSlug);

      return buildPublicChannelMarkets(rows);
    },

    async getBookSalesAdminConfiguration(bookId: string): Promise<BookSalesAdminConfiguration> {
      const validBookId = uuidSchema.parse(bookId);
      const [quaresChannelResult, amazonChannelResult, products] = await Promise.all([
        repository.findChannelBySlug(QUARES_CHANNEL_SLUG),
        repository.findChannelBySlug(AMAZON_CHANNEL_SLUG),
        repository.findProductsByBookId(validBookId),
      ]);
      const quaresChannel = requireChannel(quaresChannelResult, QUARES_CHANNEL_SLUG);
      const amazonChannel = requireChannel(amazonChannelResult, AMAZON_CHANNEL_SLUG);
      const quaresProduct = products.find((product) => product.salesChannelId === quaresChannel.id);
      const amazonProduct = products.find((product) => product.salesChannelId === amazonChannel.id);
      const [markets, availability] = await Promise.all([
        repository.findMarketsByChannelId(quaresChannel.id),
        quaresProduct
          ? repository.findAvailabilityByProductId(quaresProduct.id)
          : Promise.resolve([]),
      ]);
      const selectedMarketIds = availability.map((item) => item.salesChannelMarketId);

      return {
        quares: {
          ...buildAdminChannelConfiguration(
            QUARES_CHANNEL_SLUG,
            quaresChannel.name,
            quaresChannel.isActive,
            quaresProduct,
            selectedMarketIds,
          ),
          markets: markets.map((market) => ({
            id: market.id,
            name: market.name,
            countryCode: market.countryCode,
            isActive: market.isActive,
            sortOrder: market.sortOrder,
          })),
        },
        amazon: buildAdminChannelConfiguration(
          AMAZON_CHANNEL_SLUG,
          amazonChannel.name,
          amazonChannel.isActive,
          amazonProduct,
        ),
      };
    },

    async updateBookSalesConfiguration(bookId: string, input: unknown): Promise<void> {
      const validBookId = uuidSchema.parse(bookId);
      const configuration = updateBookSalesConfigurationSchema.parse(input);
      const [quaresChannelResult, amazonChannelResult, products] = await Promise.all([
        repository.findChannelBySlug(QUARES_CHANNEL_SLUG),
        repository.findChannelBySlug(AMAZON_CHANNEL_SLUG),
        repository.findProductsByBookId(validBookId),
      ]);
      const quaresChannel = requireChannel(quaresChannelResult, QUARES_CHANNEL_SLUG);
      const amazonChannel = requireChannel(amazonChannelResult, AMAZON_CHANNEL_SLUG);
      const quaresMarkets = await repository.findMarketsByChannelId(quaresChannel.id);
      const quaresProduct = products.find((product) => product.salesChannelId === quaresChannel.id);
      const existingMarketIds = new Set(
        quaresProduct
          ? (await repository.findAvailabilityByProductId(quaresProduct.id)).map(
              (item) => item.salesChannelMarketId,
            )
          : [],
      );
      const marketsById = new Map(quaresMarkets.map((market) => [market.id, market]));

      for (const marketId of configuration.quares.marketIds) {
        const market = marketsById.get(marketId);

        if (!market) {
          throw new SalesMarketNotFoundError();
        }

        assertSameSalesChannel(quaresChannel.id, market.salesChannelId);

        if (!market.isActive && !existingMarketIds.has(marketId)) {
          throw new SalesMarketInactiveError();
        }
      }

      await repository.saveBookSalesConfiguration({
        bookId: validBookId,
        quares: {
          channelId: quaresChannel.id,
          enabled: configuration.quares.enabled,
          status: configuration.quares.status,
          externalProductId: configuration.quares.externalProductId ?? null,
          purchaseUrl: null,
          marketIds: configuration.quares.marketIds,
        },
        amazon: {
          channelId: amazonChannel.id,
          enabled: configuration.amazon.enabled,
          status: configuration.amazon.status,
          externalProductId: null,
          purchaseUrl: configuration.amazon.purchaseUrl ?? null,
          marketIds: [],
        },
      });
    },
  };
}
