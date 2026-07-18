import 'server-only';

import { createClient } from '@/lib/supabase/server';
import { requireEditorialStaff } from '@/services/auth/access.service';
import { createBookCoverService } from './book-cover-service.core';

async function getBookCoverService() {
  await requireEditorialStaff();

  const supabase = await createClient();

  return createBookCoverService(supabase.storage);
}

export async function uploadBookCover(bookId: string, file: File) {
  const service = await getBookCoverService();

  return service.uploadBookCover(bookId, file);
}

export async function deleteBookCover(publicUrl: string | null) {
  const service = await getBookCoverService();

  return service.deleteBookCover(publicUrl);
}

export async function replaceBookCover(bookId: string, previousUrl: string | null, file: File) {
  const service = await getBookCoverService();

  return service.replaceBookCover(bookId, previousUrl, file);
}
