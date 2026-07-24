import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { analyzeImageRecovery, extractImageUrlsFromHtml } from './analyzer';
import {
  diagnoseBookCovers,
  extractImageUrlsFromGutenbergBlocks,
  extractImageUrlsFromSerializedAcf,
  extractImageUrlsFromShortcodes,
} from './book-cover-diagnosis';
import { runImageRecovery } from './runner';

describe('analyzeImageRecovery', () => {
  it('plans IMAGE_TOO_LARGE resize with author limits', async () => {
    const fixture = await createFixture({
      manifestEntries: [
        createImageManifestEntry({
          candidateKey: 'author:1',
          entityType: 'author_image',
          status: 'partial',
          sourceMetadata: { migrationErrorCode: 'IMAGE_TOO_LARGE' },
        }),
      ],
      authorImages: [
        createPlannedAuthorImage({
          candidateKey: 'author:1',
          filename: 'foto-autora.jpg',
          url: 'https://example.com/foto-autora.jpg',
        }),
      ],
    });

    const plan = await analyzeImageRecovery({
      paths: fixture,
      mode: 'dry-run',
      batchSize: 10,
    });

    expect(plan.items[0]).toMatchObject({
      category: 'technical_retry',
      decision: 'retry_with_transform',
      transform: {
        required: true,
        maxWidth: 1600,
        maxHeight: 1600,
        quality: 82,
        correctExifOrientation: true,
      },
    });
  });

  it('detects MIME from filename', async () => {
    const fixture = await createFixture({
      manifestEntries: [
        createImageManifestEntry({
          candidateKey: 'author:1',
          entityType: 'author_image',
          status: 'manual_action_required',
        }),
      ],
      authorImages: [
        createPlannedAuthorImage({
          candidateKey: 'author:1',
          attachmentId: null,
          filename: 'foto-autora.webp',
          url: 'https://example.com/foto-autora.webp',
        }),
      ],
    });

    const plan = await analyzeImageRecovery({
      paths: fixture,
      mode: 'analyze',
      batchSize: 10,
    });

    expect(plan.items[0]?.candidate?.mimeType).toBe('image/webp');
  });

  it('assigns a safe author photo from _thumbnail_id signals', async () => {
    const fixture = await createFixture({
      manifestEntries: [
        createImageManifestEntry({
          candidateKey: 'author:1',
          entityType: 'author_image',
          status: 'manual_action_required',
        }),
      ],
      authorImages: [
        createPlannedAuthorImage({
          candidateKey: 'author:1',
          filename: 'foto-ana.jpg',
          url: 'https://example.com/foto-ana.jpg',
        }),
      ],
    });

    const plan = await analyzeImageRecovery({
      paths: fixture,
      mode: 'dry-run',
      batchSize: 10,
    });

    expect(plan.items[0]).toMatchObject({
      category: 'safe_author_photo',
      decision: 'upload_author_photo',
    });
  });

  it('rejects strong author photo signal as automatic book cover', async () => {
    const fixture = await createFixture({
      manifestEntries: [
        createImageManifestEntry({
          candidateKey: 'book:uno',
          entityType: 'book_cover',
          status: 'manual_action_required',
        }),
      ],
      bookCovers: [
        createPlannedBookCover({
          filename: 'foto-autor-libro-uno.jpg',
          url: 'https://example.com/foto-autor-libro-uno.jpg',
          reasons: ['filename contiene el titulo del libro'],
        }),
      ],
    });

    const plan = await analyzeImageRecovery({
      paths: fixture,
      mode: 'dry-run',
      batchSize: 10,
    });

    expect(plan.items[0]).toMatchObject({
      category: 'ambiguous',
      decision: 'manual_review',
    });
  });

  it('extracts dfiFeatured and HTML images from WXR', async () => {
    const fixture = await createFixture({
      manifestEntries: [
        createImageManifestEntry({
          candidateKey: 'book:uno',
          entityType: 'book_cover',
          status: 'manual_action_required',
        }),
      ],
      xml: createWxrFixture(),
    });

    const plan = await analyzeImageRecovery({
      paths: fixture,
      mode: 'analyze',
      batchSize: 10,
    });

    expect(plan.items[0]?.candidate).toMatchObject({
      attachmentId: '10',
      origin: 'dfiFeatured',
    });
    expect(extractImageUrlsFromHtml('<p><img src="https://example.com/cover.jpg"></p>')).toEqual([
      'https://example.com/cover.jpg',
    ]);
  });

  it('matches filename and title for safe book cover', async () => {
    const fixture = await createFixture({
      manifestEntries: [
        createImageManifestEntry({
          candidateKey: 'book:uno',
          entityType: 'book_cover',
          status: 'manual_action_required',
        }),
      ],
      bookCoverBestMatch: [
        {
          bookCandidateKey: 'book:uno',
          bookTitle: 'Libro Uno',
          bestCandidate: {
            attachmentId: '10',
            attachmentUrl: 'https://example.com/libro-uno-portada.jpg',
            filename: 'libro-uno-portada.jpg',
            attachmentTitle: 'Libro Uno portada',
            width: 1200,
            height: 1800,
            confidence: 'high',
            score: 120,
            reasons: 'filename contiene el titulo del libro',
          },
          confidence: 'high',
          alternatives: [],
        },
      ],
    });

    const plan = await analyzeImageRecovery({
      paths: fixture,
      mode: 'dry-run',
      batchSize: 10,
    });

    expect(plan.items[0]).toMatchObject({
      category: 'safe_book_cover',
      decision: 'upload_book_cover',
    });
  });

  it('does not overwrite an image already applied in manifest', async () => {
    const fixture = await createFixture({
      manifestEntries: [
        createImageManifestEntry({
          candidateKey: 'author:1',
          entityType: 'author_image',
          status: 'applied',
          checkpoint: 'author_image_uploaded',
        }),
      ],
      authorImages: [createPlannedAuthorImage({ candidateKey: 'author:1' })],
    });

    const plan = await analyzeImageRecovery({
      paths: fixture,
      mode: 'dry-run',
      batchSize: 10,
    });

    expect(plan.items).toHaveLength(0);
    expect(plan.result.skippedAlreadyApplied).toBe(1);
  });

  it('writes a dry-run manifest when resume is requested without applying changes', async () => {
    const fixture = await createFixture({
      manifestEntries: [
        createImageManifestEntry({
          candidateKey: 'author:1',
          entityType: 'author_image',
          status: 'manual_action_required',
        }),
      ],
      authorImages: [createPlannedAuthorImage({ candidateKey: 'author:1' })],
    });

    const result = await runImageRecovery({
      analyze: false,
      dryRun: true,
      preflight: false,
      apply: false,
      diagnoseBookCovers: false,
      adjudicateBookCovers: false,
      editorialReview: false,
      resume: true,
      batchSize: 5,
      massDirectory: path.dirname(fixture.massApplyDirectory),
      auditDirectory: fixture.auditDirectory,
    });

    expect(result.mode).toBe('image-recovery-dry-run');

    if (result.mode !== 'image-recovery-dry-run') {
      throw new Error('Expected Stage 4 dry-run mode.');
    }

    expect(result.plan.mode).toBe('dry-run');
    expect(result.plan.result.authorPhotos.safeReady).toBe(1);
    expect(result.files.map((file) => path.basename(file))).toContain('manifest.json');
  });

  it('keeps apply blocked when editorial review decisions are missing', async () => {
    const fixture = await createFixture({
      manifestEntries: [],
      writeEditorialDecisions: false,
    });

    await expect(
      runImageRecovery({
        analyze: false,
        dryRun: false,
        preflight: false,
        apply: true,
        diagnoseBookCovers: false,
        adjudicateBookCovers: false,
        editorialReview: false,
        resume: false,
        confirm: 'IMAGE_RECOVERY',
        batchSize: 5,
        massDirectory: path.dirname(fixture.massApplyDirectory),
        auditDirectory: fixture.auditDirectory,
      }),
    ).rejects.toThrow('EDITORIAL_REVIEW_DECISIONS_MISSING');
  });

  it('diagnoses only book no_candidate entries', async () => {
    const fixture = await createFixture({
      manifestEntries: [],
      recoveryPlanItems: [
        createRecoveryBookItem({ candidateKey: 'book:uno', category: 'no_candidate' }),
        createRecoveryBookItem({ candidateKey: 'book:dos', category: 'ambiguous' }),
        createRecoveryBookItem({
          candidateKey: 'author:1',
          entityType: 'author',
          category: 'no_candidate',
        }),
      ],
    });

    const diagnosis = await diagnoseBookCovers({
      massDirectory: path.dirname(fixture.massApplyDirectory),
      auditDirectory: fixture.auditDirectory,
    });

    expect(diagnosis.items).toHaveLength(1);
    expect(diagnosis.items[0]?.candidateKey).toBe('book:uno');
  });

  it('extracts shortcode, Gutenberg and serialized ACF image URLs for diagnosis', () => {
    expect(
      extractImageUrlsFromShortcodes('[gallery src="https://example.com/portada.jpg"]').map(
        (candidate) => candidate.url,
      ),
    ).toEqual(['https://example.com/portada.jpg']);
    expect(
      extractImageUrlsFromGutenbergBlocks(
        '<!-- wp:image {"url":"https://example.com/bloque.webp"} --><figure></figure><!-- /wp:image -->',
      ).map((candidate) => candidate.url),
    ).toEqual(['https://example.com/bloque.webp']);
    expect(
      extractImageUrlsFromSerializedAcf([
        {
          key: 'field_cover_image',
          value: 'a:1:{s:3:"url";s:31:"https://example.com/acf.png";}',
        },
      ]).map((candidate) => candidate.url),
    ).toEqual(['https://example.com/acf.png']);
  });
});

interface FixtureOptions {
  manifestEntries: unknown[];
  authorImages?: unknown[];
  bookCovers?: unknown[];
  bookCoverBestMatch?: unknown[];
  recoveryPlanItems?: unknown[];
  xml?: string;
  writeEditorialDecisions?: boolean;
}

async function createFixture(options: FixtureOptions) {
  const directory = await mkdtemp(path.join(tmpdir(), 'rueca-image-recovery-'));
  const massApplyDirectory = path.join(directory, 'mass', 'apply');
  const auditDirectory = path.join(directory, 'audit');
  const outputDirectory = path.join(directory, 'mass', 'image-recovery');
  const xmlInputPath = options.xml ? path.join(directory, 'export.xml') : undefined;

  await mkdir(massApplyDirectory, { recursive: true });
  await mkdir(auditDirectory, { recursive: true });
  await writeJson(path.join(massApplyDirectory, 'manifest.json'), {
    entries: options.manifestEntries,
  });
  await writeJson(path.join(massApplyDirectory, 'author-images.json'), options.authorImages ?? []);
  await writeJson(path.join(massApplyDirectory, 'book-covers.json'), options.bookCovers ?? []);
  await writeFile(
    path.join(auditDirectory, 'attachments-candidates.csv'),
    [
      'wpPostId,title,slug,url,parentId,mimeType,width,height,attachedFile',
      '10,Libro Uno portada,libro-uno-portada,https://example.com/libro-uno-portada.jpg,,image/jpeg,1200,1800,libro-uno-portada.jpg',
    ].join('\n'),
    'utf8',
  );
  await writeFile(
    path.join(auditDirectory, 'authors-candidates.csv'),
    ['candidateKey,sourceWpPostId,name,thumbnailId,imageFieldId', 'author:1,1,Ana Autora,10,'].join(
      '\n',
    ),
    'utf8',
  );
  await writeFile(
    path.join(auditDirectory, 'books-candidates.csv'),
    ['candidateKey,sourceWpPostId,title,thumbnailId', 'book:uno,1,Libro Uno,10'].join('\n'),
    'utf8',
  );
  await writeJson(
    path.join(auditDirectory, 'book-cover-best-match.json'),
    options.bookCoverBestMatch ?? [],
  );
  await writeJson(path.join(massApplyDirectory, 'editions.json'), []);
  await writeJson(path.join(auditDirectory, 'migration-report.json'), {
    woocommerceAudit: {
      products: [],
    },
  });
  await mkdir(outputDirectory, { recursive: true });
  await writeJson(path.join(outputDirectory, 'recovery-plan.json'), {
    items: options.recoveryPlanItems ?? [],
  });
  if (options.writeEditorialDecisions !== false) {
    await writeJson(path.join(outputDirectory, 'editorial-review-decisions.json'), {
      decisions: [],
    });
  }

  if (xmlInputPath && options.xml) {
    await writeFile(xmlInputPath, options.xml, 'utf8');
  }

  return { massApplyDirectory, auditDirectory, outputDirectory, xmlInputPath };
}

function createImageManifestEntry(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    candidateKey: 'author:1',
    entityType: 'author_image',
    sourceWpPostId: '1',
    targetId: '11111111-1111-4111-8111-111111111111',
    status: 'manual_action_required',
    checkpoint: 'manual_action_required',
    sourceMetadata: {},
    ...overrides,
  };
}

function createPlannedAuthorImage(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    candidateKey: 'author:1',
    entityType: 'author',
    sourceWpPostId: '1',
    attachmentId: '10',
    filename: 'foto-ana.jpg',
    url: 'https://example.com/foto-ana.jpg',
    status: 'MANUAL_REVIEW',
    action: 'MANUAL_REVIEW',
    confidence: 'low',
    reasons: ['_thumbnail_id no tiene evidencias fuertes de foto de autor.'],
    ...overrides,
  };
}

function createPlannedBookCover(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    candidateKey: 'book:uno',
    entityType: 'book',
    sourceWpPostId: '1',
    attachmentId: '10',
    filename: 'libro-uno-portada.jpg',
    url: 'https://example.com/libro-uno-portada.jpg',
    status: 'MANUAL_REVIEW',
    action: 'MANUAL_REVIEW',
    confidence: 'low',
    reasons: ['filename contiene el titulo del libro'],
    ...overrides,
  };
}

function createRecoveryBookItem(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    entityType: 'book',
    candidateKey: 'book:uno',
    sourceWpPostId: '1',
    title: 'Libro Uno',
    category: 'no_candidate',
    ...overrides,
  };
}

function createWxrFixture() {
  return `<?xml version="1.0" encoding="UTF-8" ?>
<rss>
<channel>
<wp:wxr_version>1.2</wp:wxr_version>
<item>
<title>Libro Uno</title>
<wp:post_id>1</wp:post_id>
<wp:post_name>libro-uno</wp:post_name>
<wp:post_type>autor</wp:post_type>
<content:encoded><![CDATA[<p><img src="https://example.com/html-cover.jpg"></p>]]></content:encoded>
<wp:postmeta><wp:meta_key>dfiFeatured</wp:meta_key><wp:meta_value>10</wp:meta_value></wp:postmeta>
</item>
</channel>
</rss>`;
}

async function writeJson(filePath: string, data: unknown) {
  await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}
