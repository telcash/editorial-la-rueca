import Image from 'next/image';
import { connection } from 'next/server';
import { ArrowRight, BookOpen, UsersRound } from 'lucide-react';

import { FeaturedAuthorsCarousel } from '@/components/public/featured-authors-carousel';
import { FeaturedBooksCarousel } from '@/components/public/featured-books-carousel';
import { EditorialVideo } from '@/components/public/editorial-video';
import { PublicButton } from '@/components/public/public-button';
import { PublicCard } from '@/components/public/public-card';
import { PublicContainer } from '@/components/public/public-container';
import { PublicCtaLink } from '@/components/public/public-cta-link';
import { PublicSection } from '@/components/public/public-section';
import { SectionHeading } from '@/components/public/section-heading';
import { TestimonialsSection } from '@/components/public/testimonials-section';
import { editorialVideoContent } from '@/content/public-home';
import { PublicContactForm } from '@/features/public/contact/components/public-contact-form';
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

export default async function PublicHomePage() {
  await connection();

  const { featuredBooks, featuredAuthors, featuredTestimonials, publishedServices, metrics } =
    await getHomeData();

  return (
    <>
      <PublicSection variant="compact" className="pt-5 md:pt-8">
        <PublicContainer>
          <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
            <div className="overflow-hidden rounded-2xl border border-public-border bg-white shadow-[0_18px_50px_rgba(23,23,23,0.08)]">
              <div className="relative grid min-h-[24rem] items-center gap-8 overflow-hidden p-6 sm:p-8 lg:p-12">
                <Image
                  src="/brand/home-hero-editorial.png"
                  alt=""
                  aria-hidden="true"
                  fill
                  priority
                  sizes="(min-width: 1024px) 60vw, 100vw"
                  className="z-0 object-cover object-[68%_center] md:object-[60%_center] lg:object-[55%_center]"
                />
                <div
                  className="absolute inset-0 z-10 bg-[linear-gradient(90deg,rgba(255,255,255,0.82)_0%,rgba(255,255,255,0.68)_48%,rgba(255,255,255,0.45)_100%)] md:bg-[linear-gradient(90deg,rgba(255,255,255,0.8)_0%,rgba(255,255,255,0.65)_45%,rgba(255,255,255,0.4)_100%)] lg:bg-[linear-gradient(90deg,rgba(255,255,255,0.78)_0%,rgba(255,255,255,0.62)_45%,rgba(255,255,255,0.35)_100%)]"
                  aria-hidden="true"
                />
                <div className="relative z-20 max-w-2xl">
                  <h1 className="font-serif-public text-public-display font-semibold tracking-normal text-public-ink">
                    Publicamos libros.
                    <span className="block text-public-red">Acompañamos autores.</span>
                  </h1>
                  <p className="mt-public-heading-gap max-w-xl text-public-lead text-public-ink/80">
                    Te acompañamos durante todo el proceso editorial, con claridad, cercanía y un
                    equipo que cuida tu obra como merece.
                  </p>
                  <HeroMetrics metrics={metrics} />
                  <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                    <PublicButton href="#contacto">
                      Quiero publicar mi libro
                      <ArrowRight className="size-4" aria-hidden="true" />
                    </PublicButton>
                    <PublicButton href="/libros" variant="secondary">
                      Ver catálogo
                    </PublicButton>
                  </div>
                </div>
              </div>
            </div>

            <PublicCard id="contacto" className="scroll-mt-24 p-6 sm:p-8 lg:p-10">
              <h2 className="font-serif-public text-3xl font-semibold leading-tight text-public-ink">
                Cuéntanos sobre tu libro
              </h2>
              <p className="mt-3 text-public-body-small text-public-muted">
                Déjanos tus datos y te orientamos sobre el proceso editorial más adecuado para tu
                proyecto.
              </p>
              <div className="mt-7">
                <PublicContactForm services={publishedServices} />
              </div>
            </PublicCard>
          </div>
        </PublicContainer>
      </PublicSection>

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

      <PublicSection variant="compact">
        <PublicContainer>
          <EditorialVideo content={editorialVideoContent} />
        </PublicContainer>
      </PublicSection>

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
