import 'server-only';

import { createClient } from '@/lib/supabase/server';
import { requireEditorialStaff } from '@/services/auth/access.service';
import { createAuthorImageService } from './author-image-service.core';

async function getAuthorImageService() {
  await requireEditorialStaff();

  const supabase = await createClient();

  return createAuthorImageService(supabase.storage);
}

export async function uploadAuthorImage(authorId: string, file: File) {
  const service = await getAuthorImageService();

  return service.uploadAuthorImage(authorId, file);
}

export async function deleteAuthorImage(path: string) {
  const service = await getAuthorImageService();

  return service.deleteAuthorImage(path);
}

export async function replaceAuthorImage(
  authorId: string,
  file: File,
  previousPath?: string | null,
) {
  const service = await getAuthorImageService();

  return service.replaceAuthorImage(authorId, file, previousPath);
}
