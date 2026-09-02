import type {
  BookSalesMarketAvailability,
  BookSalesProduct,
  SalesChannel,
  SalesChannelMarket,
} from '@/db/schema';
import type { BookSalesProductStatus } from './sales-product-status';

export type ManagedSalesChannelSlug = 'quares' | 'amazon';

export interface BookSalesChannelPersistenceInput {
  channelId: string;
  enabled: boolean;
  status: BookSalesProductStatus;
  externalProductId: string | null;
  purchaseUrl: string | null;
  marketIds: string[];
}

export interface BookSalesConfigurationPersistenceInput {
  bookId: string;
  quares: BookSalesChannelPersistenceInput;
  amazon: BookSalesChannelPersistenceInput;
}

export interface BookSalesAdminMarket {
  id: string;
  name: string;
  countryCode: string | null;
  isActive: boolean;
  sortOrder: number;
}

export interface BookSalesAdminChannelConfiguration {
  channel: {
    slug: ManagedSalesChannelSlug;
    name: string;
    isActive: boolean;
  };
  enabled: boolean;
  status: BookSalesProductStatus;
  externalProductId: string;
  purchaseUrl: string;
  marketIds: string[];
}

export interface BookSalesAdminConfiguration {
  quares: BookSalesAdminChannelConfiguration & {
    markets: BookSalesAdminMarket[];
  };
  amazon: BookSalesAdminChannelConfiguration;
}

export interface PublicPurchaseOption {
  marketName: string | null;
  countryCode: string | null;
  url: string;
}

export interface PublicPurchaseChannel {
  channel: {
    slug: string;
    name: string;
  };
  options: PublicPurchaseOption[];
}

export interface PublicSalesChannelMarketRow {
  id: string;
  name: string;
  countryCode: string | null;
  baseUrl: string;
  sortOrder: number;
  channelIsActive: boolean;
  marketIsActive: boolean;
}

export interface PublicSalesChannelMarket {
  name: string;
  countryCode: string | null;
  baseUrl: string;
  sortOrder: number;
}

export interface BookSalesPublicRow {
  productId: string;
  productExternalProductId: string | null;
  productPurchaseUrl: string | null;
  productStatus: BookSalesProductStatus;
  productIsActive: boolean;
  productSortOrder: number;
  channelId: string;
  channelSlug: string;
  channelName: string;
  channelIsActive: boolean;
  channelSortOrder: number;
  marketId: string | null;
  marketName: string | null;
  marketCountryCode: string | null;
  marketProductUrlTemplate: string | null;
  marketIsActive: boolean | null;
  marketSortOrder: number | null;
}

export interface SalesRepository {
  findChannels(): Promise<SalesChannel[]>;
  findChannelBySlug(slug: string): Promise<SalesChannel | null>;
  findMarketsByChannelId(salesChannelId: string): Promise<SalesChannelMarket[]>;
  findProductsByBookId(bookId: string): Promise<BookSalesProduct[]>;
  findAvailabilityByProductId(bookSalesProductId: string): Promise<BookSalesMarketAvailability[]>;
  findPublicPurchaseRowsByBookId(bookId: string): Promise<BookSalesPublicRow[]>;
  findPublicMarketsByChannelSlug(slug: string): Promise<PublicSalesChannelMarketRow[]>;
  saveBookSalesConfiguration(input: BookSalesConfigurationPersistenceInput): Promise<void>;
}
