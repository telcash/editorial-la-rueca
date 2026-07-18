import 'server-only';

import * as authorRepository from '@/repositories/authors/author.repository';
import * as bookRepository from '@/repositories/books/book.repository';
import { createDashboardService } from './dashboard.service.core';

export { createDashboardService } from './dashboard.service.core';
export type { AdminDashboardData } from './dashboard.types';

const dashboardService = createDashboardService(authorRepository, bookRepository);

export const { getDashboardData } = dashboardService;
