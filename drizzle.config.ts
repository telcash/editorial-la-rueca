import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

config({ path: '.env.local' });

const databaseMigrationUrl = process.env.DATABASE_MIGRATION_URL;

if (!databaseMigrationUrl) {
  throw new Error(
    'DATABASE_MIGRATION_URL is required for Drizzle Kit migrations. Use a direct connection or Session Pooler URL.',
  );
}

export default defineConfig({
  schema: './src/db/schema/*',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: databaseMigrationUrl,
  },
  verbose: true,
  strict: true,
});
