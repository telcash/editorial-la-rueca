'use client';

import { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

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
        data-carousel-track="featured-books"
        className="-mx-4 flex snap-x snap-mandatory gap-3.5 overflow-x-auto scroll-px-4 px-4 pb-3 scroll-smooth [scrollbar-width:none] sm:mx-0 sm:gap-5 sm:scroll-px-0 sm:px-0 [&::-webkit-scrollbar]:hidden"
      >
        {books.map((book) => (
          <div
            key={book.id}
            data-carousel-slide="featured-book"
            className="flex max-w-[calc(100vw-32px)] shrink-0 basis-[calc(100vw-32px)] snap-center justify-center sm:max-w-none sm:basis-[170px] sm:snap-start"
          >
            <BookCard
              book={book}
              className="max-sm:!h-auto max-sm:!w-full max-sm:[&_article>div:first-child>div]:!h-auto max-sm:[&_article>div:last-child]:!h-[96px] max-sm:[&_h2]:!h-[42px] max-sm:[&_h2]:!text-[18px] max-sm:[&_h2]:!leading-[21px] max-sm:[&_p]:!h-[36px] max-sm:[&_p]:!text-[15px] max-sm:[&_p]:!leading-[18px]"
            />
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
