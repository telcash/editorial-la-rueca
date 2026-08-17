import path from 'node:path';

import { asc, eq, sql } from 'drizzle-orm';

import { initialAuthorTestimonials } from '../../../../data/author-testimonials.initial';
import { db } from '@/db';
import { authors, authorTestimonials, bookAuthors, books } from '@/db/schema';
import { normalizeQuoteFingerprint } from './normalize';
import { writeAuthorTestimonialsSeedOutputs } from './output';
import { planAuthorTestimonialsSeed } from './planner';
import { assertAuthorTestimonialsSeedApplyConfirmation } from './confirmation';
import {
  AUTHOR_TESTIMONIALS_SEED_DECISIONS_FILENAME,
  readAuthorTestimonialsSeedDecisions,
} from './decisions';
import type {
  AuthorTestimonialsSeedPlan,
  AuthorTestimonialsSeedResult,
  ExistingTestimonialFingerprint,
  SeedAuthorRow,
  SeedBookRow,
} from './types';

export interface RunAuthorTestimonialsSeedOptions {
  outputDirectory: string;
  mode: 'dry-run' | 'preflight' | 'apply';
  confirm?: string;
}

export interface RunAuthorTestimonialsSeedResult {
  outputDirectory: string;
  files: string[];
  plan: AuthorTestimonialsSeedPlan;
  result: AuthorTestimonialsSeedResult;
}

interface TableExistsRow {
  exists: boolean;
}

export async function runAuthorTestimonialsSeed({
  outputDirectory,
  mode,
  confirm,
}: RunAuthorTestimonialsSeedOptions): Promise<RunAuthorTestimonialsSeedResult> {
  if (mode === 'apply') {
    assertAuthorTestimonialsSeedApplyConfirmation(confirm);
  }

  const tableExists = await doesAuthorTestimonialsTableExist();
  const [bookRows, existingTestimonials, decisions] = await Promise.all([
    loadBooksWithAuthors(),
    tableExists ? loadExistingTestimonials() : Promise.resolve([]),
    readAuthorTestimonialsSeedDecisions(
      path.join(outputDirectory, AUTHOR_TESTIMONIALS_SEED_DECISIONS_FILENAME),
    ),
  ]);
  const authorRows = await loadActiveAuthorsWithBooks(bookRows);
  const plan = planAuthorTestimonialsSeed({
    dataset: initialAuthorTestimonials,
    authors: authorRows,
    books: bookRows,
    existingTestimonials,
    decisions,
    tableExists,
    mode,
  });
  const result = createInitialResult(plan);

  if (mode === 'apply') {
    if (!decisions) {
      throw new Error(
        `Apply bloqueado. Exporta y revisa primero ${path.join(outputDirectory, AUTHOR_TESTIMONIALS_SEED_DECISIONS_FILENAME)}.`,
      );
    }

    if (!tableExists) {
      throw new Error(
        'La tabla author_testimonials no existe. Aplica primero la migración 0006_yielding_jubilee.sql con npm run db:migrate.',
      );
    }

    const blockingConflicts = plan.conflicts.filter((conflict) => conflict.severity === 'error');

    if (blockingConflicts.length > 0) {
      throw new Error(
        `Apply bloqueado por ${blockingConflicts.length} conflicto(s). Revisa ${path.join(outputDirectory, 'review.html')}.`,
      );
    }

    await applyReadyTestimonials(plan, result);
  }

  const files = await writeAuthorTestimonialsSeedOutputs(outputDirectory, plan, result);

  return {
    outputDirectory,
    files,
    plan,
    result,
  };
}

async function doesAuthorTestimonialsTableExist(): Promise<boolean> {
  const result = await db.execute(
    sql<TableExistsRow>`select (to_regclass('public.author_testimonials') is not null) as "exists"`,
  );
  const rows = result as unknown as TableExistsRow[];

  return rows[0]?.exists === true;
}

async function loadBooksWithAuthors(): Promise<SeedBookRow[]> {
  const rows = await db
    .select({
      bookId: books.id,
      title: books.title,
      slug: books.slug,
      authorId: authors.id,
      authorName: authors.name,
      authorSlug: authors.slug,
    })
    .from(books)
    .leftJoin(bookAuthors, eq(bookAuthors.bookId, books.id))
    .leftJoin(authors, eq(authors.id, bookAuthors.authorId))
    .orderBy(asc(books.title), asc(bookAuthors.sortOrder), asc(authors.name));
  const booksById = new Map<string, SeedBookRow>();

  for (const row of rows) {
    const book = booksById.get(row.bookId) ?? {
      id: row.bookId,
      title: row.title,
      slug: row.slug,
      authors: [],
    };

    if (row.authorId && row.authorName && row.authorSlug) {
      book.authors.push({
        id: row.authorId,
        name: row.authorName,
        slug: row.authorSlug,
      });
    }

    booksById.set(row.bookId, book);
  }

  return [...booksById.values()];
}

async function loadActiveAuthorsWithBooks(bookRows: SeedBookRow[]): Promise<SeedAuthorRow[]> {
  const rows = await db
    .select({
      id: authors.id,
      name: authors.name,
      slug: authors.slug,
      photoUrl: authors.photoUrl,
    })
    .from(authors)
    .where(eq(authors.isArchived, false))
    .orderBy(asc(authors.name));

  return rows.map((author) => ({
    ...author,
    books: bookRows
      .filter((book) => book.authors.some((bookAuthor) => bookAuthor.id === author.id))
      .map((book) => ({
        id: book.id,
        title: book.title,
        slug: book.slug,
      })),
  }));
}

async function loadExistingTestimonials(): Promise<ExistingTestimonialFingerprint[]> {
  const rows = await db
    .select({
      authorId: authorTestimonials.authorId,
      quote: authorTestimonials.quote,
    })
    .from(authorTestimonials);

  return rows.map((row) => ({
    authorId: row.authorId,
    normalizedQuote: normalizeQuoteFingerprint(row.quote),
  }));
}

function createInitialResult(plan: AuthorTestimonialsSeedPlan): AuthorTestimonialsSeedResult {
  return {
    generatedAt: new Date().toISOString(),
    total: plan.summary.total,
    inserted: 0,
    alreadyExisting: plan.summary.alreadyExisting,
    manual: plan.summary.manualReview,
    failed: 0,
    createdIds: [],
  };
}

async function applyReadyTestimonials(
  plan: AuthorTestimonialsSeedPlan,
  result: AuthorTestimonialsSeedResult,
) {
  for (const item of plan.items) {
    if (item.status === 'SKIP_ALREADY_EXISTS') {
      continue;
    }

    if (item.status !== 'READY_TO_INSERT' || !item.input.authorId) {
      continue;
    }

    try {
      const [created] = await db
        .insert(authorTestimonials)
        .values({
          authorId: item.input.authorId,
          bookId: item.input.bookId,
          quote: item.input.quote,
          source: item.input.source,
          rating: item.input.rating,
          isPublished: item.input.isPublished,
          isFeatured: item.input.isFeatured,
          sortOrder: item.input.sortOrder,
        })
        .returning({ id: authorTestimonials.id });

      if (!created) {
        result.failed += 1;
        continue;
      }

      result.inserted += 1;
      result.createdIds.push(created.id);
    } catch {
      result.failed += 1;
    }
  }
}
