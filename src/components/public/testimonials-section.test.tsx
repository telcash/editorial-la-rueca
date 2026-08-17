import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import type { AuthorTestimonialPublicItem } from '@/services/author-testimonials/author-testimonial.types';
import { TestimonialsSection } from './testimonials-section';

const projectRoot = process.cwd();

function createTestimonial(
  index: number,
  overrides: Partial<AuthorTestimonialPublicItem> = {},
): AuthorTestimonialPublicItem {
  return {
    id: `testimonial-${index}`,
    quote:
      'La Rueca acompañó mi libro con claridad, paciencia y una mirada editorial muy cuidadosa durante todo el proceso.',
    author: {
      id: `author-${index}`,
      name: `Autora ${index}`,
      slug: `autora-${index}`,
      photoUrl: `https://example.com/autora-${index}.jpg`,
    },
    book: {
      id: `book-${index}`,
      title: `Libro ${index}`,
      slug: `libro-${index}`,
    },
    ...overrides,
  };
}

describe('TestimonialsSection', () => {
  it('renders real testimonial data with quote, author, photo and optional book', () => {
    const html = renderToStaticMarkup(
      <TestimonialsSection testimonials={[createTestimonial(1)]} />,
    );

    expect(html).toContain('Lo que dicen nuestros autores');
    expect(html).toContain('La Rueca acompañó mi libro');
    expect(html).toContain('Autora 1');
    expect(html).toContain('Libro 1');
    expect(html).toContain('alt="Foto de Autora 1"');
    expect(html).toContain('href="/autores/autora-1"');
    expect(html).toContain('href="/libros/libro-1"');
  });

  it('uses the existing author placeholder pattern when there is no photo', () => {
    const html = renderToStaticMarkup(
      <TestimonialsSection
        testimonials={[
          createTestimonial(1, { author: { ...createTestimonial(1).author, photoUrl: null } }),
        ]}
      />,
    );

    expect(html).toContain('lucide-user-round');
    expect(html).not.toContain('alt="Foto de Autora 1"');
  });

  it('does not render artificial spacing or a book link when there is no book', () => {
    const html = renderToStaticMarkup(
      <TestimonialsSection testimonials={[createTestimonial(1, { book: null })]} />,
    );

    expect(html).toContain('Autora 1');
    expect(html).not.toContain('href="/libros/');
  });

  it('does not render the section when there are no featured testimonials', () => {
    const html = renderToStaticMarkup(<TestimonialsSection testimonials={[]} />);

    expect(html).toBe('');
  });

  it('renders every featured testimonial it receives in a responsive carousel without autoplay', () => {
    const html = renderToStaticMarkup(
      <TestimonialsSection
        testimonials={[1, 2, 3, 4, 5].map((index) => createTestimonial(index))}
      />,
    );
    const source = readFileSync(
      join(projectRoot, 'src/components/public/testimonials-section.tsx'),
      'utf8',
    );

    expect(html).toContain('data-testimonials-carousel="true"');
    expect(html).toContain('data-carousel-track="author-testimonials"');
    expect(html.match(/data-carousel-slide="author-testimonial"/g)).toHaveLength(5);
    expect(html).toContain('basis-[92vw]');
    expect(html).toContain('sm:basis-[calc((100%_-_1.25rem)/2)]');
    expect(html).toContain('lg:basis-[calc((100%_-_3rem)/3)]');
    expect(html).toContain('aria-label="Testimonios anteriores"');
    expect(html).toContain('aria-label="Testimonios siguientes"');
    expect(source).not.toContain('setInterval');
    expect(source).not.toContain('autoplay');
  });

  it('keeps card heights uniform with clamped quote and aligned footer', () => {
    const html = renderToStaticMarkup(
      <TestimonialsSection testimonials={[createTestimonial(1), createTestimonial(2)]} />,
    );

    expect(html).toContain('h-[21rem]');
    expect(html).toContain('sm:h-[22rem]');
    expect(html).toContain('line-clamp-6');
    expect(html).toContain('flex-1');
    expect(html).toContain('mt-auto');
  });

  it('connects the public home to the testimonial service and removes placeholder content', () => {
    const homePage = readFileSync(join(projectRoot, 'src/app/(public)/page.tsx'), 'utf8');
    const publicHomeContent = readFileSync(join(projectRoot, 'src/content/public-home.ts'), 'utf8');

    expect(homePage).toContain('AuthorTestimonialService.listFeaturedPublishedTestimonials()');
    expect(homePage).toContain('<TestimonialsSection testimonials={featuredTestimonials} />');
    expect(homePage).not.toContain('testimonials }');
    expect(publicHomeContent).not.toContain('testimonial-placeholder');
    expect(publicHomeContent).not.toContain('Testimonio pendiente');
    expect(publicHomeContent).not.toContain('Placeholder temporal');
  });
});
