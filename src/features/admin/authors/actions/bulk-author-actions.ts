'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { requireEditorialStaff } from '@/services/auth/access.service';
import * as AuthorService from '@/services/authors/author.service';
import type {
  AuthorBulkAction,
  AuthorBulkUpdateResult,
} from '@/services/authors/author-service.types';

const authorBulkActionSchema = z.enum([
  'publish',
  'unpublish',
  'feature',
  'unfeature',
  'archive',
  'restore',
]);

export async function bulkUpdateAuthorsAction(
  authorIds: string[],
  action: AuthorBulkAction,
): Promise<AuthorBulkUpdateResult> {
  await requireEditorialStaff();
  const validAction = authorBulkActionSchema.parse(action);

  const result = await AuthorService.bulkUpdateAuthors(authorIds, validAction);

  revalidatePath('/admin/authors');

  return result;
}
