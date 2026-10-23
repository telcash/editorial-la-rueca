'use client';

import { useEffect, useRef, useState, type FocusEvent } from 'react';

import { FeaturedBooksCarousel } from '@/components/public/featured-books-carousel';
import type { BookWithDetails } from '@/services/books/book.types';

interface BookRelatedCarouselProps {
  books: BookWithDetails[];
}

export function BookRelatedCarousel({ books }: BookRelatedCarouselProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hasOverflow, setHasOverflow] = useState(false);

  function revealFocusedBook(event: FocusEvent<HTMLDivElement>) {
    const slide = event.target.closest<HTMLElement>('[data-carousel-slide="featured-book"]');

    if (slide) {
      // Reveal the full slide after the browser's native focus scrolling.
      requestAnimationFrame(() => {
        slide.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
      });
    }
  }

  useEffect(() => {
    const track = containerRef.current?.querySelector<HTMLElement>(
      '[data-carousel-track="featured-books"]',
    );

    if (!track) {
      return;
    }

    const updateOverflow = () => setHasOverflow(track.scrollWidth > track.clientWidth + 1);
    updateOverflow();
    const observer = new ResizeObserver(updateOverflow);
    observer.observe(track);

    return () => observer.disconnect();
  }, [books]);

  return (
    <div
      ref={containerRef}
      role="region"
      aria-label="Libros recomendados"
      onFocusCapture={revealFocusedBook}
      className="mt-8"
    >
      <FeaturedBooksCarousel
        books={books}
        className={hasOverflow ? undefined : '[&>button]:!hidden'}
      />
    </div>
  );
}
