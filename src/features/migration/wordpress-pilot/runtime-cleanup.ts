export async function cleanupPilotRuntime() {
  if (!globalThis.__editorialDatabaseConnectionInitialized) {
    return;
  }

  const { closeDatabaseConnection } = await import('@/db');

  await closeDatabaseConnection();
}
