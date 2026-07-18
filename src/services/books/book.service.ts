import 'server-only';

import * as authorRepository from '@/repositories/authors/author.repository';
import * as bookRepository from '@/repositories/books/book.repository';
import { createBookService } from './book.service.core';

export { createBookService } from './book.service.core';
export type {
  BookAuthorSummary,
  BookEditionDetails,
  BookRepository,
  BookWithDetails,
} from './book.types';

const bookService = createBookService(bookRepository, authorRepository);

export const {
  getBookById,
  getBookBySlug,
  listBooks,
  listActiveBooks,
  listArchivedBooks,
  listPublishedBooks,
  createBook,
  updateBook,
  archiveBook,
  restoreBook,
} = bookService;
