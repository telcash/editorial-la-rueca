import type {
  AdminDashboardData,
  DashboardAuthorRepository,
  DashboardBookRepository,
} from './dashboard.types';

const RECENT_ITEMS_LIMIT = 5;

export function createDashboardService(
  authorRepository: DashboardAuthorRepository,
  bookRepository: DashboardBookRepository,
) {
  return {
    async getDashboardData(): Promise<AdminDashboardData> {
      const [authorCounts, bookCounts, recentBooks, recentAuthors] = await Promise.all([
        authorRepository.getDashboardCounts(),
        bookRepository.getDashboardCounts(),
        bookRepository.findRecent(RECENT_ITEMS_LIMIT),
        authorRepository.findRecent(RECENT_ITEMS_LIMIT),
      ]);

      return {
        metrics: {
          authorsActive: authorCounts.active,
          authorsArchived: authorCounts.archived,
          authorsWithoutPhoto: authorCounts.withoutPhoto,
          booksActive: bookCounts.active,
          booksPublished: bookCounts.published,
          booksDraft: bookCounts.drafts,
          booksArchived: bookCounts.archived,
          booksWithoutCover: bookCounts.withoutCover,
        },
        recentBooks,
        recentAuthors,
      };
    },
  };
}
