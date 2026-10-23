import { BookRelatedCarousel } from '@/components/public/books/book-related-carousel';
import { PublicContainer } from '@/components/public/public-container';
import { PublicSection } from '@/components/public/public-section';
import { SectionHeading } from '@/components/public/section-heading';
import type { BookWithDetails } from '@/services/books/book.types';

interface BookRelatedSectionProps {
  books: BookWithDetails[];
}

export function BookRelatedSection({ books }: BookRelatedSectionProps) {
  if (books.length === 0) {
    return null;
  }

  return (
    <PublicSection variant="compact">
      <PublicContainer>
        <SectionHeading title="También te puede interesar" variant="compact" />
        <BookRelatedCarousel books={books} />
      </PublicContainer>
    </PublicSection>
  );
}
