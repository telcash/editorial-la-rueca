import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';

const client = postgres(process.env.DATABASE_URL!, {
  prepare: false,
});
let isDatabaseConnectionClosed = false;

declare global {
  // Used by CLI cleanup code to avoid importing this module just to discover it was never loaded.
  var __editorialDatabaseConnectionInitialized: boolean | undefined;
}

globalThis.__editorialDatabaseConnectionInitialized = true;

export const db = drizzle(client);

export async function closeDatabaseConnection() {
  if (isDatabaseConnectionClosed) {
    return;
  }

  isDatabaseConnectionClosed = true;
  await client.end();
}
