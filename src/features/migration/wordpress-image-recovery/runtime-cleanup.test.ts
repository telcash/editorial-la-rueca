import { beforeEach, describe, expect, it, vi } from 'vitest';

const closeDatabaseConnection = vi.fn(async () => undefined);

vi.mock('@/db', () => ({
  closeDatabaseConnection,
}));

describe('image recovery runtime cleanup', () => {
  beforeEach(() => {
    closeDatabaseConnection.mockClear();
    globalThis.__editorialDatabaseConnectionInitialized = undefined;
  });

  it('does nothing when the DB connection was not initialized', async () => {
    const { cleanupImageRecoveryRuntime } = await import('./runtime-cleanup');

    await cleanupImageRecoveryRuntime();

    expect(closeDatabaseConnection).not.toHaveBeenCalled();
  });

  it('closes the DB connection when Stage 4 initialized repositories', async () => {
    globalThis.__editorialDatabaseConnectionInitialized = true;
    const { cleanupImageRecoveryRuntime } = await import('./runtime-cleanup');

    await cleanupImageRecoveryRuntime();

    expect(closeDatabaseConnection).toHaveBeenCalledTimes(1);
  });
});
