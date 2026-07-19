import 'server-only';

import * as authorRepository from '@/repositories/authors/author.repository';
import * as bookRepository from '@/repositories/books/book.repository';
import { createPublicHomeService } from './public-home.service.core';

export { createPublicHomeService } from './public-home.service.core';
export type { PublicHomeMetrics } from './public-home.types';

const publicHomeService = createPublicHomeService(authorRepository, bookRepository);

export const { getPublicHomeMetrics } = publicHomeService;
