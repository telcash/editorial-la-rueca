import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  adjudicateBookCovers,
  baseImageFilename,
  equivalentIdentity,
  normalizeFilename,
  normalizeUrl,
} from './book-cover-adjudication';

describe('book cover adjudication', () => {
  it('rejects an author photo even when it is vertical', async () => {
    const fixture = await createFixture({
      diagnosisCandidates: [
        createCandidate({
          attachmentId: '10',
          filename: 'foto-ana-autora.jpg',
          width: 900,
          height: 1200,
          hasAuthorPhotoSignal: true,
        }),
      ],
      authorImages: [
        createAuthorImage({
          attachmentId: '10',
          filename: 'foto-ana-autora.jpg',
          confidence: 'high',
        }),
      ],
    });

    const adjudication = await adjudicateBookCovers(fixture);

    expect(adjudication.items[0]).toMatchObject({
      decision: 'ambiguous',
      hasAuthorPhotoConflict: true,
    });
    expect(adjudication.items[0]?.candidates[0]?.negativeSignals).toContain(
      'candidate_matches_author_photo',
    );
  });

  it('accepts a cover with keyword, title match and proper cover ratio', async () => {
    const fixture = await createFixture({
      diagnosisCandidates: [
        createCandidate({
          attachmentId: '20',
          filename: 'libro-uno-portada.jpg',
          width: 900,
          height: 1400,
          titleMatch: true,
        }),
      ],
    });

    const adjudication = await adjudicateBookCovers(fixture);

    expect(adjudication.items[0]).toMatchObject({
      decision: 'safe_book_cover',
      winnerGroupKey: 'attachment:20',
    });
  });

  it('does not accept two similarly scored candidates automatically', async () => {
    const fixture = await createFixture({
      diagnosisCandidates: [
        createCandidate({
          attachmentId: '20',
          filename: 'libro-uno-portada.jpg',
          titleMatch: true,
        }),
        createCandidate({ attachmentId: '21', filename: 'libro-uno-cover.jpg', titleMatch: true }),
      ],
    });

    const adjudication = await adjudicateBookCovers(fixture);

    expect(adjudication.items[0]?.decision).toBe('ambiguous');
    expect(adjudication.items[0]?.winnerGap).toBe(0);
  });

  it('compares WordPress size variants and URL query strings as equivalent images', () => {
    const left = {
      attachmentId: null,
      normalizedUrl: normalizeUrl('http://example.com/wp/image-150x150.jpg?size=1'),
      normalizedFilename: normalizeFilename('image-150x150.jpg'),
      baseFilename: baseImageFilename(normalizeFilename('image-150x150.jpg')),
    };
    const right = {
      attachmentId: null,
      normalizedUrl: normalizeUrl('https://example.com/wp/image.jpg'),
      normalizedFilename: normalizeFilename('image.jpg'),
      baseFilename: baseImageFilename(normalizeFilename('image.jpg')),
    };

    expect(equivalentIdentity(left, right)).toBe(true);
    expect(left.normalizedUrl).toBe('https://example.com/wp/image-150x150.jpg');
  });

  it('penalizes filename matches with the author name', async () => {
    const fixture = await createFixture({
      authorName: 'Ana Autora',
      diagnosisCandidates: [
        createCandidate({
          attachmentId: '30',
          filename: 'ana-autora-portada.jpg',
          width: 900,
          height: 1400,
        }),
      ],
    });

    const adjudication = await adjudicateBookCovers(fixture);

    expect(adjudication.items[0]?.candidates[0]?.negativeSignals).toContain(
      'filename_matches_author_name',
    );
    expect(adjudication.items[0]?.decision).toBe('ambiguous');
  });

  it('rewards title matches and keeps decisions deterministic', async () => {
    const fixture = await createFixture({
      diagnosisCandidates: [
        createCandidate({
          attachmentId: '20',
          filename: 'libro-uno-portada.jpg',
          width: 900,
          height: 1400,
          titleMatch: true,
        }),
      ],
    });

    const first = await adjudicateBookCovers(fixture);
    const second = await adjudicateBookCovers(fixture);

    expect(first.items[0]?.candidates[0]?.positiveSignals).toContain(
      'filename_or_metadata_matches_title',
    );
    expect(second.items[0]).toEqual(first.items[0]);
  });
});

interface FixtureOptions {
  authorName?: string;
  diagnosisCandidates: unknown[];
  authorImages?: unknown[];
}

async function createFixture(options: FixtureOptions) {
  const directory = await mkdtemp(path.join(tmpdir(), 'rueca-book-cover-adjudication-'));
  const massDirectory = path.join(directory, 'mass');
  const auditDirectory = path.join(directory, 'audit');
  const imageRecoveryDirectory = path.join(massDirectory, 'image-recovery');
  const applyDirectory = path.join(massDirectory, 'apply');

  await mkdir(imageRecoveryDirectory, { recursive: true });
  await mkdir(applyDirectory, { recursive: true });
  await mkdir(auditDirectory, { recursive: true });
  await writeJson(path.join(imageRecoveryDirectory, 'book-cover-diagnosis.json'), [
    {
      candidateKey: 'book:uno',
      sourceWpPostId: '1',
      title: 'Libro Uno',
      candidates: options.diagnosisCandidates,
    },
  ]);
  await writeJson(path.join(imageRecoveryDirectory, 'recovery-plan.json'), {
    items: [],
  });
  await writeJson(path.join(applyDirectory, 'author-images.json'), options.authorImages ?? []);
  await writeJson(path.join(applyDirectory, 'book-covers.json'), []);
  await writeJson(path.join(applyDirectory, 'manifest.json'), {
    entries: [],
  });
  await writeFile(
    path.join(auditDirectory, 'books-candidates.csv'),
    [
      'candidateKey,sourceWpPostId,title,sourceAuthorTitle,sourceAuthorSlug',
      `book:uno,1,Libro Uno,${options.authorName ?? 'Otra Persona'},otra-persona`,
    ].join('\n'),
    'utf8',
  );

  return { massDirectory, auditDirectory };
}

function createCandidate(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    origin: 'filename_title_match',
    attachmentId: '20',
    url: 'https://example.com/libro-uno-portada.jpg',
    filename: 'libro-uno-portada.jpg',
    width: 900,
    height: 1400,
    ratio: 0.643,
    titleMatch: false,
    slugMatch: false,
    isbnMatch: false,
    hasAuthorPhotoSignal: false,
    explanation: [],
    ...overrides,
  };
}

function createAuthorImage(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    candidateKey: 'author:1',
    entityType: 'author',
    sourceWpPostId: '1',
    attachmentId: '10',
    filename: 'foto-ana-autora.jpg',
    url: 'https://example.com/foto-ana-autora.jpg',
    status: 'READY',
    action: 'UPLOAD',
    confidence: 'high',
    reasons: [],
    ...overrides,
  };
}

async function writeJson(filePath: string, data: unknown) {
  await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}
