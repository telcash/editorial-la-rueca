import { loadEnvConfig, updateInitialEnv } from '@next/env';

export interface PilotCliEnvStatus {
  databaseRuntime: 'configured' | 'missing';
  supabaseUrl: 'configured' | 'missing';
  supabasePublishableKey: 'configured' | 'missing';
  supabaseMigrationServiceRole: 'configured' | 'missing';
}

export interface PilotRuntimeImportStatus {
  moduleName: string;
  imported: boolean;
}

type PilotCliEnv = Record<string, string | undefined>;

interface PilotApplyEnvironmentOptions {
  requireStorageCredentials?: boolean;
}

export function loadPilotCliEnv(projectDirectory = process.cwd()) {
  updateInitialEnv(process.env);
  loadEnvConfig(projectDirectory, undefined, undefined, true);
}

export function getPilotCliEnvStatus(env: PilotCliEnv = process.env): PilotCliEnvStatus {
  return {
    databaseRuntime: env.DATABASE_URL ? 'configured' : 'missing',
    supabaseUrl: env.NEXT_PUBLIC_SUPABASE_URL ? 'configured' : 'missing',
    supabasePublishableKey:
      env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        ? 'configured'
        : 'missing',
    supabaseMigrationServiceRole: env.SUPABASE_SERVICE_ROLE_KEY ? 'configured' : 'missing',
  };
}

export function assertPilotApplyEnvironment(
  env: PilotCliEnv = process.env,
  options: PilotApplyEnvironmentOptions = {},
) {
  const status = getPilotCliEnvStatus(env);
  const missing: string[] = [];

  if (status.databaseRuntime === 'missing') {
    missing.push('DATABASE_URL');
  }

  if (status.supabaseUrl === 'missing') {
    missing.push('NEXT_PUBLIC_SUPABASE_URL');
  }

  if (status.supabasePublishableKey === 'missing') {
    missing.push('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }

  if (options.requireStorageCredentials && status.supabaseMigrationServiceRole === 'missing') {
    missing.push('SUPABASE_SERVICE_ROLE_KEY');
  }

  if (missing.length > 0) {
    throw new Error(`Faltan variables de entorno para apply: ${missing.join(', ')}.`);
  }
}

export async function checkPilotRuntimeImports(): Promise<PilotRuntimeImportStatus[]> {
  const modules = [
    { moduleName: 'server-only', loader: () => import('server-only') },
    { moduleName: 'AuthorService', loader: () => import('@/services/authors/author.service') },
    { moduleName: 'BookService', loader: () => import('@/services/books/book.service') },
    {
      moduleName: 'SupabaseMigrationClient',
      loader: () => import('./supabase-migration-client'),
    },
    {
      moduleName: 'AuthorImageStorageCore',
      loader: () => import('@/features/admin/authors/services/author-image-service.core'),
    },
    {
      moduleName: 'BookCoverStorageCore',
      loader: () => import('@/features/admin/books/services/book-cover-service.core'),
    },
    {
      moduleName: 'PilotMigrationStorageServices',
      loader: () => import('./storage-services'),
    },
  ];

  const results: PilotRuntimeImportStatus[] = [];

  for (const runtimeModule of modules) {
    await runtimeModule.loader();
    results.push({
      moduleName: runtimeModule.moduleName,
      imported: true,
    });
  }

  return results;
}
