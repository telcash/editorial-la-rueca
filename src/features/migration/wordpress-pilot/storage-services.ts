import 'server-only';

import {
  createAuthorImageService,
  type AuthorImageStorageClient,
} from '@/features/admin/authors/services/author-image-service.core';
import {
  createBookCoverService,
  type BookCoverStorageClient,
} from '@/features/admin/books/services/book-cover-service.core';
import { createSupabaseMigrationClient } from './supabase-migration-client';

function createMigrationStorageClient() {
  return createSupabaseMigrationClient().storage;
}

export function createPilotMigrationStorageServices() {
  return {
    authorImages: {
      async uploadAuthorImage(authorId: string, file: File) {
        const storageClient = createMigrationStorageClient() as AuthorImageStorageClient;
        const service = createAuthorImageService(storageClient);

        return service.uploadAuthorImage(authorId, file);
      },
      async deleteAuthorImage(path: string) {
        const storageClient = createMigrationStorageClient() as AuthorImageStorageClient;
        const service = createAuthorImageService(storageClient);

        return service.deleteAuthorImage(path);
      },
    },
    bookCovers: {
      async uploadBookCover(bookId: string, file: File) {
        const storageClient = createMigrationStorageClient() as BookCoverStorageClient;
        const service = createBookCoverService(storageClient);

        return service.uploadBookCover(bookId, file);
      },
      async deleteBookCover(publicUrl: string | null) {
        const storageClient = createMigrationStorageClient() as BookCoverStorageClient;
        const service = createBookCoverService(storageClient);

        return service.deleteBookCover(publicUrl);
      },
    },
  };
}
