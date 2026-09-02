import { loadPilotCliEnv } from '@/features/migration/wordpress-pilot/env';
import { cleanupPilotRuntime } from '@/features/migration/wordpress-pilot/runtime-cleanup';
import { SALES_SEED_CONFIRMATION } from '@/features/sales-seed/confirmation';

interface CliArgs {
  dryRun: boolean;
  apply: boolean;
  confirm?: string;
}

async function main() {
  loadPilotCliEnv(process.cwd());

  try {
    const args = parseArgs(process.argv.slice(2));
    const mode = args.apply ? 'apply' : 'dry-run';
    const salesRepository = await import('@/repositories/sales/sales.repository');
    const { runSalesSeed } = await import('@/features/sales-seed/runner');
    const result = await runSalesSeed(salesRepository, {
      mode,
      confirm: args.confirm,
    });

    console.log('Sales seed completed.');
    console.log(`Mode: ${mode}`);
    console.log(
      `Channels create/update/unchanged/conflict: ${result.plan.summary.channelsCreate}/${result.plan.summary.channelsUpdate}/${result.plan.summary.channelsUnchanged}/${result.plan.summary.channelsConflict}`,
    );
    console.log(
      `Markets create/update/unchanged/conflict: ${result.plan.summary.marketsCreate}/${result.plan.summary.marketsUpdate}/${result.plan.summary.marketsUnchanged}/${result.plan.summary.marketsConflict}`,
    );
    console.log(`Conflicts: ${result.plan.summary.conflicts}`);

    for (const channel of result.plan.channels) {
      console.log(`- channel ${channel.slug}: ${channel.operation}`);
    }

    for (const market of result.plan.markets) {
      console.log(`- market ${market.channelSlug}/${market.countryCode}: ${market.operation}`);
    }

    if (result.applyResult) {
      console.log(
        `Applied channels created/updated/unchanged: ${result.applyResult.channelsCreated}/${result.applyResult.channelsUpdated}/${result.applyResult.channelsUnchanged}`,
      );
      console.log(
        `Applied markets created/updated/unchanged: ${result.applyResult.marketsCreated}/${result.applyResult.marketsUpdated}/${result.applyResult.marketsUnchanged}`,
      );
    }
  } finally {
    await cleanupPilotRuntime();
  }
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    dryRun: false,
    apply: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--dry-run') {
      args.dryRun = true;
      continue;
    }

    if (arg === '--apply') {
      args.apply = true;
      continue;
    }

    if (arg === '--confirm') {
      args.confirm = readArgValue(argv, index, '--confirm');
      index += 1;
      continue;
    }

    if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  const selectedModes = [args.dryRun, args.apply].filter(Boolean).length;

  if (selectedModes === 0) {
    args.dryRun = true;
  } else if (selectedModes !== 1) {
    throw new Error('Usa exactamente uno de: --dry-run o --apply.');
  }

  return args;
}

function readArgValue(args: string[], index: number, name: string) {
  const value = args[index + 1];

  if (!value || value.startsWith('--')) {
    throw new Error(`Missing value for ${name}.`);
  }

  return value;
}

function printHelp() {
  console.log(`Usage:
  npm run sales:seed -- --dry-run
  npm run sales:seed -- --apply --confirm ${SALES_SEED_CONFIRMATION}`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown sales seed error.';
  console.error(`Sales seed failed: ${message}`);
  process.exitCode = 1;
});
