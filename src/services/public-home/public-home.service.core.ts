import type {
  PublicHomeAuthorRepository,
  PublicHomeBookRepository,
  PublicHomeMetrics,
} from './public-home.types';

export function createPublicHomeService(
  authorRepository: PublicHomeAuthorRepository,
  bookRepository: PublicHomeBookRepository,
) {
  return {
    async getPublicHomeMetrics(): Promise<PublicHomeMetrics> {
      const [authorCounts, bookCounts] = await Promise.all([
        authorRepository.getDashboardCounts(),
        bookRepository.getDashboardCounts(),
      ]);

      return {
        publishedBooks: bookCounts.published,
        activeAuthors: authorCounts.active,
      };
    },
  };
}
