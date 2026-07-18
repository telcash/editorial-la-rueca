'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { requireEditorialStaff } from '@/services/auth/access.service';
import * as AuthorService from '@/services/authors/author.service';

const authorIdSchema = z.string().uuid();

export async function archiveAuthorAction(authorId: string): Promise<void> {
  await requireEditorialStaff();

  const validAuthorId = authorIdSchema.parse(authorId);

  await AuthorService.archiveAuthor(validAuthorId);
  revalidatePath('/admin/authors');
  revalidatePath(`/admin/authors/${validAuthorId}`);
}

export async function restoreAuthorAction(authorId: string): Promise<void> {
  await requireEditorialStaff();

  const validAuthorId = authorIdSchema.parse(authorId);

  await AuthorService.restoreAuthor(validAuthorId);
  revalidatePath('/admin/authors');
  revalidatePath(`/admin/authors/${validAuthorId}`);
}
