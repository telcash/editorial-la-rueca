import { readFile } from 'node:fs/promises';
import { createAuthorDedupeFinalReview } from './final-review';
import { writeAuthorDedupeFinalReviewOutputs } from './final-review-output';
import { writeAuthorDedupeOutputs } from './output';
import { applyAuthorDedupe, restoreAuthorDedupeApplyState } from './apply';
import { writeAuthorDedupeApplyOutputs, readExistingAuthorDedupeApplyState } from './apply-output';
import { createAuthorDedupeApplyPlan } from './apply-plan';
import { authorDedupeApplyRepository } from './apply-repository';
import { runAuthorDedupePreflight, validateAuthorDedupeResumeState } from './preflight';
import type { AuthorDedupeApplyMode } from './apply-types';
import type { AuthorDedupeFinalReview } from './types';

export interface AuthorDedupeRunnerOptions {
  outputDirectory: string;
}

export interface AuthorDedupeApplyRunnerOptions extends AuthorDedupeRunnerOptions {
  mode: AuthorDedupeApplyMode;
  confirm?: string;
  resume: boolean;
  batchSize: number;
}

export async function runPostMigrationAuthorDedupeAudit(options: AuthorDedupeRunnerOptions) {
  const { auditPostMigrationAuthorDuplicates } = await import('./service');
  const audit = await auditPostMigrationAuthorDuplicates();
  const output = await writeAuthorDedupeOutputs(audit, options.outputDirectory);

  return {
    audit,
    ...output,
  };
}

export async function runPostMigrationAuthorDedupeFinalReview(options: AuthorDedupeRunnerOptions) {
  const { audit, review } = await createAuthorDedupeFinalReview({
    outputDirectory: options.outputDirectory,
  });
  const files = await writeAuthorDedupeFinalReviewOutputs({
    audit,
    review,
    outputDirectory: options.outputDirectory,
  });

  return {
    audit,
    review,
    outputDirectory: options.outputDirectory,
    files,
  };
}

export async function runPostMigrationAuthorDedupeApply(options: AuthorDedupeApplyRunnerOptions) {
  if (options.mode === 'apply' && options.confirm !== 'AUTHOR_DEDUPE') {
    throw new Error(
      'Para aplicar la fusion de autores debes usar --apply --confirm AUTHOR_DEDUPE.',
    );
  }

  const decisionsFile = `${options.outputDirectory}/author-dedupe-decisions.json`;
  const outputDirectory = `${options.outputDirectory}/apply`;
  const review = await readJson<AuthorDedupeFinalReview>(decisionsFile);
  const authorIds = getDecisionAuthorIds(review);
  const snapshot = await authorDedupeApplyRepository.readSnapshot(authorIds);
  const plan = createAuthorDedupeApplyPlan({
    decisionsFile,
    review,
    authors: snapshot.authors,
    relations: snapshot.relations,
    mode: options.mode,
    batchSize: options.batchSize,
  });
  const existingState = await readExistingAuthorDedupeApplyState(outputDirectory);
  const resumeConflicts = validateAuthorDedupeResumeState({
    apply: options.mode === 'apply',
    resume: options.resume,
    planFingerprint: plan.planFingerprint,
    existingManifest: existingState.manifest,
  });
  plan.conflicts.push(...resumeConflicts);
  restoreAuthorDedupeApplyState(plan, existingState.manifest, existingState.rollbackPlan);

  if (options.mode === 'preflight' || options.mode === 'apply') {
    plan.conflicts = await runAuthorDedupePreflight(plan, authorDedupeApplyRepository);
    refreshSummary(plan);
  }

  if (options.mode === 'apply') {
    const filesBeforeApply = await writeAuthorDedupeApplyOutputs(plan, outputDirectory);

    if (plan.summary.blockers > 0) {
      return {
        plan,
        outputDirectory,
        files: filesBeforeApply,
      };
    }

    await applyAuthorDedupe(plan, {
      repository: authorDedupeApplyRepository,
      batchSize: options.batchSize,
      checkpointWriter: {
        async persist(updatedPlan) {
          await writeAuthorDedupeApplyOutputs(updatedPlan, outputDirectory);
        },
      },
    });
  }

  const files = await writeAuthorDedupeApplyOutputs(plan, outputDirectory);

  return {
    plan,
    outputDirectory,
    files,
  };
}

function getDecisionAuthorIds(review: AuthorDedupeFinalReview) {
  return [
    ...new Set(
      review.decisions
        .filter((decision) => decision.decision === 'merge')
        .flatMap((decision) => [decision.canonicalAuthorId, ...decision.mergeAuthorIds]),
    ),
  ];
}

async function readJson<TData>(filePath: string): Promise<TData> {
  const content = await readFile(filePath, 'utf8');

  return JSON.parse(content) as TData;
}

function refreshSummary(plan: {
  conflicts: Array<{ severity: 'warning' | 'error' }>;
  summary: { conflicts: number; blockers: number };
}) {
  plan.summary.conflicts = plan.conflicts.length;
  plan.summary.blockers = plan.conflicts.filter((conflict) => conflict.severity === 'error').length;
}
