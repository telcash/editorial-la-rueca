import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../../public/brand/home-hero-almudena.webp', () => ({
  default: {
    src: '/_next/static/media/home-hero-almudena.test-content-hash.webp',
    width: 1575,
    height: 1225,
  },
}));

import { PublicHomeHero } from './public-home-hero';

describe('PublicHomeHero', () => {
  it('preserves the headline, description and both existing destinations', () => {
    const html = renderToStaticMarkup(
      <PublicHomeHero metrics={null}>
        <div id="publica-tu-libro">Contact form</div>
      </PublicHomeHero>,
    );
    expect(html.match(/<h1\b/g)).toHaveLength(1);
    expect(html).toContain('Publicamos libros');
    expect(html).toContain('Acompañamos autores');
    expect(html).toContain('Te acompañamos durante todo el proceso editorial, con claridad');
    expect(html).toContain('equipo que cuida tu obra como merece.');
    expect(html).toContain('href="#publica-tu-libro"');
    expect(html).toContain('Quiero publicar mi libro');
    expect(html).toContain('href="/libros"');
    expect(html).toContain('Ver catálogo');
  });

  it('uses the statically imported photograph with a content-hashed URL and priority loading', () => {
    const html = renderToStaticMarkup(
      <PublicHomeHero metrics={null}>
        <div />
      </PublicHomeHero>,
    );
    expect(html.match(/<img\b/g)).toHaveLength(1);
    expect(html).toContain(
      encodeURIComponent('/_next/static/media/home-hero-almudena.test-content-hash.webp'),
    );
    expect(html).not.toContain(encodeURIComponent('/brand/home-hero-almudena.webp'));
    expect(html).toContain('alt=""');
    expect(html).toContain('data-nimg="fill"');
    expect(html).toContain('rel="preload"');
    expect(html).not.toContain('home-hero.png');
    expect(
      readFileSync(join(process.cwd(), 'public/brand/home-hero-almudena.webp')).length,
    ).toBeGreaterThan(0);
  });

  it('renders the existing metrics and contact content once, without owning their behavior', () => {
    const html = renderToStaticMarkup(
      <PublicHomeHero metrics={<div>270 libros publicados · 152 autores acompañados</div>}>
        <div id="publica-tu-libro">
          <h2>Cuéntanos sobre tu libro</h2>
          <form action="/existing-contact-action">
            <input name="email" type="email" />
          </form>
        </div>
      </PublicHomeHero>,
    );
    expect(html.match(/270 libros publicados/g)).toHaveLength(1);
    expect(html.match(/Cuéntanos sobre tu libro/g)).toHaveLength(1);
    expect(html.match(/<form\b/g)).toHaveLength(1);
    expect(html.indexOf('270 libros publicados')).toBeLessThan(html.indexOf('<form'));
    expect(html).toContain('action="/existing-contact-action"');
    expect(html).toContain('name="email"');
  });
});
