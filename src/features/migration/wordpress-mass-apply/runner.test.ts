import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { runMassMigration } from './runner';
import type { MassApplyManifest } from './types';

describe('runMassMigration protections', () => {
  it('requires exact MASS_MIGRATION confirmation for apply', async () => {
    await expect(
      runMassMigration({
        massDirectory: './migration/mass',
        dryRun: false,
        preflight: false,
        apply: true,
        confirm: 'WRONG',
        confirmBackup: true,
        resume: false,
        batchSize: 20,
      }),
    ).rejects.toThrow('--apply --confirm MASS_MIGRATION');
  });

  it('requires backup confirmation for apply', async () => {
    await expect(
      runMassMigration({
        massDirectory: './migration/mass',
        dryRun: false,
        preflight: false,
        apply: true,
        confirm: 'MASS_MIGRATION',
        confirmBackup: false,
        resume: false,
        batchSize: 20,
      }),
    ).rejects.toThrow('--confirm-backup');
  });

  it('aborts apply without --resume when a previous manifest has applied operations', async () => {
    const massDirectory = await createMassFixture();
    await writeManifest(massDirectory, {
      planFingerprint: 'previous-fingerprint',
      entries: [
        {
          candidateKey: 'author:1',
          entityType: 'author',
          sourceWpPostId: '1',
          targetId: '11111111-1111-4111-8111-111111111111',
          status: 'applied',
          checkpoint: 'author_created',
          createdAt: '2026-07-23T00:00:00.000Z',
          updatedAt: '2026-07-23T00:00:00.000Z',
          warnings: [],
          sourceMetadata: {},
          preexisting: false,
        },
      ],
    });

    await expect(
      runMassMigration({
        massDirectory,
        dryRun: false,
        preflight: false,
        apply: true,
        confirm: 'MASS_MIGRATION',
        confirmBackup: true,
        resume: false,
        batchSize: 20,
      }),
    ).rejects.toThrow('Usa --resume');
  });

  it('aborts --resume when no previous manifest exists', async () => {
    const massDirectory = await createMassFixture();

    await expect(
      runMassMigration({
        massDirectory,
        dryRun: false,
        preflight: false,
        apply: true,
        confirm: 'MASS_MIGRATION',
        confirmBackup: true,
        resume: true,
        batchSize: 20,
      }),
    ).rejects.toThrow('No existe manifest previo');
  });

  it('aborts --resume when the previous manifest fingerprint is incompatible', async () => {
    const massDirectory = await createMassFixture();
    await writeManifest(massDirectory, {
      planFingerprint: 'incompatible-fingerprint',
      entries: [],
    });

    await expect(
      runMassMigration({
        massDirectory,
        dryRun: false,
        preflight: false,
        apply: true,
        confirm: 'MASS_MIGRATION',
        confirmBackup: true,
        resume: true,
        batchSize: 20,
      }),
    ).rejects.toThrow('fingerprint');
  });
});

async function createMassFixture() {
  const directory = await mkdtemp(path.join(tmpdir(), 'rueca-mass-runner-'));
  const author = {
    candidateKey: 'author:1',
    sourceWpPostId: '1',
    action: 'AUTO_CREATE',
    status: 'READY',
    input: {
      name: 'Autora Uno',
      slug: 'autora-uno',
      shortBio: null,
      biography: null,
      photoUrl: null,
      websiteUrl: null,
      instagramUrl: null,
      facebookUrl: null,
      country: null,
      isFeatured: false,
      isPublished: false,
      sortOrder: 0,
    },
    blockingReasons: [],
    warnings: [],
    resolvedDependencies: {},
    sourceMetadata: {},
  };
  const book = {
    candidateKey: 'book:uno',
    sourceWpPostId: '1',
    action: 'AUTO_CREATE',
    status: 'READY',
    input: {
      title: 'Libro Uno',
      subtitle: null,
      slug: 'libro-uno',
      description: null,
      excerpt: null,
      coverUrl: null,
      originalPublicationDate: null,
      language: null,
      isFeatured: false,
      isPublished: false,
      sortOrder: 0,
      metaTitle: null,
      metaDescription: null,
      canonicalUrl: null,
      authorIds: [],
      categoryIds: [],
      editions: [],
    },
    blockingReasons: [],
    warnings: [],
    resolvedDependencies: {},
    sourceMetadata: {},
  };
  const relation = {
    bookCandidateKey: 'book:uno',
    authorCandidateKey: 'author:1',
    sourceWpPostId: '1',
    action: 'AUTO_CREATE',
    status: 'READY',
    confidence: 'high',
    reason: 'fixture',
    blockingReasons: [],
    warnings: [],
    resolvedDependencies: {},
  };

  await Promise.all([
    writeJson(path.join(directory, 'mass-authors.json'), [author]),
    writeJson(path.join(directory, 'mass-books.json'), [book]),
    writeJson(path.join(directory, 'mass-relations.json'), [relation]),
    writeJson(path.join(directory, 'mass-author-images.json'), []),
    writeJson(path.join(directory, 'mass-book-covers.json'), []),
  ]);

  return directory;
}

async function writeManifest(
  massDirectory: string,
  overrides: Pick<MassApplyManifest, 'planFingerprint' | 'entries'>,
) {
  const applyDirectory = path.join(massDirectory, 'apply');
  await mkdir(applyDirectory, { recursive: true });
  await writeJson(path.join(applyDirectory, 'manifest.json'), {
    generatedAt: '2026-07-23T00:00:00.000Z',
    mode: 'apply',
    currentBatchIndex: 0,
    completedBatches: [],
    ...overrides,
  });
}

async function writeJson(filePath: string, data: unknown) {
  await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}
