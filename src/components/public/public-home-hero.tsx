import type { ReactNode } from 'react';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';

import { PublicButton } from '@/components/public/public-button';
import { PublicContainer } from '@/components/public/public-container';
import { PublicSection } from '@/components/public/public-section';

import styles from './public-home-hero.module.css';

interface PublicHomeHeroProps {
  metrics: ReactNode;
  children: ReactNode;
}

export function PublicHomeHero({ metrics, children }: PublicHomeHeroProps) {
  return (
    <PublicSection variant="compact" className={styles.hero}>
      <PublicContainer size="wide">
        <div className={styles.grid}>
          <div className={styles.introduction}>
            <div className={styles.photograph} aria-hidden="true">
              <Image
                src="/brand/home-hero-almudena.webp"
                alt=""
                fill
                priority
                sizes="(min-width: 1600px) 1280px, (min-width: 1440px) 82vw, 100vw"
                className={styles.image}
              />
              <div className={styles.fade} />
            </div>
            <div className={styles.copy}>
              <h1 className="font-serif-public text-public-display font-semibold tracking-normal text-public-ink">
                Publicamos libros
                <span className="block text-public-red">Acompañamos autores</span>
              </h1>
              <p className="mt-public-heading-gap max-w-xl text-xl font-medium leading-relaxed text-public-ink/85 md:text-2xl">
                Te acompañamos durante todo el proceso editorial, con claridad, cercanía y un equipo
                que cuida tu obra como merece.
              </p>
              {metrics}
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <PublicButton href="#publica-tu-libro">
                  Quiero publicar mi libro
                  <ArrowRight className="size-4" aria-hidden="true" />
                </PublicButton>
                <PublicButton href="/libros" variant="secondary">
                  Ver catálogo
                </PublicButton>
              </div>
            </div>
          </div>
          {children}
        </div>
      </PublicContainer>
    </PublicSection>
  );
}
