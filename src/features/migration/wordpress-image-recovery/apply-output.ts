import { mkdir, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type { ImageRecoveryApplyPlan } from './apply-types';

export async function writeImageRecoveryApplyOutputs(
  plan: ImageRecoveryApplyPlan,
  outputDirectory: string,
) {
  await mkdir(outputDirectory, { recursive: true });

  const files: Array<[string, unknown]> = [
    ['apply-plan.json', plan],
    ['manifest.json', plan.manifest],
    ['result.json', plan.result],
    ['conflicts.json', plan.conflicts],
    ['rollback-plan.json', plan.rollbackPlan],
  ];

  await Promise.all(
    files.map(([filename, data]) => writeJsonAtomic(path.join(outputDirectory, filename), data)),
  );

  return files.map(([filename]) => path.join(outputDirectory, filename));
}

async function writeJsonAtomic(filePath: string, data: unknown) {
  const tempPath = `${filePath}.${process.pid}.tmp`;
  await writeFile(tempPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  await rename(tempPath, filePath);
}
