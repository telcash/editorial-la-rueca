import 'server-only';

import type { AmazonImportPlan } from '@/features/amazon-import/planner';
import * as salesRepository from '@/repositories/sales/sales.repository';

export const AMAZON_IMPORT_CONFIRMATION = 'AMAZON_IMPORT';

export interface ApplyAmazonImportResult {
  applied: number;
}

export function assertAmazonImportConfirmation(confirm: string | undefined): void {
  if (confirm !== AMAZON_IMPORT_CONFIRMATION) {
    throw new Error(`Apply protegido. Usa --apply --confirm ${AMAZON_IMPORT_CONFIRMATION}.`);
  }
}

export async function applyAmazonImportPlan(
  plan: AmazonImportPlan,
  salesChannelId: string,
): Promise<ApplyAmazonImportResult> {
  const rows = plan.rows
    .filter((row) => row.operation === 'READY_CREATE' || row.operation === 'READY_UPDATE')
    .map((row) => {
      if (!row.matchedBook) {
        throw new Error(`Amazon import row source=${row.source.sourceIndex} has no matched book.`);
      }

      const externalProductId = row.source.asin?.trim();
      const purchaseUrl = row.source.purchaseUrl?.trim();

      if (!externalProductId) {
        throw new Error(`Amazon import row source=${row.source.sourceIndex} has no ASIN.`);
      }

      if (!purchaseUrl) {
        throw new Error(`Amazon import row source=${row.source.sourceIndex} has no purchase URL.`);
      }

      return {
        bookId: row.matchedBook.id,
        salesChannelId,
        externalProductId: externalProductId.toUpperCase(),
        purchaseUrl,
      };
    });

  if (rows.length === 0) {
    return {
      applied: 0,
    };
  }

  const applied = await salesRepository.applyAmazonImportRows(rows);

  return {
    applied,
  };
}
