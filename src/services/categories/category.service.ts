import 'server-only';

import * as categoryRepository from '@/repositories/categories/category.repository';
import { createCategoryService } from './category.service.core';

export { createCategoryService } from './category.service.core';
export type { CategoryAdminListItem, CategoryRepository, CategorySummary } from './category.types';

const categoryService = createCategoryService(categoryRepository);

export const {
  getCategoryById,
  getCategoryBySlug,
  listCategories,
  listCategoriesPaginated,
  listActiveCategories,
  listArchivedCategories,
  listPublishedCategories,
  createCategory,
  updateCategory,
  archiveCategory,
  restoreCategory,
  deleteCategoryPermanently,
} = categoryService;
