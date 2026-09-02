import 'server-only';

import { z } from 'zod';

import { applyQuaresImportRows as applyQuaresImportRowsRepository } from '@/repositories/sales/sales.repository';

const rowSchema = z.object({
  bookId: z.string().uuid(),
  salesChannelId: z.string().uuid(),
  externalProductId: z.string().trim().min(1),
  marketIds: z.array(z.string().uuid()),
});

const inputSchema = z.array(rowSchema);

export interface QuaresImportApplyRow {
  bookId: string;
  salesChannelId: string;
  externalProductId: string;
  marketIds: string[];
}

export async function applyQuaresImport(rows: QuaresImportApplyRow[]): Promise<number> {
  const parsed = inputSchema.parse(rows);

  return applyQuaresImportRowsRepository(parsed);
}
