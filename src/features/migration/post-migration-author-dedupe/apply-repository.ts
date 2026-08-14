import 'server-only';

import { and, eq, inArray } from 'drizzle-orm';

import { db } from '@/db';
import { authors, bookAuthors, books } from '@/db/schema';
import type {
  AuthorDedupeApplyExecutionStats,
  AuthorDedupeApplyGroupPlan,
  AuthorDedupeAuthorSnapshot,
  AuthorDedupeRelationSnapshot,
} from './apply-types';

export interface AuthorDedupeApplyRepository {
  readSnapshot(authorIds: string[]): Promise<{
    authors: AuthorDedupeAuthorSnapshot[];
    relations: AuthorDedupeRelationSnapshot[];
  }>;
  readAuthorsBySlugs(slugs: string[]): Promise<AuthorDedupeAuthorSnapshot[]>;
  executeGroupMerge(group: AuthorDedupeApplyGroupPlan): Promise<AuthorDedupeApplyExecutionStats>;
}

export const authorDedupeApplyRepository: AuthorDedupeApplyRepository = {
  async readSnapshot(authorIds) {
    const uniqueAuthorIds = [...new Set(authorIds)];

    if (uniqueAuthorIds.length === 0) {
      return {
        authors: [],
        relations: [],
      };
    }

    const [authorRows, relationRows] = await Promise.all([
      db.select().from(authors).where(inArray(authors.id, uniqueAuthorIds)),
      db
        .select({
          bookId: bookAuthors.bookId,
          authorId: bookAuthors.authorId,
          sortOrder: bookAuthors.sortOrder,
          createdAt: bookAuthors.createdAt,
          bookTitle: books.title,
          bookSlug: books.slug,
        })
        .from(bookAuthors)
        .innerJoin(books, eq(books.id, bookAuthors.bookId))
        .where(inArray(bookAuthors.authorId, uniqueAuthorIds)),
    ]);

    return {
      authors: authorRows.map(toAuthorSnapshot),
      relations: relationRows.map((relation) => ({
        bookId: relation.bookId,
        authorId: relation.authorId,
        sortOrder: relation.sortOrder,
        createdAt: relation.createdAt.toISOString(),
        bookTitle: relation.bookTitle,
        bookSlug: relation.bookSlug,
        bookExists: true,
      })),
    };
  },

  async readAuthorsBySlugs(slugs) {
    const uniqueSlugs = [...new Set(slugs.filter(Boolean))];

    if (uniqueSlugs.length === 0) {
      return [];
    }

    const authorRows = await db.select().from(authors).where(inArray(authors.slug, uniqueSlugs));

    return authorRows.map(toAuthorSnapshot);
  },

  async executeGroupMerge(group) {
    return db.transaction(async (tx) => {
      let relationsMoved = 0;
      let relationsSkippedAsDuplicate = 0;
      let canonicalUpdated = false;
      let duplicatesArchived = 0;
      const now = new Date();

      for (const relation of group.relationsToMove) {
        const inserted = await tx
          .insert(bookAuthors)
          .values({
            bookId: relation.bookId,
            authorId: relation.toAuthorId,
            sortOrder: relation.sortOrder,
          })
          .onConflictDoNothing()
          .returning({ bookId: bookAuthors.bookId });

        if (inserted.length > 0) {
          relationsMoved += 1;
        } else {
          relationsSkippedAsDuplicate += 1;
        }
      }

      if (group.authorsToArchive.length > 0 && group.currentRelations.length > 0) {
        await tx.delete(bookAuthors).where(
          and(
            inArray(bookAuthors.authorId, group.authorsToArchive),
            inArray(
              bookAuthors.bookId,
              group.currentRelations.map((relation) => relation.bookId),
            ),
          ),
        );
      }

      await tx
        .update(authors)
        .set({
          ...group.selectedFields,
          updatedAt: now,
        })
        .where(eq(authors.id, group.decision.canonicalAuthorId));
      canonicalUpdated = true;

      if (group.authorsToArchive.length > 0) {
        const archived = await tx
          .update(authors)
          .set({
            isArchived: true,
            archivedAt: now,
            updatedAt: now,
          })
          .where(inArray(authors.id, group.authorsToArchive))
          .returning({ id: authors.id });
        duplicatesArchived = archived.length;
      }

      return {
        relationsMoved,
        relationsSkippedAsDuplicate:
          relationsSkippedAsDuplicate + group.relationsSkippedAsDuplicate.length,
        canonicalUpdated,
        duplicatesArchived,
      };
    });
  },
};

function toAuthorSnapshot(author: typeof authors.$inferSelect): AuthorDedupeAuthorSnapshot {
  return {
    id: author.id,
    name: author.name,
    slug: author.slug,
    shortBio: author.shortBio,
    biography: author.biography,
    photoUrl: author.photoUrl,
    websiteUrl: author.websiteUrl,
    instagramUrl: author.instagramUrl,
    facebookUrl: author.facebookUrl,
    country: author.country,
    isPublished: author.isPublished,
    isFeatured: author.isFeatured,
    isArchived: author.isArchived,
    archivedAt: author.archivedAt?.toISOString() ?? null,
    sortOrder: author.sortOrder,
    createdAt: author.createdAt.toISOString(),
    updatedAt: author.updatedAt.toISOString(),
  };
}
