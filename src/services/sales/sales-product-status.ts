export const bookSalesProductStatusValues = [
  'available',
  'unavailable',
  'external_account',
  'pending',
] as const;

export type BookSalesProductStatus = (typeof bookSalesProductStatusValues)[number];

export const bookSalesProductStatusLabels = {
  available: 'Disponible',
  unavailable: 'No disponible',
  external_account: 'Cuenta externa',
  pending: 'Pendiente',
} satisfies Record<BookSalesProductStatus, string>;

export function isPurchasableBookSalesProductStatus(status: BookSalesProductStatus): boolean {
  return status === 'available';
}
