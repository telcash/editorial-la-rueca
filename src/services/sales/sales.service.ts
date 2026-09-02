import 'server-only';

import * as salesRepository from '@/repositories/sales/sales.repository';
import { createSalesService } from './sales.service.core';

export { createSalesService } from './sales.service.core';
export { resolvePurchaseUrl } from './purchase-url-resolver';
export {
  bookSalesProductStatusLabels,
  bookSalesProductStatusValues,
  isPurchasableBookSalesProductStatus,
  type BookSalesProductStatus,
} from './sales-product-status';
export type {
  BookSalesAdminConfiguration,
  BookSalesAdminMarket,
  PublicPurchaseChannel,
  PublicPurchaseOption,
  SalesRepository,
} from './sales.types';

const salesService = createSalesService(salesRepository);

export const {
  listSalesChannels,
  listSalesChannelMarkets,
  listBookSalesProducts,
  listBookSalesMarketAvailability,
  assertMarketBelongsToProductChannel,
  getPublicPurchaseOptionsByBookId,
  getBookSalesAdminConfiguration,
  updateBookSalesConfiguration,
} = salesService;
