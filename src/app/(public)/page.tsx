import { ArrowRight, Play, Quote } from 'lucide-react';

import {
  FeaturedBooksCarousel,
  type FeaturedBook,
} from '@/components/public/featured-books-carousel';
import { PublicButton } from '@/components/public/public-button';
import { PublicCard } from '@/components/public/public-card';
import { PublicContainer } from '@/components/public/public-container';
import { PublicCtaLink } from '@/components/public/public-cta-link';
import { PublicSection } from '@/components/public/public-section';
import { SectionHeading } from '@/components/public/section-heading';

const placeholderSections = [
  {
    title: 'Libros destacados',
    description: 'Espacio reservado para destacar libros publicados desde el catálogo.',
  },
  {
    title: 'Testimonios de autores',
    description: 'Área futura para experiencias reales de autores acompañados por la editorial.',
  },
];

const featuredBookPlaceholders: FeaturedBook[] = Array.from({ length: 8 }, (_, index) => ({
  id: `featured-book-${index + 1}`,
  title: `Libro destacado ${String(index + 1).padStart(2, '0')}`,
  slug: `libro-destacado-${index + 1}`,
  coverUrl: null,
  authors: ['Autor pendiente'],
}));

export default function PublicHomePage() {
  return (
    <>
      <PublicSection variant="compact" className="pt-5 md:pt-8">
        <PublicContainer>
          <div className="grid gap-6 lg:grid-cols-[1.55fr_0.95fr]">
            <div className="overflow-hidden rounded-2xl border border-public-border bg-white shadow-[0_18px_50px_rgba(23,23,23,0.08)]">
              <div className="grid min-h-[24rem] items-center gap-8 bg-[radial-gradient(circle_at_18%_22%,rgba(224,43,32,0.10),transparent_28%),linear-gradient(110deg,#ffffff_0%,#fbf4ec_100%)] p-6 sm:p-8 lg:p-12">
                <div className="max-w-2xl">
                  <p className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-public-red">
                    Arquitectura pública
                  </p>
                  <h1 className="font-serif-public text-[clamp(2.35rem,6vw,3.75rem)] font-semibold leading-[0.95] tracking-normal text-public-ink">
                    Publicamos libros.
                    <span className="block text-public-red">Acompañamos autores.</span>
                  </h1>
                  <p className="mt-5 max-w-xl text-base leading-7 text-public-ink/80 md:text-lg">
                    Base visual temporal para validar header, footer, espaciado, tipografía y
                    estructura responsive antes de conectar contenido real.
                  </p>
                  <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                    <PublicButton href="#contacto">
                      Solicitar asesoría
                      <ArrowRight className="size-4" aria-hidden="true" />
                    </PublicButton>
                    <PublicButton href="/libros" variant="secondary">
                      Ver catálogo
                    </PublicButton>
                  </div>
                </div>
              </div>
            </div>

            <PublicCard id="contacto" className="p-6 sm:p-8 lg:p-10">
              <h2 className="font-serif-public text-3xl font-semibold leading-tight text-public-ink">
                Cuéntanos tu proyecto
              </h2>
              <p className="mt-3 text-sm leading-6 text-public-muted">
                Placeholder visual para el futuro formulario de contacto. En este sprint no se
                capturan datos ni se envía información.
              </p>
              <div className="mt-8 grid gap-3" aria-hidden="true">
                <div className="h-12 rounded-lg border border-public-border bg-white" />
                <div className="h-12 rounded-lg border border-public-border bg-white" />
                <div className="h-28 rounded-lg border border-public-border bg-white" />
                <div className="h-12 rounded-lg bg-public-red" />
              </div>
            </PublicCard>
          </div>
        </PublicContainer>
      </PublicSection>

      <PublicSection>
        <PublicContainer className="space-y-14">
          <div>
            <SectionHeading
              title={placeholderSections[0].title}
              description={placeholderSections[0].description}
              action={<PublicCtaLink href="/libros">Ver catálogo completo</PublicCtaLink>}
              align="center"
            />
            <FeaturedBooksCarousel books={featuredBookPlaceholders} className="mt-8" />
          </div>

          <PublicCard className="grid overflow-hidden p-3 md:grid-cols-[1.15fr_1fr] md:p-4 lg:p-5">
            <div className="relative aspect-video overflow-hidden rounded-xl bg-[linear-gradient(135deg,#eee8df,#ffffff)]">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_32%_24%,rgba(224,43,32,0.16),transparent_30%)]" />
              <div className="absolute inset-x-8 bottom-8 top-10 rounded-t-full bg-public-border/55" />
              <button
                type="button"
                aria-label="Reproducir video de presentación de Almudena"
                className="absolute left-1/2 top-1/2 inline-flex size-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-public-red shadow-[0_12px_30px_rgba(23,23,23,0.16)] transition hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-public-red focus-visible:ring-offset-2"
              >
                <Play className="ml-1 size-7 fill-current" aria-hidden="true" />
              </button>
            </div>
            <div className="flex flex-col justify-center p-5 md:p-8">
              <h2 className="font-serif-public text-[clamp(1.75rem,3vw,2.5rem)] font-semibold leading-tight text-public-ink">
                Conoce a Almudena
              </h2>
              <p className="mt-1 text-sm font-bold text-public-red">
                Directora de Editorial La Rueca
              </p>
              <p className="mt-4 text-sm leading-7 text-public-muted md:text-base">
                Espacio preparado para presentar el acompañamiento editorial, la mirada de la
                dirección y el cuidado de cada proyecto antes de conectar contenido real.
              </p>
              <blockquote className="mt-6 rounded-2xl bg-public-surface-subtle p-5 text-sm leading-6 text-public-ink/80">
                <Quote className="mb-3 size-7 text-public-red" aria-hidden="true" />
                Cada libro merece una edición honesta, cercana y profesional.
              </blockquote>
              <PublicCtaLink href="#testimonios" className="mt-5">
                Ver más testimonios
              </PublicCtaLink>
            </div>
          </PublicCard>

          <div id="testimonios">
            <SectionHeading
              title={placeholderSections[1].title}
              description={placeholderSections[1].description}
            />
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {[0, 1, 2].map((item) => (
                <PublicCard key={item} className="min-h-40 p-5">
                  <Quote className="size-9 text-public-border" aria-hidden="true" />
                  <div className="mt-5 space-y-2">
                    <div className="h-3 w-full rounded-full bg-public-border" />
                    <div className="h-3 w-5/6 rounded-full bg-public-border/70" />
                    <div className="h-3 w-3/5 rounded-full bg-public-border/70" />
                  </div>
                  <div className="mt-6 h-3 w-32 rounded-full bg-public-ink/20" />
                </PublicCard>
              ))}
            </div>
          </div>
        </PublicContainer>
      </PublicSection>
    </>
  );
}
