export const SALES_SEED_CONFIRMATION = 'SALES_SEED';

export function assertSalesSeedApplyConfirmation(confirm: string | undefined) {
  if (confirm !== SALES_SEED_CONFIRMATION) {
    throw new Error(`Apply protegido. Usa --apply --confirm ${SALES_SEED_CONFIRMATION}.`);
  }
}
