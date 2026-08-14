import { buildAuthorDedupeAudit } from './analyzer';
import { readAuthorDedupeSourceAuthors } from './repository';

export async function auditPostMigrationAuthorDuplicates() {
  const authors = await readAuthorDedupeSourceAuthors();

  return buildAuthorDedupeAudit(authors);
}
