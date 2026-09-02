import { updateBookSalesConfigurationSchema } from '@/schemas/sales/sales.schema';
import type { BookSalesAdminConfiguration } from '@/services/sales/sales.types';
import type { BookSalesFormValues } from '../types/book-sales-form-state';

export function mapBookSalesConfigurationToFormValues(
  configuration: BookSalesAdminConfiguration,
): BookSalesFormValues {
  return {
    quares: {
      enabled: configuration.quares.enabled,
      externalProductId: configuration.quares.externalProductId,
      status: configuration.quares.status,
      marketIds: configuration.quares.marketIds,
    },
    amazon: {
      enabled: configuration.amazon.enabled,
      purchaseUrl: configuration.amazon.purchaseUrl,
      status: configuration.amazon.status,
    },
  };
}

export function getBookSalesFormErrors(values: BookSalesFormValues): Record<string, string> {
  const result = updateBookSalesConfigurationSchema.safeParse(values);

  if (result.success) {
    return {};
  }

  return Object.fromEntries(
    result.error.issues.map((issue) => [issue.path.join('.'), issue.message]),
  );
}

export function toggleBookSalesMarket(marketIds: string[], marketId: string): string[] {
  return marketIds.includes(marketId)
    ? marketIds.filter((currentMarketId) => currentMarketId !== marketId)
    : [...marketIds, marketId];
}
