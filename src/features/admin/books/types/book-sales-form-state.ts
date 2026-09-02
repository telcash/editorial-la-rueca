import type { BookSalesProductStatus } from '@/services/sales/sales-product-status';

export interface BookSalesFormValues {
  quares: {
    enabled: boolean;
    externalProductId: string;
    status: BookSalesProductStatus;
    marketIds: string[];
  };
  amazon: {
    enabled: boolean;
    purchaseUrl: string;
    status: BookSalesProductStatus;
  };
}

export interface BookSalesActionState {
  success: boolean;
  fieldErrors: Record<string, string>;
  formError: string | null;
}
