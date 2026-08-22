'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import type { Author } from '@/db/schema';
import { cn } from '@/lib/utils';
import { AuthorCard } from './author-card';

interface FeaturedAuthorsCarouselProps {
  authors: Author[];
  className?: string;
  firstImagePriority?: boolean;
}

export function FeaturedAuthorsCarousel({
  authors,
  className,
  firstImagePriority = false,
}: FeaturedAuthorsCarouselProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollPrevious, setCanScrollPrevious] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const updateScrollState = useCallback(() => {
    const container = scrollContainerRef.current;

    if (!container) {
      setCanScrollPrevious(false);
      setCanScrollNext(false);
      return;
    }

    const maxScrollLeft = container.scrollWidth - container.clientWidth;

    setCanScrollPrevious(container.scrollLeft > 1);
    setCanScrollNext(container.scrollLeft < maxScrollLeft - 1);
  }, []);

  function scrollAuthors(direction: 'previous' | 'next') {
    const container = scrollContainerRef.current;

    if (!container) {
      return;
    }

    const scrollDistance = Math.round(container.clientWidth * 0.84);
    container.scrollBy({
      left: direction === 'previous' ? -scrollDistance : scrollDistance,
      behavior: 'smooth',
    });
  }

  useEffect(() => {
    const container = scrollContainerRef.current;

    if (!container) {
      return undefined;
    }

    updateScrollState();

    const resizeObserver = new ResizeObserver(updateScrollState);
    resizeObserver.observe(container);
    container.addEventListener('scroll', updateScrollState, { passive: true });

    return () => {
      resizeObserver.disconnect();
      container.removeEventListener('scroll', updateScrollState);
    };
  }, [authors.length, updateScrollState]);

  if (authors.length === 0) {
    return null;
  }

  return (
    <div
      className={cn('relative', className)}
      role="region"
      aria-label="Autores destacados"
      data-featured-authors-carousel="true"
    >
      <button
        type="button"
        aria-label="Autores anteriores"
        onClick={() => scrollAuthors('previous')}
        disabled={!canScrollPrevious}
        className="absolute left-0 top-1/2 z-10 hidden size-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-public-border bg-white text-public-ink shadow-[0_10px_28px_rgba(23,23,23,0.10)] transition hover:text-public-red focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-public-red focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-0 md:inline-flex"
      >
        <ChevronLeft className="size-5" aria-hidden="true" />
      </button>

      <div
        ref={scrollContainerRef}
        data-carousel-track="featured-authors"
        className="-mx-4 flex snap-x snap-mandatory gap-3.5 overflow-x-auto scroll-px-4 px-4 pb-3 scroll-smooth [scrollbar-width:none] sm:mx-0 sm:gap-5 sm:scroll-px-0 sm:px-0 lg:gap-6 [&::-webkit-scrollbar]:hidden"
      >
        {authors.map((author, index) => (
          <div
            key={author.id}
            data-carousel-slide="featured-author"
            className="flex max-w-[calc(100vw-32px)] shrink-0 basis-[calc(100vw-32px)] snap-center justify-center sm:max-w-none sm:basis-[13.75rem] sm:snap-start lg:basis-[15rem] [&>div]:w-full"
          >
            <AuthorCard author={author} imagePriority={firstImagePriority && index === 0} />
          </div>
        ))}
      </div>

      <button
        type="button"
        aria-label="Autores siguientes"
        onClick={() => scrollAuthors('next')}
        disabled={!canScrollNext}
        className="absolute right-0 top-1/2 z-10 hidden size-11 translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-public-border bg-white text-public-ink shadow-[0_10px_28px_rgba(23,23,23,0.10)] transition hover:text-public-red focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-public-red focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-0 md:inline-flex"
      >
        <ChevronRight className="size-5" aria-hidden="true" />
      </button>
    </div>
  );
}
