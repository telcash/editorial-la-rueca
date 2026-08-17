'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Quote, UserRound } from 'lucide-react';

import type { AuthorTestimonialPublicItem } from '@/services/author-testimonials/author-testimonial.types';
import { cn } from '@/lib/utils';
import { PublicCard } from './public-card';
import { PublicContainer } from './public-container';
import { PublicSection } from './public-section';
import { SectionHeading } from './section-heading';

interface TestimonialsSectionProps {
  testimonials: AuthorTestimonialPublicItem[];
  className?: string;
}

export function TestimonialsSection({ testimonials, className }: TestimonialsSectionProps) {
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

  function scrollTestimonials(direction: 'previous' | 'next') {
    const container = scrollContainerRef.current;

    if (!container) {
      return;
    }

    const scrollDistance = Math.round(container.clientWidth * 0.9);
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
  }, [testimonials.length, updateScrollState]);

  if (testimonials.length === 0) {
    return null;
  }

  return (
    <PublicSection variant="compact" id="testimonios" className={className}>
      <PublicContainer>
        <SectionHeading title="Lo que dicen nuestros autores" />

        <div
          className="relative mt-8"
          role="region"
          aria-label="Testimonios destacados de autores"
          data-testimonials-carousel="true"
        >
          <button
            type="button"
            aria-label="Testimonios anteriores"
            onClick={() => scrollTestimonials('previous')}
            disabled={!canScrollPrevious}
            className="absolute left-0 top-1/2 z-10 hidden size-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-public-border bg-white text-public-ink shadow-[0_10px_28px_rgba(23,23,23,0.10)] transition hover:text-public-red focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-public-red focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-0 md:inline-flex"
          >
            <span aria-hidden="true">←</span>
          </button>

          <div
            ref={scrollContainerRef}
            data-carousel-track="author-testimonials"
            className="-mx-4 flex snap-x snap-mandatory gap-3.5 overflow-x-auto scroll-px-4 px-4 pb-3 scroll-smooth [scrollbar-width:none] sm:mx-0 sm:gap-5 sm:scroll-px-0 sm:px-0 lg:gap-6 [&::-webkit-scrollbar]:hidden"
          >
            {testimonials.map((testimonial) => (
              <div
                key={testimonial.id}
                data-carousel-slide="author-testimonial"
                className="flex max-w-[92vw] shrink-0 basis-[92vw] snap-center justify-center sm:max-w-none sm:basis-[calc((100%_-_1.25rem)/2)] sm:snap-start lg:basis-[calc((100%_-_3rem)/3)] [&>article]:w-full"
              >
                <TestimonialCard testimonial={testimonial} />
              </div>
            ))}
          </div>

          <button
            type="button"
            aria-label="Testimonios siguientes"
            onClick={() => scrollTestimonials('next')}
            disabled={!canScrollNext}
            className="absolute right-0 top-1/2 z-10 hidden size-11 translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-public-border bg-white text-public-ink shadow-[0_10px_28px_rgba(23,23,23,0.10)] transition hover:text-public-red focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-public-red focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-0 md:inline-flex"
          >
            <span aria-hidden="true">→</span>
          </button>
        </div>
      </PublicContainer>
    </PublicSection>
  );
}

function TestimonialCard({ testimonial }: { testimonial: AuthorTestimonialPublicItem }) {
  return (
    <PublicCard className="relative flex h-[21rem] flex-col p-5 sm:h-[22rem]">
      <Quote className="absolute right-5 top-5 size-12 text-public-border" aria-hidden="true" />
      <blockquote className="relative flex-1 pr-7">
        <p className="line-clamp-6 text-sm leading-7 text-public-ink/80">{testimonial.quote}</p>
      </blockquote>
      <footer className="mt-auto flex items-center gap-3 pt-6">
        <Link
          href={`/autores/${testimonial.author.slug}`}
          className="group flex size-18 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-public-border bg-public-surface-subtle text-public-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-public-red focus-visible:ring-offset-2"
          aria-label={`Ver ficha de ${testimonial.author.name}`}
        >
          {testimonial.author.photoUrl ? (
            <Image
              src={testimonial.author.photoUrl}
              alt={`Foto de ${testimonial.author.name}`}
              width={72}
              height={72}
              className="size-full object-cover transition group-hover:scale-105"
            />
          ) : (
            <UserRound className="size-6" aria-hidden="true" />
          )}
        </Link>
        <div className="min-w-0">
          <Link
            href={`/autores/${testimonial.author.slug}`}
            className="line-clamp-2 text-sm font-bold leading-5 text-public-ink transition hover:text-public-red focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-public-red focus-visible:ring-offset-2"
          >
            {testimonial.author.name}
          </Link>
          {testimonial.book ? (
            <Link
              href={`/libros/${testimonial.book.slug}`}
              className={cn(
                'mt-0.5 block truncate text-xs text-public-muted transition hover:text-public-red',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-public-red focus-visible:ring-offset-2',
              )}
            >
              {testimonial.book.title}
            </Link>
          ) : null}
        </div>
      </footer>
    </PublicCard>
  );
}
