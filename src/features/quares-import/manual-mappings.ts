import { readFile } from 'node:fs/promises';

import { z } from 'zod';

import type { QuaresBookCandidate, QuaresSourceRow } from './types';

const mapDecisionSchema = z.object({
  action: z.literal('MAP'),
  bookId: z.string().uuid(),
  reason: z.string().trim().min(1),
});

const skipDecisionSchema = z.object({
  action: z.literal('SKIP'),
  reason: z.string().trim().min(1),
});

const manualDecisionSchema = z.discriminatedUnion('action', [
  mapDecisionSchema,
  skipDecisionSchema,
]);

const manualMappingsSchema = z.object({
  version: z.literal(2),
  mappings: z.record(z.string(), manualDecisionSchema),
});

export type QuaresManualMapDecision = z.infer<typeof mapDecisionSchema>;

export type QuaresManualSkipDecision = z.infer<typeof skipDecisionSchema>;

export type QuaresManualDecision = z.infer<typeof manualDecisionSchema>;

export interface QuaresManualMappings {
  version: 2;
  mappings: Record<string, QuaresManualDecision>;
}

export interface QuaresValidatedManualDecisions {
  mappings: Map<string, QuaresManualMapDecision>;
  skippedExternalProductIds: Set<string>;
  issues: QuaresManualMappingValidationIssue[];
}

export interface QuaresManualMappingValidationIssue {
  externalProductId: string;
  reason: string;
}

export async function loadQuaresManualMappings(filePath: string): Promise<QuaresManualMappings> {
  const raw = await readFile(filePath, 'utf8');
  const json: unknown = JSON.parse(raw);

  return manualMappingsSchema.parse(json);
}

export function validateQuaresManualMappings(input: {
  configuration: QuaresManualMappings;
  sourceRows: QuaresSourceRow[];
  books: QuaresBookCandidate[];
}): QuaresValidatedManualDecisions {
  const sourceIds = new Set(input.sourceRows.map((row) => row.externalProductId));

  const booksById = new Map(input.books.map((book) => [book.id, book]));

  const mappings = new Map<string, QuaresManualMapDecision>();

  const skippedExternalProductIds = new Set<string>();

  const issues: QuaresManualMappingValidationIssue[] = [];

  /*
   * Under the current database model there can only be
   * one Quares product per internal book.
   *
   * Therefore two explicit MAP decisions may not point
   * to the same book.
   */
  const externalIdByMappedBookId = new Map<string, string>();

  for (const [externalProductId, decision] of Object.entries(input.configuration.mappings)) {
    if (!sourceIds.has(externalProductId)) {
      issues.push({
        externalProductId,
        reason: 'Quares ID does not exist in the source workbook.',
      });

      continue;
    }

    if (decision.action === 'SKIP') {
      skippedExternalProductIds.add(externalProductId);

      continue;
    }

    if (!booksById.has(decision.bookId)) {
      issues.push({
        externalProductId,
        reason: `Book does not exist: ${decision.bookId}`,
      });

      continue;
    }

    const alreadyMappedExternalId = externalIdByMappedBookId.get(decision.bookId);

    if (alreadyMappedExternalId && alreadyMappedExternalId !== externalProductId) {
      issues.push({
        externalProductId,
        reason:
          `Book ${decision.bookId} is already manually mapped ` +
          `to Quares ID ${alreadyMappedExternalId}. ` +
          'The current sales model allows only one Quares product per book.',
      });

      continue;
    }

    externalIdByMappedBookId.set(decision.bookId, externalProductId);

    mappings.set(externalProductId, decision);
  }

  return {
    mappings,
    skippedExternalProductIds,
    issues,
  };
}
