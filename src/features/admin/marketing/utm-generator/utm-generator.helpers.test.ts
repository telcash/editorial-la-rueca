import { describe, expect, it } from 'vitest';

import {
  buildUtmUrl,
  formatUtmVariant,
  getCampaignValue,
  normalizeUtmValue,
} from './utm-generator.helpers';

const baseUrl = new URL('https://editoriallarueca.com');
const values = {
  source: 'instagram',
  medium: 'social',
  campaign: 'publica_tu_libro',
  format: 'reel',
  contentIdentifier: 'Manuscrito del cajón',
  variant: '1',
  term: '',
};

describe('UTM generator helpers', () => {
  it('normalizes editorial values using underscores', () => {
    expect(normalizeUtmValue('Manuscrito del cajón')).toBe('manuscrito_del_cajon');
    expect(getCampaignValue('event', 'Presentación Kotigoroshko')).toBe(
      'evento_presentacion_kotigoroshko',
    );
  });

  it('formats variants as two digits and rejects invalid values', () => {
    expect(formatUtmVariant('1')).toBe('01');
    expect(formatUtmVariant('10')).toBe('10');
    expect(formatUtmVariant('0')).toBe('');
    expect(formatUtmVariant('-1')).toBe('');
  });

  it('builds a URL with query parameters before the hash', () => {
    const result = buildUtmUrl({
      baseUrl,
      destination: { type: 'contact' },
      values,
    });

    expect(result).toBe(
      'https://editoriallarueca.com/?utm_source=instagram&utm_medium=social&utm_campaign=publica_tu_libro&utm_content=reel_manuscrito_del_cajon_01#publica-tu-libro',
    );
  });

  it('replaces old UTM values and rejects unsafe custom destinations', () => {
    const result = buildUtmUrl({
      baseUrl,
      destination: { type: 'custom', customUrl: '/libros/demo?foo=bar&utm_source=old#info' },
      values: { ...values, term: 'Madrid' },
    });

    expect(result).toContain('foo=bar');
    expect(result).toContain('utm_source=instagram');
    expect(result).toContain('utm_term=madrid');
    expect(result).not.toContain('old');
    expect(
      buildUtmUrl({
        baseUrl,
        destination: { type: 'custom', customUrl: 'javascript:alert(1)' },
        values,
      }),
    ).toBeNull();
  });
});
