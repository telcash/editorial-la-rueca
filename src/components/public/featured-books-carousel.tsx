'use client';

import { useRef } from 'react';
import { BookOpen, ChevronLeft, ChevronRight } from 'lucide-react';

import { cn } from '@/lib/utils';
import { PublicCard } from './public-card';

export interface FeaturedBook {
  id: string;
  title: string;
  slug: string;
  coverUrl: string | null;
  authors: string[];
}

interface FeaturedBooksCarouselProps {
  books: FeaturedBook[];
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
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {books.map((book) => (
          <PublicCard
            key={book.id}
            className="shrink-0 basis-full snap-start overflow-hidden md:basis-[calc((100%_-_1rem)/2)] lg:basis-[calc((100%_-_3rem)/4)]"
          >
            <div className="aspect-[2/3] bg-public-surface-subtle p-4">
              <div className="flex h-full items-center justify-center rounded-xl border border-public-border bg-white text-public-red">
                <BookOpen className="size-10" aria-hidden="true" />
              </div>
            </div>
            <div className="space-y-1.5 p-4">
              <h3 className="line-clamp-2 text-sm font-bold leading-5 text-public-ink">
                {book.title}
              </h3>
              <p className="truncate text-xs text-public-muted">{book.authors.join(', ')}</p>
            </div>
          </PublicCard>
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
