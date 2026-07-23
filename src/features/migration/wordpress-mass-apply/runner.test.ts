import { describe, expect, it } from 'vitest';

import { runMassMigration } from './runner';

describe('runMassMigration protections', () => {
  it('requires exact MASS_MIGRATION confirmation for apply', async () => {
    await expect(
      runMassMigration({
        massDirectory: './migration/mass',
        dryRun: false,
        preflight: false,
        apply: true,
        confirm: 'WRONG',
        confirmBackup: true,
        resume: false,
        batchSize: 20,
      }),
    ).rejects.toThrow('--apply --confirm MASS_MIGRATION');
  });

  it('requires backup confirmation for apply', async () => {
    await expect(
      runMassMigration({
        massDirectory: './migration/mass',
        dryRun: false,
        preflight: false,
        apply: true,
        confirm: 'MASS_MIGRATION',
        confirmBackup: false,
        resume: false,
        batchSize: 20,
      }),
    ).rejects.toThrow('--confirm-backup');
  });
});
