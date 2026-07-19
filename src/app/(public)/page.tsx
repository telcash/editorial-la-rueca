import { connection } from 'next/server';
import { ArrowRight, BookOpen, UsersRound } from 'lucide-react';

import {
  FeaturedBooksCarousel,
  type FeaturedBook,
} from '@/components/public/featured-books-carousel';
import { EditorialVideo } from '@/components/public/editorial-video';
import { PublicButton } from '@/components/public/public-button';
import { PublicCard } from '@/components/public/public-card';
import { PublicContainer } from '@/components/public/public-container';
import { PublicCtaLink } from '@/components/public/public-cta-link';
import { PublicSection } from '@/components/public/public-section';
import { SectionHeading } from '@/components/public/section-heading';
import { TestimonialsSection } from '@/components/public/testimonials-section';
import { editorialVideoContent, testimonials } from '@/content/public-home';
import { PublicContactForm } from '@/features/public/contact/components/public-contact-form';
import { toFeaturedBook } from '@/features/public/home/lib/featured-books';
import * as BookService from '@/services/books/book.service';
import * as PublicHomeService from '@/services/public-home/public-home.service';
import type { PublicHomeMetrics } from '@/services/public-home/public-home.types';

interface HomeData {
  featuredBooks: FeaturedBook[];
  metrics: PublicHomeMetrics | null;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unknown error';
}

async function getHomeData(): Promise<HomeData> {
  const [featuredBooksResult, metricsResult] = await Promise.allSettled([
    BookService.listFeaturedPublishedBooks(),
    PublicHomeService.getPublicHomeMetrics(),
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

  return {
    featuredBooks:
      featuredBooksResult.status === 'fulfilled'
        ? featuredBooksResult.value.map(toFeaturedBook)
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

  const { featuredBooks, metrics } = await getHomeData();

  return (
    <>
      <PublicSection variant="compact" className="pt-5 md:pt-8">
        <PublicContainer>
          <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
            <div className="overflow-hidden rounded-2xl border border-public-border bg-white shadow-[0_18px_50px_rgba(23,23,23,0.08)]">
              <div className="grid min-h-[24rem] items-center gap-8 bg-[radial-gradient(circle_at_18%_22%,rgba(224,43,32,0.10),transparent_28%),linear-gradient(110deg,#ffffff_0%,#fbf4ec_100%)] p-6 sm:p-8 lg:p-12">
                <div className="max-w-2xl">
                  <h1 className="font-serif-public text-[clamp(2.35rem,6vw,3.75rem)] font-semibold leading-[0.95] tracking-normal text-public-ink">
                    Publicamos libros.
                    <span className="block text-public-red">Acompañamos autores.</span>
                  </h1>
                  <p className="mt-5 max-w-xl text-base leading-7 text-public-ink/80 md:text-lg">
                    Te acompañamos durante todo el proceso editorial, con claridad, cercanía y un
                    equipo que cuida tu obra como merece.
                  </p>
                  <HeroMetrics metrics={metrics} />
                  <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                    <PublicButton href="#contacto">
                      Quiero publicar mi libro
                      <ArrowRight className="size-4" aria-hidden="true" />
                    </PublicButton>
                    <PublicButton href="/servicios-editoriales" variant="secondary">
                      Conocer servicios editoriales
                    </PublicButton>
                  </div>
                </div>
              </div>
            </div>

            <PublicCard id="contacto" className="scroll-mt-24 p-6 sm:p-8 lg:p-10">
              <h2 className="font-serif-public text-3xl font-semibold leading-tight text-public-ink">
                Cuéntanos sobre tu libro
              </h2>
              <p className="mt-3 text-sm leading-6 text-public-muted">
                Déjanos tus datos y te orientamos sobre el proceso editorial más adecuado para tu
                proyecto.
              </p>
              <div className="mt-7">
                <PublicContactForm />
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
              align="center"
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

      <TestimonialsSection testimonials={testimonials} />

      <PublicSection variant="compact" className="pt-0">
        <PublicContainer>
          <PublicCard className="flex flex-col gap-5 p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <h2 className="font-serif-public text-[clamp(1.75rem,4vw,2.5rem)] leading-tight text-public-ink">
                ¿Quieres publicar tu libro con acompañamiento editorial?
              </h2>
              <p className="mt-3 text-base leading-7 text-public-muted">
                Cuéntanos en qué punto está tu proyecto y te orientaremos sobre el camino más
                adecuado.
              </p>
            </div>
            <PublicButton href="#contacto" className="shrink-0">
              Solicitar asesoría
              <ArrowRight className="size-4" aria-hidden="true" />
            </PublicButton>
          </PublicCard>
        </PublicContainer>
      </PublicSection>
    </>
  );
}
