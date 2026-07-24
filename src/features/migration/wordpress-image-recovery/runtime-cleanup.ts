export async function cleanupImageRecoveryRuntime() {
  if (!globalThis.__editorialDatabaseConnectionInitialized) {
    return;
  }

  const { closeDatabaseConnection } = await import('@/db');

  await closeDatabaseConnection();
}
