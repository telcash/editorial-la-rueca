import 'server-only';

import * as authorRepository from '@/repositories/authors/author.repository';
import * as bookRepository from '@/repositories/books/book.repository';
import * as categoryRepository from '@/repositories/categories/category.repository';
import { createBookService } from './book.service.core';

export { createBookService } from './book.service.core';
export type {
  BookAuthorSummary,
  BookEditionDetails,
  BookRepository,
  BookWithDetails,
} from './book.types';

const bookService = createBookService(bookRepository, authorRepository, categoryRepository);

export const {
  getBookById,
  getBookBySlug,
  listBooks,
  listBooksPaginated,
  listActiveBooks,
  listArchivedBooks,
  listPublishedBooks,
  listFeaturedPublishedBooks,
  listPublishedBooksPaginated,
  getPublishedBookBySlug,
  listPublishedBooksByAuthorId,
  listRelatedPublishedBooksByAuthorIds,
  listHomeFeaturedPublishedBooks,
  createBook,
  updateBook,
  archiveBook,
  restoreBook,
  deleteBookPermanently,
} = bookService;
