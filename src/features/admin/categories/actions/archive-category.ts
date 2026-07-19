'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { requireEditorialStaff } from '@/services/auth/access.service';
import * as CategoryService from '@/services/categories/category.service';

const categoryIdSchema = z.string().uuid();

export async function archiveCategoryAction(categoryId: string): Promise<void> {
  await requireEditorialStaff();

  const validCategoryId = categoryIdSchema.parse(categoryId);

  await CategoryService.archiveCategory(validCategoryId);
  revalidatePath('/admin/categories');
  revalidatePath(`/admin/categories/${validCategoryId}`);
}

export async function restoreCategoryAction(categoryId: string): Promise<void> {
  await requireEditorialStaff();

  const validCategoryId = categoryIdSchema.parse(categoryId);

  await CategoryService.restoreCategory(validCategoryId);
  revalidatePath('/admin/categories');
  revalidatePath(`/admin/categories/${validCategoryId}`);
}
