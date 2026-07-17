import { describe, expect, it } from 'vitest';

import { createAuthorSchema, normalizeAuthorSlug, updateAuthorSchema } from './author.schema';

describe('normalizeAuthorSlug', () => {
  it.each([
    ['  Juan Perez  ', 'juan-perez'],
    ['Autor__De   Prueba', 'autor-de-prueba'],
    ['--Nombre---Autor--', 'nombre-autor'],
    ['Maria & Jose', 'maria-jose'],
    ['  Juan Pérez  ', 'juan-prez'],
    ['María & José', 'mara-jos'],
  ])('normalizes "%s" to "%s"', (input, expected) => {
    expect(normalizeAuthorSlug(input)).toBe(expected);
  });
});

describe('createAuthorSchema', () => {
  it('accepts a minimal valid author and applies defaults', () => {
    const result = createAuthorSchema.parse({
      name: '  Ana Autora  ',
      slug: ' Ana Autora ',
    });

    expect(result).toEqual({
      name: 'Ana Autora',
      slug: 'ana-autora',
      isFeatured: false,
      isPublished: false,
      sortOrder: 0,
    });
  });

  it('converts empty optional strings to null and accepts valid URLs', () => {
    const result = createAuthorSchema.parse({
      name: 'Autor Valido',
      slug: 'autor-valido',
      shortBio: '',
      biography: '   ',
      photoUrl: '',
      websiteUrl: 'https://example.com',
      instagramUrl: 'https://instagram.com/editorial',
      facebookUrl: 'https://facebook.com/editorial',
      country: '',
    });

    expect(result.shortBio).toBeNull();
    expect(result.biography).toBeNull();
    expect(result.photoUrl).toBeNull();
    expect(result.websiteUrl).toBe('https://example.com');
    expect(result.instagramUrl).toBe('https://instagram.com/editorial');
    expect(result.facebookUrl).toBe('https://facebook.com/editorial');
    expect(result.country).toBeNull();
  });

  it('rejects invalid URLs', () => {
    expect(() =>
      createAuthorSchema.parse({
        name: 'Autor Valido',
        slug: 'autor-valido',
        websiteUrl: 'not-a-url',
      }),
    ).toThrow();
  });

  it('rejects names shorter than 2 characters', () => {
    expect(() =>
      createAuthorSchema.parse({
        name: 'A',
        slug: 'autor-valido',
      }),
    ).toThrow();
  });

  it('rejects slugs that normalize to an empty value', () => {
    expect(() =>
      createAuthorSchema.parse({
        name: 'Autor Valido',
        slug: '!!!',
      }),
    ).toThrow();
  });

  it('rejects negative and decimal sort orders', () => {
    expect(() =>
      createAuthorSchema.parse({
        name: 'Autor Valido',
        slug: 'autor-valido',
        sortOrder: -1,
      }),
    ).toThrow();

    expect(() =>
      createAuthorSchema.parse({
        name: 'Autor Valido',
        slug: 'autor-valido',
        sortOrder: 1.5,
      }),
    ).toThrow();
  });

  it('rejects unknown properties and protected fields', () => {
    expect(() =>
      createAuthorSchema.parse({
        name: 'Autor Valido',
        slug: 'autor-valido',
        unknown: 'value',
      }),
    ).toThrow();

    expect(() =>
      createAuthorSchema.parse({
        name: 'Autor Valido',
        slug: 'autor-valido',
        id: '550e8400-e29b-41d4-a716-446655440000',
      }),
    ).toThrow();

    expect(() =>
      createAuthorSchema.parse({
        name: 'Autor Valido',
        slug: 'autor-valido',
        createdAt: new Date(),
      }),
    ).toThrow();

    expect(() =>
      createAuthorSchema.parse({
        name: 'Autor Valido',
        slug: 'autor-valido',
        updatedAt: new Date(),
      }),
    ).toThrow();
  });
});

describe('updateAuthorSchema', () => {
  it('accepts an update with a single field', () => {
    expect(updateAuthorSchema.parse({ name: ' Nuevo Nombre ' })).toEqual({
      name: 'Nuevo Nombre',
    });
  });

  it('normalizes slug values', () => {
    expect(updateAuthorSchema.parse({ slug: 'Nuevo__Slug' })).toEqual({
      slug: 'nuevo-slug',
    });
  });

  it('converts empty optional strings to null', () => {
    expect(
      updateAuthorSchema.parse({
        shortBio: '',
        biography: '   ',
        photoUrl: '',
        country: '',
      }),
    ).toEqual({
      shortBio: null,
      biography: null,
      photoUrl: null,
      country: null,
    });
  });

  it('rejects an empty object', () => {
    expect(() => updateAuthorSchema.parse({})).toThrow();
  });

  it('rejects unknown properties and protected fields', () => {
    expect(() => updateAuthorSchema.parse({ unknown: 'value' })).toThrow();
    expect(() =>
      updateAuthorSchema.parse({ id: '550e8400-e29b-41d4-a716-446655440000' }),
    ).toThrow();
    expect(() => updateAuthorSchema.parse({ createdAt: new Date() })).toThrow();
    expect(() => updateAuthorSchema.parse({ updatedAt: new Date() })).toThrow();
  });
});
