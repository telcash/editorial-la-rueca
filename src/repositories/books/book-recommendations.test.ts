import { getTableColumns } from 'drizzle-orm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { books, type Book } from '@/db/schema';
import type { BookRecommendationOptions } from '@/services/books/book.types';

vi.mock('server-only', () => ({}));

const mocks = vi.hoisted(() => ({
  execute:
    vi.fn<(query: string, params: unknown[], method: string) => Promise<{ rows: unknown[][] }>>(),
}));

vi.mock('@/db', async () => {
  const { drizzle } = await import('drizzle-orm/pg-proxy');
  return { db: drizzle(mocks.execute) };
});

const { findRelatedPublished } = await import('./book.repository');

const options: BookRecommendationOptions = {
  authorIds: ['author-a', 'author-b'],
  categoryIds: ['category-a', 'category-b'],
  excludeBookId: 'current-book',
};

function createBook(id: string): Book {
  return {
    id,
    title: id,
    slug: id,
    subtitle: null,
    description: null,
    excerpt: null,
    coverUrl: null,
    originalPublicationDate: null,
    language: 'es',
    isFeatured: false,
    isPublished: true,
    isArchived: false,
    archivedAt: null,
    sortOrder: 0,
    metaTitle: null,
    metaDescription: null,
    canonicalUrl: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };
}

function queueBooks(ids: string[]) {
  const keys = Object.keys(getTableColumns(books)) as (keyof Book)[];
  mocks.execute.mockResolvedValueOnce({
    rows: ids.map((id) => {
      const book = createBook(id);
      return keys.map((key) => {
        const value = book[key];
        return value instanceof Date ? value.toISOString() : value;
      });
    }),
  });
}

function queryAt(index: number) {
  const [query, params] = mocks.execute.mock.calls[index];
  return query
    .replace(/\$(\d+)/g, (_, position: string) => JSON.stringify(params[Number(position) - 1]))
    .replace(/\s+/g, ' ');
}

function expectPublicBookQuery(query: string) {
  expect(query).toContain('from "books" where');
  expect(query).toContain('"books"."id" <> "current-book"');
  expect(query).toContain('"books"."is_published" = true');
  expect(query).toContain('"books"."is_archived" = false');
  expect(query).toContain('exists (select');
  expect(query).toContain('"book_authors"."book_id" = "books"."id"');
  expect(query).toContain('"authors"."is_published" = true');
  expect(query).toContain('"authors"."is_archived" = false');
}

describe('book recommendation repository (real Drizzle SQL, mocked database responses)', () => {
  beforeEach(() => {
    mocks.execute.mockReset();
    mocks.execute.mockResolvedValue({ rows: [] });
  });

  it.each([4, 7, 12, 15])(
    'keeps all %i same-author books without a SQL limit or fallback',
    async (count) => {
      const ids = Array.from({ length: count }, (_, index) => `same-${index + 1}`);
      queueBooks(ids);

      const result = await findRelatedPublished(options);

      expect(result.map((book) => book.id)).toEqual(ids);
      expectPublicBookQuery(queryAt(0));
      expect(queryAt(0)).toContain('"authors"."id" in ("author-a", "author-b")');
      expect(queryAt(0)).not.toMatch(/\blimit\b/i);
      expect(mocks.execute).toHaveBeenCalledTimes(4);
      expect(mocks.execute.mock.calls.some(([query]) => query.includes('case'))).toBe(false);
    },
  );

  it('keeps two same-author books first and only requests the two missing recommendations', async () => {
    queueBooks(['same-1', 'same-2']);
    queueBooks(['category-featured-1', 'category-featured-2']);

    const result = await findRelatedPublished(options);

    expect(result.map((book) => book.id)).toEqual([
      'same-1',
      'same-2',
      'category-featured-1',
      'category-featured-2',
    ]);
    expect(queryAt(1)).toContain('limit 2');
    expect(queryAt(1)).toContain('not "books"."id" in ("same-1", "same-2")');
    expect(mocks.execute).toHaveBeenCalledTimes(5);
  });

  it('ranks same-category featured authors, same-category other authors, then other-category featured authors', async () => {
    queueBooks([]);
    queueBooks(['category-featured', 'category-other-1', 'category-other-2', 'other-featured']);

    const result = await findRelatedPublished(options);
    const query = queryAt(1);
    const order = query.slice(query.indexOf('order by'));

    expect(result.map((book) => book.id)).toEqual([
      'category-featured',
      'category-other-1',
      'category-other-2',
      'other-featured',
    ]);
    expect(order).toMatch(
      /order by case when exists .*"categories".* and exists .*"authors"\."is_featured" = true.* then 2 when exists .*"categories".* then 3 else 4 end/,
    );
    expect(order).toContain(
      '"books"."is_featured" desc, "books"."sort_order" asc, "books"."created_at" desc, "books"."title" asc, "books"."id" asc',
    );
    expect(query).toContain('limit 4');
  });

  it('excludes the current book and rejects unpublished, archived or authorless candidates in both queries', async () => {
    queueBooks([]);
    queueBooks([]);

    await findRelatedPublished(options);

    expectPublicBookQuery(queryAt(0));
    expectPublicBookQuery(queryAt(1));
    expect(queryAt(1)).toContain('"categories"."is_published" = true');
    expect(queryAt(1)).toContain('"categories"."is_archived" = false');
    expect(queryAt(1)).toContain('"authors"."is_featured" = true');
  });

  it('uses correlated EXISTS for multiple categories and coauthors without multiplying book rows', async () => {
    queueBooks(['shared-coauthors']);
    queueBooks(['shared-categories', 'both-categories-featured', 'other-featured']);

    const result = await findRelatedPublished(options);

    expect(new Set(result.map((book) => book.id)).size).toBe(4);
    expect(queryAt(0)).toContain('"authors"."id" in ("author-a", "author-b")');
    expect(queryAt(1)).toContain('"categories"."id" in ("category-a", "category-b")');
    expect(queryAt(1)).toContain('"book_categories"."book_id" = "books"."id"');
    expect(queryAt(1)).toContain('not exists (select');
    expect(queryAt(1)).toContain('"authors"."id" in ("author-a", "author-b")');
    expect(queryAt(0)).toContain('from "books" where');
    expect(queryAt(1)).toContain('from "books" where');
  });

  it('only admits featured authors in the final fallback instead of arbitrary unrelated books', async () => {
    queueBooks([]);
    queueBooks(['featured-other-category']);

    const result = await findRelatedPublished({ ...options, categoryIds: [] });

    expect(result.map((book) => book.id)).toEqual(['featured-other-category']);
    expect(queryAt(1)).not.toContain('"categories"');
    expect(queryAt(1)).toContain('false or exists (select');
    expect(queryAt(1)).toContain('"authors"."is_featured" = true');
  });

  it('does not invent or repeat books when only three valid candidates are available', async () => {
    queueBooks(['same-1']);
    queueBooks(['category-1', 'featured-1']);

    const result = await findRelatedPublished(options);

    expect(result.map((book) => book.id)).toEqual(['same-1', 'category-1', 'featured-1']);
    expect(queryAt(1)).toContain('limit 3');
  });

  it('returns an empty list without querying details when no candidate exists', async () => {
    queueBooks([]);
    queueBooks([]);

    await expect(findRelatedPublished(options)).resolves.toEqual([]);
    expect(mocks.execute).toHaveBeenCalledTimes(2);
  });

  it('still uses category and featured-author fallback when the source has no public authors', async () => {
    queueBooks(['category-1', 'category-2']);

    const result = await findRelatedPublished({ ...options, authorIds: [] });

    expect(result.map((book) => book.id)).toEqual(['category-1', 'category-2']);
    expect(queryAt(0)).toContain('order by case');
    expect(queryAt(0)).not.toContain('"authors"."id" in');
    expect(mocks.execute).toHaveBeenCalledTimes(4);
  });

  it('hydrates all selected books in three batched queries with public relations only', async () => {
    queueBooks(['same-1', 'same-2', 'same-3', 'same-4']);

    await findRelatedPublished(options);

    expect(mocks.execute).toHaveBeenCalledTimes(4);
    for (const index of [1, 2, 3]) {
      expect(queryAt(index)).toContain('in ("same-1", "same-2", "same-3", "same-4")');
    }
    expect(queryAt(1)).toContain('"authors"."is_published" = true');
    expect(queryAt(1)).toContain('"authors"."is_archived" = false');
    expect(queryAt(2)).toContain('"categories"."is_published" = true');
    expect(queryAt(2)).toContain('"categories"."is_archived" = false');
    expect(queryAt(3)).toContain('"book_editions"."is_available" = true');
  });
});
