'use client';

import { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { BOOK_CARD_GRID_GAP, BOOK_CARD_WIDTH } from '@/features/public/books/book-card.helpers';
import type { BookWithDetails } from '@/services/books/book.types';
import { cn } from '@/lib/utils';
import { BookCard } from './book-card';

export interface FeaturedBook {
  id: string;
  title: string;
  slug: string;
  coverUrl: string | null;
  authors: string[];
}

interface FeaturedBooksCarouselProps {
  books: BookWithDetails[];
  className?: string;
}

export function FeaturedBooksCarousel({ books, className }: FeaturedBooksCarouselProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  function scrollBooks(direction: 'previous' | 'next') {
    const container = scrollContainerRef.current;

    if (!container) {
      return;
    }

    const scrollDistance = Math.round(container.clientWidth * 0.72);
    container.scrollBy({
      left: direction === 'previous' ? -scrollDistance : scrollDistance,
      behavior: 'smooth',
    });
  }

  return (
    <div className={cn('relative', className)}>
      <button
        type="button"
        aria-label="Libros anteriores"
        onClick={() => scrollBooks('previous')}
        className="absolute left-0 top-1/2 z-10 hidden size-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-public-border bg-white text-public-ink shadow-[0_10px_28px_rgba(23,23,23,0.10)] transition hover:text-public-red focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-public-red focus-visible:ring-offset-2 md:inline-flex"
      >
        <ChevronLeft className="size-5" aria-hidden="true" />
      </button>

      <div
        ref={scrollContainerRef}
        className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ gap: BOOK_CARD_GRID_GAP }}
      >
        {books.map((book) => (
          <div key={book.id} className="shrink-0 snap-start" style={{ flexBasis: BOOK_CARD_WIDTH }}>
            <BookCard book={book} />
          </div>
        ))}
      </div>

      <button
        type="button"
        aria-label="Libros siguientes"
        onClick={() => scrollBooks('next')}
        className="absolute right-0 top-1/2 z-10 hidden size-11 translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-public-border bg-white text-public-ink shadow-[0_10px_28px_rgba(23,23,23,0.10)] transition hover:text-public-red focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-public-red focus-visible:ring-offset-2 md:inline-flex"
      >
        <ChevronRight className="size-5" aria-hidden="true" />
      </button>
    </div>
  );
}
