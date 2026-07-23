import path from 'node:path';

import { readPilotAuditData } from './audit-data';
import { applyPilotMigration } from './apply';
import {
  createFailedPilotResult,
  createPilotCheckpointWriter,
  readExistingManifest,
  readExistingResult,
  writePilotOutputs,
} from './output';
import { createImageRepairPlan } from './image-repair';
import { runImageRepair } from './image-repair-apply';
import type { ImageRepairResult } from './image-repair-apply';
import { createImageReviewSummary } from './image-review';
import { planPilotMigration } from './planner';
import type { PilotPlan, PilotResult } from './types';

export interface PilotCliOptions {
  auditDirectory: string;
  outputDirectory: string;
  apply: boolean;
  confirm?: string;
  retryImages?: boolean;
  repairImages?: boolean;
}

function markNonRetryableImageFailures(plan: PilotPlan, existingResult: PilotResult | null) {
  const oversizedImageFailures =
    existingResult?.issues.filter(
      (issue) =>
        (issue.code === 'PILOT_IMAGE_FAILED' || issue.code === 'IMAGE_TOO_LARGE') &&
        issue.details === 'Image exceeds 5 MB',
    ) ?? [];

  for (const issue of oversizedImageFailures) {
    const imageEntry = plan.manifest.entries.find(
      (entry) => entry.sourceType === 'image' && entry.candidateKey === issue.candidateKey,
    );

    if (!imageEntry || imageEntry.imageStatus === 'uploaded') {
      continue;
    }

    imageEntry.status = 'skipped';
    imageEntry.imageStatus = 'manual_action_required';
    imageEntry.checkpoint = 'manual_action_required';
    imageEntry.sourceMetadata = {
      ...imageEntry.sourceMetadata,
      migrationErrorCode: 'IMAGE_TOO_LARGE',
      retryable: false,
      manualActionRequired: true,
    };
  }
}

export async function runPilotMigration(options: PilotCliOptions) {
  const outputDirectory = path.resolve(options.outputDirectory);

  if (options.apply && options.repairImages && options.confirm !== 'REPAIR') {
    throw new Error('Para reparar imagenes debes usar --apply --repair-images --confirm REPAIR.');
  }

  if (options.apply && !options.repairImages && options.confirm !== 'PILOT') {
    throw new Error('Para aplicar el piloto debes usar --apply --confirm PILOT.');
  }

  const auditDirectory = path.resolve(options.auditDirectory);
  const existingManifest = await readExistingManifest(outputDirectory);
  const existingResult = await readExistingResult(outputDirectory);
  const data = await readPilotAuditData(
    auditDirectory,
    path.join(outputDirectory, 'decisions.json'),
  );
  const plan = planPilotMigration(data, {
    auditSource: auditDirectory,
    mode: options.apply ? 'apply' : 'dry-run',
    existingManifest: existingManifest ?? undefined,
  });
  markNonRetryableImageFailures(plan, existingResult);
  const imageRepairPlan = createImageRepairPlan(data, plan, existingManifest);
  const imageReviewSummary = createImageReviewSummary(
    data,
    plan,
    existingManifest ?? plan.manifest,
    imageRepairPlan,
  );

  if (options.repairImages) {
    const repairResult: ImageRepairResult = await runImageRepair({
      outputDirectory,
      apply: options.apply,
      confirm: options.confirm,
      manifest: existingManifest ?? plan.manifest,
      repairPlan: imageRepairPlan,
    });

    return {
      plan,
      result: null,
      repairResult,
      outputDirectory,
    };
  }

  if (!options.apply) {
    await writePilotOutputs(outputDirectory, plan, undefined, imageRepairPlan, imageReviewSummary);

    return {
      plan,
      result: null,
      repairResult: null,
      outputDirectory,
    };
  }

  try {
    const result = await applyPilotMigration(plan, {
      existingManifest,
      checkpointWriter: createPilotCheckpointWriter(outputDirectory),
      retryImagesOnly: options.retryImages,
    });
    await writePilotOutputs(outputDirectory, plan, result, imageRepairPlan, imageReviewSummary);

    return {
      plan,
      result,
      repairResult: null,
      outputDirectory,
    };
  } catch (error) {
    const result = createFailedPilotResult(plan, error);
    await writePilotOutputs(outputDirectory, plan, result, imageRepairPlan, imageReviewSummary);
    throw error;
  }
}
