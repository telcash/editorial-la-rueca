import { describe, expect, it } from 'vitest';

import {
  createServiceSchema,
  normalizeServiceSlug,
  updateServiceSchema,
} from './editorial-service.schema';

describe('editorial service schemas', () => {
  it('requires a non-empty name', () => {
    const result = createServiceSchema.safeParse({
      name: '   ',
      slug: 'servicio',
    });

    expect(result.success).toBe(false);
  });

  it('normalizes a provided slug', () => {
    const result = createServiceSchema.parse({
      name: 'Corrección',
      slug: ' Corrección de Manuscrito ',
    });

    expect(result.slug).toBe('correccion-de-manuscrito');
  });

  it('generates the slug from name when creating with an empty slug', () => {
    const result = createServiceSchema.parse({
      name: 'Asesoramiento y acompañamiento editorial',
      slug: '',
    });

    expect(result.slug).toBe('asesoramiento-y-acompanamiento-editorial');
  });

  it('keeps optional descriptions as null for empty form values', () => {
    const result = createServiceSchema.parse({
      name: 'Ghostwriting',
      slug: 'ghostwriting',
      shortDescription: '',
      description: '',
    });

    expect(result.shortDescription).toBeNull();
    expect(result.description).toBeNull();
  });

  it('parses boolean flags and sort order', () => {
    const result = createServiceSchema.parse({
      name: 'Corrección',
      slug: 'correccion',
      isPublished: true,
      isFeatured: true,
      sortOrder: '3',
    });

    expect(result.isPublished).toBe(true);
    expect(result.isFeatured).toBe(true);
    expect(result.sortOrder).toBe(3);
  });

  it('does not regenerate slug on update when slug is empty', () => {
    const result = updateServiceSchema.parse({
      name: 'Nuevo nombre',
      slug: '',
    });

    expect(result).toEqual({ name: 'Nuevo nombre' });
  });

  it('normalizes service slugs consistently', () => {
    expect(normalizeServiceSlug('Escritura por encargo / Ghostwriting')).toBe(
      'escritura-por-encargo-ghostwriting',
    );
  });
});
