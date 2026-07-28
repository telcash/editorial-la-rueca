import { BookEditionCard } from '@/components/public/books/book-edition-card';
import { PublicContainer } from '@/components/public/public-container';
import { PublicSection } from '@/components/public/public-section';
import { SectionHeading } from '@/components/public/section-heading';
import type { BookEditionDetails } from '@/services/books/book.types';

interface BookEditionsSectionProps {
  editions: BookEditionDetails[];
  primaryEditionId?: string;
}

export function BookEditionsSection({ editions, primaryEditionId }: BookEditionsSectionProps) {
  if (editions.length === 0) {
    return null;
  }

  const hasAvailableEdition = editions.some((edition) => edition.isAvailable);

  return (
    <PublicSection variant="compact">
      <PublicContainer>
        <SectionHeading
          title={hasAvailableEdition ? 'Ediciones disponibles' : 'Ediciones'}
          titleClassName="text-[clamp(1.75rem,2.8vw,2.375rem)] leading-[1.15]"
        />
        <div className="mt-8 grid items-stretch gap-5 md:grid-cols-2 xl:grid-cols-3">
          {editions.map((edition) => (
            <BookEditionCard
              key={edition.id}
              edition={edition}
              isPrimary={edition.id === primaryEditionId}
            />
          ))}
        </div>
      </PublicContainer>
    </PublicSection>
  );
}
