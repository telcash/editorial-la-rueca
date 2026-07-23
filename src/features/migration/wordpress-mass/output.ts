import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type { MassPlan } from './types';

export async function writeMassPlanOutputs(plan: MassPlan, outputDirectory: string) {
  await mkdir(outputDirectory, { recursive: true });

  const files: Array<[string, unknown]> = [
    ['mass-plan.json', plan],
    ['mass-authors.json', plan.authors],
    ['mass-books.json', plan.books],
    ['mass-relations.json', plan.relations],
    ['mass-editions.json', plan.editions],
    ['mass-author-images.json', plan.authorImages],
    ['mass-book-covers.json', plan.bookCovers],
    ['mass-conflicts.json', plan.conflicts],
    ['mass-manual-review.json', plan.manualReview],
    ['mass-summary.json', plan.summary],
    ['mass-decisions-template.json', plan.decisionsTemplate],
    ['redirect-candidates.json', plan.redirects],
  ];

  await Promise.all(
    files.map(([filename, data]) =>
      writeFile(path.join(outputDirectory, filename), `${JSON.stringify(data, null, 2)}\n`, 'utf8'),
    ),
  );

  return files.map(([filename]) => path.join(outputDirectory, filename));
}
