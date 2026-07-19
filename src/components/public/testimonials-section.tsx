import Image from 'next/image';
import { Quote, UserRound } from 'lucide-react';

import type { Testimonial } from '@/content/public-home';
import { PublicCard } from './public-card';
import { PublicContainer } from './public-container';
import { PublicSection } from './public-section';
import { SectionHeading } from './section-heading';

interface TestimonialsSectionProps {
  testimonials: Testimonial[];
}

export function TestimonialsSection({ testimonials }: TestimonialsSectionProps) {
  return (
    <PublicSection variant="compact" id="testimonios">
      <PublicContainer>
        <SectionHeading title="Lo que dicen nuestros autores" />
        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {testimonials.map((testimonial) => (
            <PublicCard key={testimonial.id} className="relative min-h-48 p-5">
              <Quote
                className="absolute right-5 top-5 size-12 text-public-border"
                aria-hidden="true"
              />
              <p className="relative max-w-[90%] text-sm leading-7 text-public-ink/80">
                {testimonial.quote}
              </p>
              <div className="mt-6 flex items-center gap-3">
                <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-public-border bg-public-surface-subtle text-public-muted">
                  {testimonial.authorImage ? (
                    <Image
                      src={testimonial.authorImage}
                      alt={`Foto de ${testimonial.authorName}`}
                      width={56}
                      height={56}
                      className="size-full object-cover"
                    />
                  ) : (
                    <UserRound className="size-6" aria-hidden="true" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-bold text-public-ink">{testimonial.authorName}</p>
                  {testimonial.authorRole ? (
                    <p className="mt-0.5 text-xs text-public-muted">{testimonial.authorRole}</p>
                  ) : null}
                </div>
              </div>
            </PublicCard>
          ))}
        </div>
      </PublicContainer>
    </PublicSection>
  );
}
