import 'server-only';

import * as authorRepository from '@/repositories/authors/author.repository';
import { createAuthorService } from './author.service.core';

export { createAuthorService } from './author.service.core';
export type { AuthorRepository } from './author-service.types';

const authorService = createAuthorService(authorRepository);

export const {
  getAuthorById,
  getAuthorBySlug,
  listAuthors,
  listAuthorsForAdmin,
  listAuthorsForAdminPaginated,
  listActiveAuthors,
  listArchivedAuthors,
  listPublishedAuthors,
  listPublishedAuthorsPaginated,
  getPublishedAuthorBySlug,
  createAuthor,
  updateAuthor,
  archiveAuthor,
  restoreAuthor,
  bulkUpdateAuthors,
  deleteAuthorPermanently,
} = authorService;
