import { describe, expect, it, vi } from 'vitest';

import { executeMigrationPilotCli, type MigrationPilotCliDependencies } from './migration-pilot';

type CliRunResult = Awaited<
  ReturnType<NonNullable<MigrationPilotCliDependencies['runPilotMigration']>>
>;

function createRunResult(overrides: Partial<CliRunResult> = {}): CliRunResult {
  return {
    plan: {
      mode: 'dry-run',
      authors: [],
      books: [],
      issues: [],
    },
    result: null,
    repairResult: null,
    outputDirectory: '/tmp/pilot',
    ...overrides,
  };
}

function createDependencies(
  overrides: Partial<MigrationPilotCliDependencies> = {},
): MigrationPilotCliDependencies {
  return {
    loadEnv: vi.fn(),
    cleanupRuntime: vi.fn(async () => undefined),
    log: vi.fn(),
    error: vi.fn(),
    runPilotMigration: vi.fn(async () => createRunResult()),
    ...overrides,
  };
}

describe('executeMigrationPilotCli', () => {
  it('runs cleanup after a successful dry-run', async () => {
    const events: string[] = [];
    const dependencies = createDependencies({
      runPilotMigration: vi.fn(async () => {
        events.push('run');

        return createRunResult();
      }),
      cleanupRuntime: vi.fn(async () => {
        events.push('cleanup');
      }),
    });

    const exitCode = await executeMigrationPilotCli(
      ['--audit', './migration/audit', '--dry-run'],
      dependencies,
    );

    expect(exitCode).toBe(0);
    expect(events).toEqual(['run', 'cleanup']);
  });

  it('runs cleanup after a runner error', async () => {
    const cleanupRuntime = vi.fn(async () => undefined);
    const dependencies = createDependencies({
      cleanupRuntime,
      runPilotMigration: vi.fn(async () => {
        throw new Error('runner failed');
      }),
    });

    const exitCode = await executeMigrationPilotCli(['--audit', './migration/audit'], dependencies);

    expect(exitCode).toBe(1);
    expect(cleanupRuntime).toHaveBeenCalledTimes(1);
    expect(dependencies.error).toHaveBeenCalledWith('runner failed');
  });

  it('runs cleanup once after preflight argument errors', async () => {
    const cleanupRuntime = vi.fn(async () => undefined);
    const dependencies = createDependencies({ cleanupRuntime });

    const exitCode = await executeMigrationPilotCli([], dependencies);

    expect(exitCode).toBe(1);
    expect(cleanupRuntime).toHaveBeenCalledTimes(1);
    expect(dependencies.runPilotMigration).not.toHaveBeenCalled();
  });

  it('runs cleanup for repair-images mode', async () => {
    const cleanupRuntime = vi.fn(async () => undefined);
    const runPilotMigration = vi.fn(async () =>
      createRunResult({
        repairResult: {
          generatedAt: '2026-07-23T00:00:00.000Z',
          dryRun: true,
          summary: {
            clearWrongBookCover: 3,
            setAuthorPhoto: 6,
            manualReview: 2,
            applied: 0,
            skipped: 0,
            partial: 0,
            failed: 0,
            manualActionRequired: 2,
          },
          entries: [],
        },
      }),
    );
    const dependencies = createDependencies({ cleanupRuntime, runPilotMigration });

    const exitCode = await executeMigrationPilotCli(
      ['--audit', './migration/audit', '--repair-images', '--dry-run'],
      dependencies,
    );

    expect(exitCode).toBe(0);
    expect(cleanupRuntime).toHaveBeenCalledTimes(1);
    expect(runPilotMigration).toHaveBeenCalledWith(
      expect.objectContaining({
        repairImages: true,
        retryImages: false,
      }),
    );
  });

  it('runs cleanup for retry-images mode', async () => {
    const cleanupRuntime = vi.fn(async () => undefined);
    const runPilotMigration = vi.fn(async () => createRunResult());
    const dependencies = createDependencies({ cleanupRuntime, runPilotMigration });

    const exitCode = await executeMigrationPilotCli(
      ['--audit', './migration/audit', '--apply', '--confirm', 'PILOT', '--retry-images'],
      dependencies,
    );

    expect(exitCode).toBe(0);
    expect(cleanupRuntime).toHaveBeenCalledTimes(1);
    expect(runPilotMigration).toHaveBeenCalledWith(
      expect.objectContaining({
        apply: true,
        confirm: 'PILOT',
        retryImages: true,
        repairImages: false,
      }),
    );
  });

  it('keeps result handling before cleanup', async () => {
    const events: string[] = [];
    const dependencies = createDependencies({
      runPilotMigration: vi.fn(async () => {
        events.push('write-result');

        return createRunResult({
          result: {
            generatedAt: '2026-07-23T00:00:00.000Z',
            planned: 0,
            createdAuthors: 0,
            createdBooks: 0,
            createdRelations: 0,
            createdEditions: 0,
            uploadedAuthorImages: 0,
            uploadedBookCovers: 0,
            skipped: 0,
            partial: 0,
            failed: 0,
            issues: [],
          },
        });
      }),
      cleanupRuntime: vi.fn(async () => {
        events.push('cleanup');
      }),
    });

    const exitCode = await executeMigrationPilotCli(
      ['--audit', './migration/audit', '--apply', '--confirm', 'PILOT'],
      dependencies,
    );

    expect(exitCode).toBe(0);
    expect(events).toEqual(['write-result', 'cleanup']);
  });
});
