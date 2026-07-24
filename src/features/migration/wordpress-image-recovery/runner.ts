import path from 'node:path';

import { analyzeImageRecovery } from './analyzer';
import { adjudicateBookCovers } from './book-cover-adjudication';
import { writeBookCoverAdjudicationOutputs } from './book-cover-adjudication-output';
import { diagnoseBookCovers } from './book-cover-diagnosis';
import { writeBookCoverDiagnosisOutputs } from './book-cover-diagnosis-output';
import { createEditorialReview } from './editorial-review';
import { writeEditorialReviewOutputs } from './editorial-review-output';
import { writeImageRecoveryOutputs } from './output';
import { buildImageRecoveryApplyPlan } from './apply-plan';
import { writeImageRecoveryApplyOutputs } from './apply-output';
import { applyImageRecovery, preflightImageRecoveryApply } from './apply';

export interface ImageRecoveryOptions {
  analyze: boolean;
  dryRun: boolean;
  preflight?: boolean;
  apply: boolean;
  diagnoseBookCovers: boolean;
  adjudicateBookCovers: boolean;
  editorialReview: boolean;
  resume: boolean;
  confirm?: string;
  batchSize: number;
  massDirectory: string;
  auditDirectory: string;
  input?: string;
}

export async function runImageRecovery(options: ImageRecoveryOptions) {
  const massDirectory = path.resolve(options.massDirectory);
  const auditDirectory = path.resolve(options.auditDirectory);
  const outputDirectory = path.join(massDirectory, 'image-recovery');

  if (options.diagnoseBookCovers) {
    const diagnosis = await diagnoseBookCovers({
      massDirectory,
      auditDirectory,
      xmlInputPath: options.input ? path.resolve(options.input) : undefined,
    });
    const files = await writeBookCoverDiagnosisOutputs(diagnosis, outputDirectory);

    return {
      mode: 'diagnose-book-covers' as const,
      diagnosis,
      files,
      outputDirectory,
    };
  }

  if (options.adjudicateBookCovers) {
    const adjudication = await adjudicateBookCovers({
      massDirectory,
      auditDirectory,
    });
    const files = await writeBookCoverAdjudicationOutputs(adjudication, outputDirectory);

    return {
      mode: 'adjudicate-book-covers' as const,
      adjudication,
      files,
      outputDirectory,
    };
  }

  if (options.editorialReview) {
    const review = await createEditorialReview({
      massDirectory,
    });
    const files = await writeEditorialReviewOutputs(review, outputDirectory);

    return {
      mode: 'editorial-review' as const,
      review,
      files,
      outputDirectory,
    };
  }

  if (options.preflight || options.apply) {
    if (options.apply && options.confirm !== 'IMAGE_RECOVERY') {
      throw new Error('Para aplicar recovery de imagenes debes usar --confirm IMAGE_RECOVERY.');
    }

    const applyOutputDirectory = path.join(outputDirectory, 'apply');
    const applyPlan = await buildImageRecoveryApplyPlan({
      massDirectory,
      auditDirectory,
      mode: options.preflight ? 'preflight' : 'apply',
      batchSize: options.batchSize,
      resume: options.resume,
      xmlInputPath: options.input ? path.resolve(options.input) : undefined,
    });

    if (options.preflight) {
      const services = await getImageRecoveryApplyServices();
      await preflightImageRecoveryApply(applyPlan, services);
    }

    if (options.apply) {
      if (
        !options.resume &&
        applyPlan.manifest.entries.some((entry) => entry.status === 'applied')
      ) {
        throw new Error(
          'Existe un manifest de image recovery con operaciones ya aplicadas. Usa --resume para continuar.',
        );
      }

      await applyImageRecovery(applyPlan, {
        checkpointWriter: {
          persist: (plan) => writeImageRecoveryApplyOutputs(plan, applyOutputDirectory).then(),
        },
      });
    }

    const files = await writeImageRecoveryApplyOutputs(applyPlan, applyOutputDirectory);

    return {
      mode: options.preflight
        ? ('image-recovery-preflight' as const)
        : ('image-recovery-apply' as const),
      plan: applyPlan,
      files,
      outputDirectory: applyOutputDirectory,
    };
  }

  if (options.dryRun) {
    const applyOutputDirectory = path.join(outputDirectory, 'apply');
    const applyPlan = await buildImageRecoveryApplyPlan({
      massDirectory,
      auditDirectory,
      mode: 'dry-run',
      batchSize: options.batchSize,
      resume: options.resume,
      xmlInputPath: options.input ? path.resolve(options.input) : undefined,
    });
    const files = await writeImageRecoveryApplyOutputs(applyPlan, applyOutputDirectory);

    return {
      mode: 'image-recovery-dry-run' as const,
      plan: applyPlan,
      files,
      outputDirectory: applyOutputDirectory,
    };
  }

  const plan = await analyzeImageRecovery({
    paths: {
      massApplyDirectory: path.join(massDirectory, 'apply'),
      auditDirectory,
      outputDirectory,
      xmlInputPath: options.input ? path.resolve(options.input) : undefined,
    },
    mode: 'analyze',
    batchSize: options.batchSize,
  });
  const files = await writeImageRecoveryOutputs(plan, outputDirectory);

  return {
    mode: 'recovery' as const,
    plan,
    files,
    outputDirectory,
  };
}

async function getImageRecoveryApplyServices() {
  const { downloadRecoveryImage } = await import('./apply');
  const authorService = await import('@/services/authors/author.service');
  const bookService = await import('@/services/books/book.service');
  const { createPilotMigrationStorageServices } =
    await import('@/features/migration/wordpress-pilot/storage-services');
  const storageServices = createPilotMigrationStorageServices();

  return {
    authors: authorService,
    books: bookService,
    authorImages: storageServices.authorImages,
    bookCovers: storageServices.bookCovers,
    downloadImage: downloadRecoveryImage,
  };
}
