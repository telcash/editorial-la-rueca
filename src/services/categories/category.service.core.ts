import { z } from 'zod';

import type { ArchiveStatus } from '@/features/admin/lib/archive-status';
import {
  createCategorySchema,
  updateCategorySchema,
  type CreateCategoryInput,
  type UpdateCategoryInput,
} from '@/schemas/categories/category.schema';
import {
  CategoryHasBooksError,
  CategoryMustBeArchivedError,
  CategoryNotFoundError,
  CategorySlugConflictError,
} from './category.errors';
import type { CategoryRepository } from './category.types';

const categoryIdSchema = z.string().uuid('El id de la categoría debe ser un UUID valido.');
const categorySlugSchema = createCategorySchema.shape.slug;

export function createCategoryService(repository: CategoryRepository) {
  return {
    async getCategoryById(id: string) {
      const validId = categoryIdSchema.parse(id);
      const category = await repository.findById(validId);

      if (!category) {
        throw new CategoryNotFoundError(validId);
      }

      return category;
    },

    async getCategoryBySlug(slug: string) {
      const validSlug = categorySlugSchema.parse(slug);
      const category = await repository.findBySlug(validSlug);

      if (!category) {
        throw new CategoryNotFoundError(validSlug);
      }

      return category;
    },

    async listCategories(status: ArchiveStatus = 'active') {
      return repository.findAllWithBookCount(status);
    },

    async listActiveCategories() {
      return repository.findActive();
    },

    async listArchivedCategories() {
      return repository.findArchived();
    },

    async listPublishedCategories() {
      return repository.findPublished();
    },

    async createCategory(input: unknown) {
      const data: CreateCategoryInput = createCategorySchema.parse(input);
      const slugExists = await repository.existsBySlug(data.slug);

      if (slugExists) {
        throw new CategorySlugConflictError(data.slug);
      }

      return repository.create(data);
    },

    async updateCategory(id: string, input: unknown) {
      const validId = categoryIdSchema.parse(id);
      const data: UpdateCategoryInput = updateCategorySchema.parse(input);
      const currentCategory = await repository.findById(validId);

      if (!currentCategory) {
        throw new CategoryNotFoundError(validId);
      }

      if (data.slug && data.slug !== currentCategory.slug) {
        const slugExists = await repository.existsBySlug(data.slug, validId);

        if (slugExists) {
          throw new CategorySlugConflictError(data.slug);
        }
      }

      const updatedCategory = await repository.update(validId, data);

      if (!updatedCategory) {
        throw new CategoryNotFoundError(validId);
      }

      return updatedCategory;
    },

    async archiveCategory(id: string) {
      const validId = categoryIdSchema.parse(id);
      const currentCategory = await repository.findById(validId);

      if (!currentCategory) {
        throw new CategoryNotFoundError(validId);
      }

      if (currentCategory.isArchived) {
        return currentCategory;
      }

      const archivedCategory = await repository.archive(validId);

      if (!archivedCategory) {
        throw new CategoryNotFoundError(validId);
      }

      return archivedCategory;
    },

    async restoreCategory(id: string) {
      const validId = categoryIdSchema.parse(id);
      const currentCategory = await repository.findById(validId);

      if (!currentCategory) {
        throw new CategoryNotFoundError(validId);
      }

      if (!currentCategory.isArchived) {
        return currentCategory;
      }

      const restoredCategory = await repository.restore(validId);

      if (!restoredCategory) {
        throw new CategoryNotFoundError(validId);
      }

      return restoredCategory;
    },

    async deleteCategoryPermanently(id: string) {
      const validId = categoryIdSchema.parse(id);
      const currentCategory = await repository.findById(validId);

      if (!currentCategory) {
        throw new CategoryNotFoundError(validId);
      }

      if (!currentCategory.isArchived) {
        throw new CategoryMustBeArchivedError();
      }

      const bookCount = await repository.countBooksByCategoryId(validId);

      if (bookCount > 0) {
        throw new CategoryHasBooksError(bookCount);
      }

      const deletedCategory = await repository.deleteById(validId);

      if (!deletedCategory) {
        throw new CategoryNotFoundError(validId);
      }

      return deletedCategory;
    },
  };
}
