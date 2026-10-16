import Image from 'next/image';
import { Coustard } from 'next/font/google';

import { PublicContainer } from './public-container';
import { PublicSection } from './public-section';

const coustard = Coustard({
  subsets: ['latin'],
  weight: '400',
  display: 'swap',
});

const partners = [
  {
    name: 'Amazon Kindle Direct Publishing',
    company: 'Amazon',
    file: 'amazon.jpg',
    width: 268,
    height: 80,
    href: 'https://kdp.amazon.com/es_ES/',
  },
  {
    name: 'Azeta',
    company: 'Azeta',
    file: 'azeta.png',
    width: 185,
    height: 44,
    href: 'https://www.azeta.es/',
  },
  {
    name: 'Podibooks',
    company: 'Podibooks',
    file: 'podibooks.jpg',
    width: 273,
    height: 95,
    href: 'https://www.podibooks.com/',
  },
  {
    name: 'Quares',
    company: 'Quares',
    file: 'quares.jpg',
    width: 290,
    height: 99,
    href: 'https://www.quares.es/',
  },
] as const;

export function DistributionSection() {
  return (
    <PublicSection
      id="distribucion"
      variant="compact"
      aria-labelledby="distribution-heading"
      className="bg-white"
    >
      <PublicContainer>
        <div className="mx-auto max-w-public-reading text-center">
          <p className="text-xs font-semibold text-public-red">MÁS ALLÁ DE LA PUBLICACIÓN</p>
          <h2
            id="distribution-heading"
            className={`${coustard.className} mt-3 text-3xl leading-tight text-public-ink md:text-4xl`}
          >
            Publicar tu libro es solo el comienzo
          </h2>
          <p className="mt-4 text-public-body text-public-muted">
            En Editorial La Rueca te acompañamos también en su distribución, facilitando que tu obra
            llegue a librerías y plataformas de venta a través de nuestros colaboradores
            especializados.
          </p>
        </div>
        <ul
          role="list"
          aria-label="Canales de distribución y colaboradores comerciales"
          className="mt-8 grid grid-cols-2 items-center gap-x-8 gap-y-6 md:grid-cols-4"
        >
          {partners.map((partner) => (
            <li
              key={partner.file}
              className="mx-auto flex h-24 w-full min-w-0 max-w-[220px] items-center justify-center"
            >
              <a
                href={partner.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Visitar la web oficial de ${partner.company} (se abre en una pestaña nueva)`}
                className="flex h-full w-full items-center justify-center rounded-sm transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-public-red focus-visible:ring-offset-4 motion-reduce:transition-none"
              >
                <Image
                  src={`/distribution/${partner.file}`}
                  alt={partner.name}
                  width={partner.width}
                  height={partner.height}
                  sizes="(min-width: 768px) 220px, 42vw"
                  className="h-auto w-full object-contain"
                />
              </a>
            </li>
          ))}
        </ul>
      </PublicContainer>
    </PublicSection>
  );
}
