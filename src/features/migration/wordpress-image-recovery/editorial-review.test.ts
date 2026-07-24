import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  applyEditorialReviewDecision,
  createEditorialReview,
  createInitialEditorialReviewDecision,
  restoreEditorialReviewDecisions,
  selectEditorialReviewImage,
  serializeEditorialReviewDecisions,
} from './editorial-review';
import { writeEditorialReviewOutputs } from './editorial-review-output';

describe('editorial review', () => {
  it('creates initial approved, manual and rejected review groups', async () => {
    const fixture = await createFixture();

    const review = await createEditorialReview({ massDirectory: fixture.massDirectory });

    expect(review.statistics).toMatchObject({
      total: 3,
      approved: 1,
      approvedWithAlgorithm: 1,
      manuallyCorrected: 0,
      manual: 1,
      rejected: 1,
    });
    expect(review.approved[0]?.candidateKey).toBe('book:safe');
    expect(review.manual[0]?.candidateKey).toBe('book:ambiguous');
    expect(review.rejected[0]?.candidateKey).toBe('book:missing');
  });

  it('writes CSV, split JSON files and an autosaving HTML review', async () => {
    const fixture = await createFixture();
    const review = await createEditorialReview({ massDirectory: fixture.massDirectory });

    const files = await writeEditorialReviewOutputs(review, fixture.outputDirectory);
    const html = await readFile(
      path.join(fixture.outputDirectory, 'editorial-review.html'),
      'utf8',
    );
    const csv = await readFile(path.join(fixture.outputDirectory, 'editorial-review.csv'), 'utf8');

    expect(files.map((file) => path.basename(file))).toEqual([
      'editorial-review.json',
      'editorial-review.csv',
      'approved.json',
      'rejected.json',
      'manual.json',
      'editorial-review.html',
    ]);
    expect(html).toContain('localStorage');
    expect(html).toContain('EXPORTAR REVISIÓN');
    expect(html).toContain('IMPORTAR REVISIÓN');
    expect(html).toContain('data-image-key="attachment:1"');
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain('data-decision="approved"');
    expect(html).toContain('data-decision="rejected"');
    expect(html).toContain('data-decision="manual"');
    expect(csv).toContain('"book:safe"');
  });

  it('selects the algorithm suggestion as the initial image', async () => {
    const fixture = await createFixture();
    const review = await createEditorialReview({ massDirectory: fixture.massDirectory });
    const entry = review.entries.find((item) => item.candidateKey === 'book:safe');

    expect(entry).toBeDefined();

    const decision = createInitialEditorialReviewDecision(entry!);

    expect(decision.selectedImage?.groupKey).toBe('attachment:1');
    expect(decision.algorithmSuggestion?.groupKey).toBe('attachment:1');
    expect(decision.selectionSource).toBe('algorithm');
  });

  it('selects an alternative image and approves it as an editorial manual correction', async () => {
    const fixture = await createFixture();
    const review = await createEditorialReview({ massDirectory: fixture.massDirectory });
    const entry = review.entries.find((item) => item.candidateKey === 'book:safe');

    expect(entry).toBeDefined();

    const initialDecision = createInitialEditorialReviewDecision(entry!);
    const alternative = entry!.candidateImages.find((image) => image.groupKey === 'attachment:2');

    expect(alternative).toBeDefined();

    const selected = selectEditorialReviewImage(initialDecision, alternative!);
    const approved = applyEditorialReviewDecision(selected, 'approved');

    expect(approved.selectedImage?.groupKey).toBe('attachment:2');
    expect(approved.algorithmSuggestion?.groupKey).toBe('attachment:1');
    expect(approved.decision).toBe('approved');
    expect(approved.selectionSource).toBe('editorial-manual');
  });

  it('changes the selected image without duplicating the decision record', async () => {
    const fixture = await createFixture();
    const review = await createEditorialReview({ massDirectory: fixture.massDirectory });
    const entry = review.entries.find((item) => item.candidateKey === 'book:safe');

    expect(entry).toBeDefined();

    const initialDecision = createInitialEditorialReviewDecision(entry!);
    const alternative = entry!.candidateImages.find((image) => image.groupKey === 'attachment:2');
    const decisionsByKey = new Map([[initialDecision.candidateKey, initialDecision]]);

    decisionsByKey.set(
      initialDecision.candidateKey,
      selectEditorialReviewImage(initialDecision, alternative!),
    );
    decisionsByKey.set(
      initialDecision.candidateKey,
      selectEditorialReviewImage(
        decisionsByKey.get(initialDecision.candidateKey)!,
        entry!.candidateImages[0]!,
      ),
    );

    expect(decisionsByKey.size).toBe(1);
    expect(decisionsByKey.get('book:safe')?.selectedImage?.groupKey).toBe('attachment:1');
  });

  it('stores rejection and manual review as explicit decisions without a selected image', async () => {
    const fixture = await createFixture();
    const review = await createEditorialReview({ massDirectory: fixture.massDirectory });
    const entry = review.entries.find((item) => item.candidateKey === 'book:safe');

    expect(entry).toBeDefined();

    const initialDecision = createInitialEditorialReviewDecision(entry!);
    const rejected = applyEditorialReviewDecision(initialDecision, 'rejected');
    const manual = applyEditorialReviewDecision(initialDecision, 'manual');

    expect(rejected).toMatchObject({
      decision: 'rejected',
      selectedImage: null,
      selectionSource: 'none',
    });
    expect(manual).toMatchObject({
      decision: 'manual',
      selectedImage: null,
      selectionSource: 'none',
    });
  });

  it('changes an existing decision and serializes the selected image', async () => {
    const fixture = await createFixture();
    const review = await createEditorialReview({ massDirectory: fixture.massDirectory });
    const entry = review.entries.find((item) => item.candidateKey === 'book:safe');

    expect(entry).toBeDefined();

    const initialDecision = createInitialEditorialReviewDecision(entry!);
    const rejected = applyEditorialReviewDecision(initialDecision, 'rejected');
    const approved = applyEditorialReviewDecision(
      selectEditorialReviewImage(rejected, entry!.candidateImages[0]!),
      'approved',
    );
    const serialized = serializeEditorialReviewDecisions([approved], '2026-07-24T00:00:00.000Z');

    expect(serialized.decisions).toHaveLength(1);
    expect(serialized.decisions[0]).toMatchObject({
      candidateKey: 'book:safe',
      decision: 'approved',
      selectionSource: 'algorithm',
    });
    expect(serialized.decisions[0]?.selectedImage?.groupKey).toBe('attachment:1');
  });

  it('restores imported editorial decisions', async () => {
    const fixture = await createFixture();
    const review = await createEditorialReview({ massDirectory: fixture.massDirectory });
    const entry = review.entries.find((item) => item.candidateKey === 'book:safe');
    const alternative = entry?.candidateImages.find((image) => image.groupKey === 'attachment:2');

    expect(entry).toBeDefined();
    expect(alternative).toBeDefined();

    const restored = restoreEditorialReviewDecisions(review.entries, {
      decisions: [
        {
          candidateKey: 'book:safe',
          decision: 'approved',
          algorithmSuggestion: entry!.algorithmSuggestion,
          selectedImage: alternative,
          selectionSource: 'editorial-manual',
          updatedAt: '2026-07-24T00:00:00.000Z',
        },
      ],
    });

    const decision = restored.find((item) => item.candidateKey === 'book:safe');

    expect(decision).toMatchObject({
      decision: 'approved',
      selectionSource: 'editorial-manual',
    });
    expect(decision?.selectedImage?.groupKey).toBe('attachment:2');
  });
});

async function createFixture() {
  const directory = await mkdtemp(path.join(tmpdir(), 'rueca-editorial-review-'));
  const massDirectory = path.join(directory, 'mass');
  const outputDirectory = path.join(massDirectory, 'image-recovery');

  await mkdir(outputDirectory, { recursive: true });
  await writeJson(path.join(outputDirectory, 'book-cover-adjudication.json'), [
    createAdjudicationItem('book:safe', 'safe_book_cover'),
    createAdjudicationItem('book:ambiguous', 'ambiguous'),
    createAdjudicationItem('book:missing', 'no_safe_candidate', []),
  ]);
  await writeJson(path.join(outputDirectory, 'safe-book-covers.json'), [
    createAdjudicationItem('book:safe', 'safe_book_cover'),
  ]);
  await writeJson(path.join(outputDirectory, 'ambiguous-book-covers.json'), [
    createAdjudicationItem('book:ambiguous', 'ambiguous'),
  ]);

  return { massDirectory, outputDirectory };
}

function createAdjudicationItem(
  candidateKey: string,
  decision: string,
  candidates = [
    createCandidate(),
    createCandidateWith({
      groupKey: 'attachment:2',
      filenames: ['alternative-cover.jpg'],
      urls: ['https://example.com/alternative-cover.jpg'],
      isWinner: false,
    }),
  ],
) {
  return {
    candidateKey,
    sourceWpPostId: '1',
    title: candidateKey,
    author: 'Autora',
    decision,
    winnerGroupKey: candidates[0]?.groupKey ?? null,
    winnerGap: candidates.length > 0 ? 40 : null,
    hasAuthorPhotoConflict: false,
    hasCoverKeyword: true,
    hasTitleMatch: true,
    decisionReasons: ['Motivo editorial'],
    candidates,
  };
}

function createCandidate() {
  return createCandidateWith({
    groupKey: 'attachment:1',
    filenames: ['cover.jpg'],
    urls: ['https://example.com/cover.jpg'],
    isWinner: true,
  });
}

function createCandidateWith(params: {
  groupKey: string;
  filenames: string[];
  urls: string[];
  isWinner: boolean;
}) {
  return {
    groupKey: params.groupKey,
    origins: ['filename_title_match'],
    attachmentIds: [params.groupKey.replace('attachment:', '')],
    urls: params.urls,
    filenames: params.filenames,
    width: 900,
    height: 1400,
    ratio: 0.643,
    positiveCoverScore: 90,
    negativeAuthorScore: 0,
    finalScore: 90,
    positiveSignals: ['filename_has_cover_keyword'],
    negativeSignals: [],
    discardReasons: [],
    isEquivalentToAuthorPhoto: false,
    isWinner: params.isWinner,
    gapToNextCandidate: 40,
  };
}

async function writeJson(filePath: string, data: unknown) {
  await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}
