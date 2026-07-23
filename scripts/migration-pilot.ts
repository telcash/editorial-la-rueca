import { pathToFileURL } from 'node:url';

import {
  checkPilotRuntimeImports,
  getPilotCliEnvStatus,
  loadPilotCliEnv,
} from '@/features/migration/wordpress-pilot/env';
import type { ImageRepairResult } from '@/features/migration/wordpress-pilot/image-repair-apply';
import type { PilotPlan, PilotResult } from '@/features/migration/wordpress-pilot/types';

interface CliArgs {
  auditDirectory?: string;
  outputDirectory: string;
  apply: boolean;
  confirm?: string;
  checkEnv: boolean;
  checkRuntime: boolean;
  retryImages: boolean;
  repairImages: boolean;
}

interface PilotCliRunResult {
  plan: Pick<PilotPlan, 'mode' | 'authors' | 'books' | 'issues'>;
  result: PilotResult | null;
  repairResult?: ImageRepairResult | null;
  outputDirectory: string;
}

export interface MigrationPilotCliDependencies {
  loadEnv?: (projectDirectory: string) => void;
  getEnvStatus?: typeof getPilotCliEnvStatus;
  checkRuntimeImports?: typeof checkPilotRuntimeImports;
  runPilotMigration?: (options: {
    auditDirectory: string;
    outputDirectory: string;
    apply: boolean;
    confirm?: string;
    retryImages: boolean;
    repairImages: boolean;
  }) => Promise<PilotCliRunResult>;
  cleanupRuntime?: () => Promise<void>;
  log?: (message?: unknown, ...optionalParams: unknown[]) => void;
  error?: (message?: unknown, ...optionalParams: unknown[]) => void;
  projectDirectory?: string;
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    outputDirectory: './migration/pilot',
    apply: false,
    checkEnv: false,
    checkRuntime: false,
    retryImages: false,
    repairImages: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--audit') {
      args.auditDirectory = argv[index + 1];
      index += 1;
      continue;
    }

    if (arg === '--output') {
      args.outputDirectory = argv[index + 1] ?? args.outputDirectory;
      index += 1;
      continue;
    }

    if (arg === '--dry-run') {
      args.apply = false;
      continue;
    }

    if (arg === '--apply') {
      args.apply = true;
      continue;
    }

    if (arg === '--confirm') {
      args.confirm = argv[index + 1];
      index += 1;
      continue;
    }

    if (arg === '--check-env') {
      args.checkEnv = true;
      continue;
    }

    if (arg === '--check-runtime') {
      args.checkRuntime = true;
      continue;
    }

    if (arg === '--retry-images') {
      args.retryImages = true;
      continue;
    }

    if (arg === '--repair-images') {
      args.repairImages = true;
    }
  }

  if (!args.auditDirectory && !args.checkEnv && !args.checkRuntime) {
    throw new Error('Uso: npm run migration:pilot -- --audit <directorio> [--dry-run]');
  }

  return args;
}

async function defaultRunPilotMigration(
  options: Parameters<NonNullable<MigrationPilotCliDependencies['runPilotMigration']>>[0],
) {
  const { runPilotMigration } = await import('@/features/migration/wordpress-pilot/runner');

  return runPilotMigration(options);
}

async function defaultCleanupRuntime() {
  const { cleanupPilotRuntime } =
    await import('@/features/migration/wordpress-pilot/runtime-cleanup');

  await cleanupPilotRuntime();
}

export async function executeMigrationPilotCli(
  argv: string[],
  dependencies: MigrationPilotCliDependencies = {},
) {
  const loadEnv = dependencies.loadEnv ?? loadPilotCliEnv;
  const getEnvStatus = dependencies.getEnvStatus ?? getPilotCliEnvStatus;
  const checkRuntimeImports = dependencies.checkRuntimeImports ?? checkPilotRuntimeImports;
  const runPilotMigration = dependencies.runPilotMigration ?? defaultRunPilotMigration;
  const cleanupRuntime = dependencies.cleanupRuntime ?? defaultCleanupRuntime;
  const log = dependencies.log ?? console.log;
  const errorLog = dependencies.error ?? console.error;
  let exitCode = 0;

  try {
    loadEnv(dependencies.projectDirectory ?? process.cwd());

    const args = parseArgs(argv);

    if (args.checkEnv) {
      const status = getEnvStatus();

      log(`DATABASE runtime: ${status.databaseRuntime}`);
      log(`Supabase URL: ${status.supabaseUrl}`);
      log(`Supabase publishable key: ${status.supabasePublishableKey}`);
      log(`Supabase migration service role: ${status.supabaseMigrationServiceRole}`);
      return exitCode;
    }

    if (args.checkRuntime) {
      const results = await checkRuntimeImports();

      for (const result of results) {
        log(`${result.moduleName}: ${result.imported ? 'imported' : 'failed'}`);
      }

      return exitCode;
    }

    const auditDirectory = args.auditDirectory;

    if (!auditDirectory) {
      throw new Error('Uso: npm run migration:pilot -- --audit <directorio> [--dry-run]');
    }

    const { plan, result, repairResult, outputDirectory } = await runPilotMigration({
      auditDirectory,
      outputDirectory: args.outputDirectory,
      apply: args.apply,
      confirm: args.confirm,
      retryImages: args.retryImages,
      repairImages: args.repairImages,
    });

    log('[migration:pilot] mode', plan.mode);
    log('[migration:pilot] output', outputDirectory);
    log('[migration:pilot] authors', plan.authors.length);
    log('[migration:pilot] books', plan.books.length);
    log('[migration:pilot] issues', plan.issues.length);

    if (result) {
      log('[migration:pilot] result', result);

      if (result.failed > 0 || result.issues.some((issue) => issue.severity === 'error')) {
        exitCode = 1;
      }
    }

    if (repairResult) {
      log('[migration:pilot] image repair', repairResult.summary);

      if (repairResult.summary.failed > 0) {
        exitCode = 1;
      }
    }

    return exitCode;
  } catch (error) {
    errorLog(error instanceof Error ? error.message : error);
    return 1;
  } finally {
    await cleanupRuntime();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  executeMigrationPilotCli(process.argv.slice(2))
    .then((exitCode) => {
      process.exitCode = exitCode;
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
    });
}
