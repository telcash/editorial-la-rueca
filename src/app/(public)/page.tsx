import { connection } from 'next/server';
import type { Metadata } from 'next';
import { BookOpen, UsersRound } from 'lucide-react';

import { FeaturedAuthorsCarousel } from '@/components/public/featured-authors-carousel';
import { FeaturedBooksCarousel } from '@/components/public/featured-books-carousel';
import { DistributionSection } from '@/components/public/distribution-section';
import { PublicCard } from '@/components/public/public-card';
import { PublicContainer } from '@/components/public/public-container';
import { PublicCtaLink } from '@/components/public/public-cta-link';
import { PublicHomeHero } from '@/components/public/public-home-hero';
import { PublicSection } from '@/components/public/public-section';
import { SectionHeading } from '@/components/public/section-heading';
import { TestimonialsSection } from '@/components/public/testimonials-section';
import { PublicContactForm } from '@/features/public/contact/components/public-contact-form';
import { getPublicContactUtmValues } from '@/features/public/contact/lib/contact-form-data';
import type { Author } from '@/db/schema';
import * as AuthorTestimonialService from '@/services/author-testimonials/author-testimonial.service';
import type { AuthorTestimonialPublicItem } from '@/services/author-testimonials/author-testimonial.types';
import * as AuthorService from '@/services/authors/author.service';
import * as BookService from '@/services/books/book.service';
import type { BookWithDetails } from '@/services/books/book.types';
import * as EditorialServiceService from '@/services/editorial-services/editorial-service.service';
import type { EditorialServicePublicItem } from '@/services/editorial-services/editorial-service.types';
import * as PublicHomeService from '@/services/public-home/public-home.service';
import type { PublicHomeMetrics } from '@/services/public-home/public-home.types';

export const metadata: Metadata = {
  title: 'Editorial La Rueca',
  alternates: { canonical: '/' },
};

interface HomeData {
  featuredBooks: BookWithDetails[];
  featuredAuthors: Author[];
  featuredTestimonials: AuthorTestimonialPublicItem[];
  publishedServices: Pick<EditorialServicePublicItem, 'id' | 'name'>[];
  metrics: PublicHomeMetrics | null;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unknown error';
}

async function getHomeData(): Promise<HomeData> {
  const [
    featuredBooksResult,
    featuredAuthorsResult,
    metricsResult,
    featuredTestimonialsResult,
    publishedServicesResult,
  ] = await Promise.allSettled([
    BookService.listHomeFeaturedPublishedBooks(8),
    AuthorService.listPublishedAuthors(),
    PublicHomeService.getPublicHomeMetrics(),
    AuthorTestimonialService.listFeaturedPublishedTestimonials(),
    EditorialServiceService.listPublishedServices(),
  ]);

  if (featuredBooksResult.status === 'rejected') {
    console.error('[PublicHome] Featured books query failed', {
      message: getErrorMessage(featuredBooksResult.reason),
    });
  }

  if (metricsResult.status === 'rejected') {
    console.error('[PublicHome] Metrics query failed', {
      message: getErrorMessage(metricsResult.reason),
    });
  }

  if (featuredAuthorsResult.status === 'rejected') {
    console.error('[PublicHome] Featured authors query failed', {
      message: getErrorMessage(featuredAuthorsResult.reason),
    });
  }

  if (featuredTestimonialsResult.status === 'rejected') {
    console.error('[PublicHome] Featured testimonials query failed', {
      message: getErrorMessage(featuredTestimonialsResult.reason),
    });
  }

  if (publishedServicesResult.status === 'rejected') {
    console.error('[PublicHome] Published services query failed', {
      message: getErrorMessage(publishedServicesResult.reason),
    });
  }

  return {
    featuredBooks: featuredBooksResult.status === 'fulfilled' ? featuredBooksResult.value : [],
    featuredAuthors:
      featuredAuthorsResult.status === 'fulfilled'
        ? featuredAuthorsResult.value.filter((author) => author.isFeatured)
        : [],
    featuredTestimonials:
      featuredTestimonialsResult.status === 'fulfilled' ? featuredTestimonialsResult.value : [],
    publishedServices:
      publishedServicesResult.status === 'fulfilled'
        ? publishedServicesResult.value.map((service) => ({
            id: service.id,
            name: service.name,
          }))
        : [],
    metrics: metricsResult.status === 'fulfilled' ? metricsResult.value : null,
  };
}

function HeroMetrics({ metrics }: { metrics: PublicHomeMetrics | null }) {
  if (!metrics) {
    return null;
  }

  return (
    <div className="mt-8 grid gap-3 sm:grid-cols-2">
      <PublicCard className="flex min-h-24 items-center gap-4 bg-white/86 p-4">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-public-red/20 bg-public-red-soft text-public-red">
          <BookOpen className="size-5" aria-hidden="true" />
        </span>
        <span>
          <strong className="block text-2xl leading-none text-public-red">
            {metrics.publishedBooks}
          </strong>
          <span className="mt-1 block text-xs font-bold leading-4 text-public-ink">
            libros publicados
          </span>
        </span>
      </PublicCard>
      <PublicCard className="flex min-h-24 items-center gap-4 bg-white/86 p-4">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-public-red/20 bg-public-red-soft text-public-red">
          <UsersRound className="size-5" aria-hidden="true" />
        </span>
        <span>
          <strong className="block text-2xl leading-none text-public-red">
            {metrics.activeAuthors}
          </strong>
          <span className="mt-1 block text-xs font-bold leading-4 text-public-ink">
            autores acompañados
          </span>
        </span>
      </PublicCard>
    </div>
  );
}

interface PublicHomePageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function PublicHomePage({ searchParams }: PublicHomePageProps) {
  await connection();

  const params = await searchParams;
  const { featuredBooks, featuredAuthors, featuredTestimonials, publishedServices, metrics } =
    await getHomeData();

  return (
    <>
      <PublicHomeHero metrics={<HeroMetrics metrics={metrics} />}>
        <PublicCard id="publica-tu-libro" className="scroll-mt-24 p-6 sm:p-8 lg:p-10">
          <h2 className="font-serif-public text-3xl font-semibold leading-tight text-public-ink">
            Cuéntanos sobre tu libro
          </h2>
          <p className="mt-3 text-public-body-small text-public-muted">
            Déjanos tus datos y te orientamos sobre el proceso editorial más adecuado para tu
            proyecto.
          </p>
          <div className="mt-7">
            <PublicContactForm
              services={publishedServices}
              utmValues={getPublicContactUtmValues(params)}
            />
          </div>
        </PublicCard>
      </PublicHomeHero>

      {featuredBooks.length > 0 ? (
        <PublicSection>
          <PublicContainer>
            <SectionHeading
              title="Libros destacados"
              action={<PublicCtaLink href="/libros">Ver catálogo completo</PublicCtaLink>}
              variant="centered"
            />
            <FeaturedBooksCarousel books={featuredBooks} className="mt-8" />
          </PublicContainer>
        </PublicSection>
      ) : null}

      <DistributionSection />

      {/* <PublicSection variant="compact">
        <PublicContainer>
          <EditorialVideo content={editorialVideoContent} />
        </PublicContainer>
      </PublicSection> */}

      <TestimonialsSection testimonials={featuredTestimonials} />

      {featuredAuthors.length > 0 ? (
        <PublicSection variant="compact">
          <PublicContainer>
            <SectionHeading
              title="Autores de La Rueca"
              description="Voces publicadas y acompañadas por la editorial."
              action={<PublicCtaLink href="/autores">Ver autores</PublicCtaLink>}
            />
            <FeaturedAuthorsCarousel
              authors={featuredAuthors}
              className="mt-8"
              firstImagePriority
            />
          </PublicContainer>
        </PublicSection>
      ) : null}
    </>
  );
}
