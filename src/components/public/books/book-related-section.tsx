import { BookCard } from '@/components/public/book-card';
import { PublicContainer } from '@/components/public/public-container';
import { PublicSection } from '@/components/public/public-section';
import { SectionHeading } from '@/components/public/section-heading';
import { BOOK_CARD_GRID_GAP, BOOK_CARD_WIDTH } from '@/features/public/books/book-card.helpers';
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
        <SectionHeading
          title="También te puede interesar"
          titleClassName="text-[clamp(1.75rem,2.8vw,2.375rem)] leading-[1.15]"
        />
        <div
          className="mt-8 grid justify-center"
          style={{
            gridTemplateColumns: `repeat(auto-fill, minmax(${BOOK_CARD_WIDTH}px, ${BOOK_CARD_WIDTH}px))`,
            gap: BOOK_CARD_GRID_GAP,
          }}
        >
          {books.map((book) => (
            <BookCard key={book.id} book={book} />
          ))}
        </div>
      </PublicContainer>
    </PublicSection>
  );
}
