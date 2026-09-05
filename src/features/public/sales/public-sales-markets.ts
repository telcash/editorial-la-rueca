import 'server-only';

import { unstable_cache } from 'next/cache';

import * as SalesService from '@/services/sales/sales.service';
import type { PublicSalesChannelMarket } from '@/services/sales/sales.types';

export const PUBLIC_QUARES_MARKETS_CACHE_TAG = 'public-sales-channel-markets:quares';

const getCachedPublicQuaresMarkets = unstable_cache(
  async (): Promise<PublicSalesChannelMarket[]> => SalesService.getPublicChannelMarkets('quares'),
  ['public-sales-channel-markets', 'quares'],
  {
    revalidate: 3600,
    tags: [PUBLIC_QUARES_MARKETS_CACHE_TAG],
  },
);

export function getPublicQuaresMarkets(): Promise<PublicSalesChannelMarket[]> {
  return getCachedPublicQuaresMarkets();
}
