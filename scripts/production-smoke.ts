import {
  formatSmokeResult,
  normalizeSmokeBaseUrl,
  runProductionSmoke,
} from './production-smoke-core';

function getBaseUrlArgument(args: string[]): string | undefined {
  let baseUrl: string | undefined;

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];

    if (argument === '--base-url') {
      const value = args[index + 1];

      if (!value || value.startsWith('--')) {
        throw new Error('Falta el valor de --base-url.');
      }

      if (baseUrl !== undefined) {
        throw new Error('--base-url no puede repetirse.');
      }

      baseUrl = value;
      index += 1;
      continue;
    }

    if (argument.startsWith('--base-url=')) {
      if (baseUrl !== undefined) {
        throw new Error('--base-url no puede repetirse.');
      }

      baseUrl = argument.slice('--base-url='.length);
      continue;
    }

    throw new Error(`Argumento no reconocido: ${argument}`);
  }

  return baseUrl;
}

async function main() {
  const baseUrlArgument = getBaseUrlArgument(process.argv.slice(2));
  const baseUrl = normalizeSmokeBaseUrl(baseUrlArgument ?? '');
  const results = await runProductionSmoke({ baseUrl });
  const passed = results.filter((result) => result.passed).length;

  console.log('Production smoke');
  console.log(`Base URL: ${baseUrl.toString()}`);
  console.log('');

  for (const result of results) {
    console.log(formatSmokeResult(result));
  }

  console.log('');
  console.log(
    `Smoke ${passed === results.length ? 'passed' : 'failed'}: ${passed}/${results.length}`,
  );

  if (passed !== results.length) {
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  console.error(
    `Production smoke failed: ${error instanceof Error ? error.message : 'argument error.'}`,
  );
  process.exitCode = 1;
});
