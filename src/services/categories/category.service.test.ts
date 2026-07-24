import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

import type { Category } from '@/db/schema';
import {
  CategoryHasBooksError,
  CategoryMustBeArchivedError,
  CategoryNotFoundError,
  CategorySlugConflictError,
} from './category.errors';
import { createCategoryService } from './category.service.core';
import type { CategoryRepository } from './category.types';

type MockCategoryRepository = {
  [Key in keyof CategoryRepository]: Mock<CategoryRepository[Key]>;
};

const categoryId = '8a9dd9a7-a564-44f3-b65f-94f0390b6d75';

const baseCategory: Category = {
  id: categoryId,
  name: 'Narrativa',
  slug: 'narrativa',
  description: null,
  isPublished: true,
  isArchived: false,
  archivedAt: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
};

function createCategoryRepositoryMock(): MockCategoryRepository {
  return {
    findById: vi.fn<CategoryRepository['findById']>(),
    findBySlug: vi.fn<CategoryRepository['findBySlug']>(),
    findByIds: vi.fn<CategoryRepository['findByIds']>(),
    findAll: vi.fn<CategoryRepository['findAll']>(),
    findAllWithBookCount: vi.fn<CategoryRepository['findAllWithBookCount']>(),
    findAllWithBookCountPaginated: vi.fn<CategoryRepository['findAllWithBookCountPaginated']>(),
    findActive: vi.fn<CategoryRepository['findActive']>(),
    findArchived: vi.fn<CategoryRepository['findArchived']>(),
    findPublished: vi.fn<CategoryRepository['findPublished']>(),
    existsBySlug: vi.fn<CategoryRepository['existsBySlug']>(),
    create: vi.fn<CategoryRepository['create']>(),
    update: vi.fn<CategoryRepository['update']>(),
    archive: vi.fn<CategoryRepository['archive']>(),
    restore: vi.fn<CategoryRepository['restore']>(),
    deleteById: vi.fn<CategoryRepository['deleteById']>(),
    countBooksByCategoryId: vi.fn<CategoryRepository['countBooksByCategoryId']>(),
  };
}

describe('createCategoryService', () => {
  let repository: MockCategoryRepository;
  let service: ReturnType<typeof createCategoryService>;

  beforeEach(() => {
    repository = createCategoryRepositoryMock();
    service = createCategoryService(repository);
  });

  it('creates a category with normalized input', async () => {
    repository.existsBySlug.mockResolvedValue(false);
    repository.create.mockResolvedValue(baseCategory);

    await expect(
      service.createCategory({
        name: ' Narrativa ',
        slug: 'Narrativa Española',
        description: '',
        isPublished: true,
      }),
    ).resolves.toBe(baseCategory);

    expect(repository.create).toHaveBeenCalledWith({
      name: 'Narrativa',
      slug: 'narrativa-espanola',
      description: null,
      isPublished: true,
    });
  });

  it('rejects slug conflicts when creating', async () => {
    repository.existsBySlug.mockResolvedValue(true);

    await expect(
      service.createCategory({ name: 'Narrativa', slug: 'narrativa' }),
    ).rejects.toBeInstanceOf(CategorySlugConflictError);

    expect(repository.create).not.toHaveBeenCalled();
  });

  it('updates a category and ignores its current slug for conflict checks', async () => {
    const updatedCategory = { ...baseCategory, name: 'Nueva narrativa' };
    repository.findById.mockResolvedValue(baseCategory);
    repository.existsBySlug.mockResolvedValue(false);
    repository.update.mockResolvedValue(updatedCategory);

    await expect(
      service.updateCategory(categoryId, {
        name: ' Nueva narrativa ',
        slug: 'nueva-narrativa',
      }),
    ).resolves.toBe(updatedCategory);

    expect(repository.existsBySlug).toHaveBeenCalledWith('nueva-narrativa', categoryId);
    expect(repository.update).toHaveBeenCalledWith(categoryId, {
      name: 'Nueva narrativa',
      slug: 'nueva-narrativa',
    });
  });

  it('rejects slug conflicts when updating', async () => {
    repository.findById.mockResolvedValue(baseCategory);
    repository.existsBySlug.mockResolvedValue(true);

    await expect(
      service.updateCategory(categoryId, { slug: 'otra-categoria' }),
    ).rejects.toBeInstanceOf(CategorySlugConflictError);

    expect(repository.update).not.toHaveBeenCalled();
  });

  it('lists active, archived and published categories', async () => {
    repository.findAllWithBookCount.mockResolvedValue([{ category: baseCategory, bookCount: 2 }]);
    repository.findActive.mockResolvedValue([baseCategory]);
    repository.findArchived.mockResolvedValue([{ ...baseCategory, isArchived: true }]);
    repository.findPublished.mockResolvedValue([baseCategory]);

    await expect(service.listCategories()).resolves.toEqual([
      { category: baseCategory, bookCount: 2 },
    ]);
    expect(repository.findAllWithBookCount).toHaveBeenCalledWith('active');
    await expect(service.listArchivedCategories()).resolves.toEqual([
      expect.objectContaining({ isArchived: true }),
    ]);
    await expect(service.listActiveCategories()).resolves.toEqual([baseCategory]);
    await expect(service.listPublishedCategories()).resolves.toEqual([baseCategory]);
  });

  it('delegates paginated category listing to the repository', async () => {
    const result = {
      items: [{ category: baseCategory, bookCount: 2 }],
      totalItems: 1,
      page: 1,
      pageSize: 20,
      totalPages: 1,
    };
    repository.findAllWithBookCountPaginated.mockResolvedValue(result);

    await expect(
      service.listCategoriesPaginated('active', {
        query: 'narrativa',
        page: 1,
        pageSize: 20,
      }),
    ).resolves.toBe(result);
    expect(repository.findAllWithBookCountPaginated).toHaveBeenCalledWith('active', {
      query: 'narrativa',
      page: 1,
      pageSize: 20,
    });
  });

  it('archives and restores categories idempotently', async () => {
    const archivedCategory = { ...baseCategory, isArchived: true, archivedAt: new Date() };
    repository.findById.mockResolvedValueOnce(baseCategory).mockResolvedValueOnce(archivedCategory);
    repository.archive.mockResolvedValue(archivedCategory);

    await expect(service.archiveCategory(categoryId)).resolves.toBe(archivedCategory);
    await expect(service.archiveCategory(categoryId)).resolves.toBe(archivedCategory);
    expect(repository.archive).toHaveBeenCalledTimes(1);

    repository.findById.mockResolvedValueOnce(archivedCategory).mockResolvedValueOnce(baseCategory);
    repository.restore.mockResolvedValue(baseCategory);

    await expect(service.restoreCategory(categoryId)).resolves.toBe(baseCategory);
    await expect(service.restoreCategory(categoryId)).resolves.toBe(baseCategory);
    expect(repository.restore).toHaveBeenCalledTimes(1);
  });

  it('deletes an archived category without related books', async () => {
    repository.findById.mockResolvedValue({ ...baseCategory, isArchived: true });
    repository.countBooksByCategoryId.mockResolvedValue(0);
    repository.deleteById.mockResolvedValue({ ...baseCategory, isArchived: true });

    await expect(service.deleteCategoryPermanently(categoryId)).resolves.toEqual(
      expect.objectContaining({ id: categoryId }),
    );
  });

  it('rejects deleting an active category', async () => {
    repository.findById.mockResolvedValue(baseCategory);

    await expect(service.deleteCategoryPermanently(categoryId)).rejects.toBeInstanceOf(
      CategoryMustBeArchivedError,
    );

    expect(repository.deleteById).not.toHaveBeenCalled();
  });

  it('rejects deleting an archived category with related books', async () => {
    repository.findById.mockResolvedValue({ ...baseCategory, isArchived: true });
    repository.countBooksByCategoryId.mockResolvedValue(3);

    await expect(service.deleteCategoryPermanently(categoryId)).rejects.toBeInstanceOf(
      CategoryHasBooksError,
    );

    expect(repository.deleteById).not.toHaveBeenCalled();
  });

  it('throws CategoryNotFoundError for unknown categories', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(service.getCategoryById(categoryId)).rejects.toBeInstanceOf(CategoryNotFoundError);
  });
});
