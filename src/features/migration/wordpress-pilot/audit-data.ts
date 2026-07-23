import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { parseCsv } from './csv';
import type {
  PilotAuditData,
  PilotAttachmentCandidate,
  PilotAuthorCandidate,
  PilotBookCandidate,
  PilotDecisions,
  PilotIssueCandidate,
  PilotRelationshipCandidate,
  PilotSample,
} from './types';

async function readJsonFile<TData>(filePath: string): Promise<TData> {
  const content = await readFile(filePath, 'utf8');

  return JSON.parse(content) as TData;
}

async function readCsvFile<TRecord>(filePath: string): Promise<TRecord[]> {
  const content = await readFile(filePath, 'utf8');

  return parseCsv(content).filter(
    (record) => !Object.entries(record).every(([key, value]) => key === value),
  ) as TRecord[];
}

async function readOptionalDecisions(filePath: string): Promise<PilotDecisions> {
  try {
    return await readJsonFile<PilotDecisions>(filePath);
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return {};
    }

    throw error;
  }
}

export async function readPilotAuditData(
  auditDirectory: string,
  decisionsPath?: string,
): Promise<PilotAuditData> {
  const resolvedAuditDirectory = path.resolve(auditDirectory);
  const resolvedDecisionsPath =
    decisionsPath ?? path.resolve(process.cwd(), 'migration/pilot/decisions.json');

  const [sample, authors, books, relationships, attachments, issues, decisions] = await Promise.all(
    [
      readJsonFile<PilotSample>(path.join(resolvedAuditDirectory, 'pilot-sample.json')),
      readCsvFile<PilotAuthorCandidate>(
        path.join(resolvedAuditDirectory, 'authors-candidates.csv'),
      ),
      readCsvFile<PilotBookCandidate>(path.join(resolvedAuditDirectory, 'books-candidates.csv')),
      readCsvFile<PilotRelationshipCandidate>(
        path.join(resolvedAuditDirectory, 'relationships-candidates.csv'),
      ),
      readCsvFile<PilotAttachmentCandidate>(
        path.join(resolvedAuditDirectory, 'attachments-candidates.csv'),
      ),
      readCsvFile<PilotIssueCandidate>(path.join(resolvedAuditDirectory, 'issues.csv')),
      readOptionalDecisions(resolvedDecisionsPath),
    ],
  );

  return {
    sample,
    authors,
    books,
    relationships,
    attachments,
    issues,
    decisions,
  };
}
