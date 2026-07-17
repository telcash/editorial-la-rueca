import { describe, expect, it } from 'vitest';

import { getAuthorCreateInput, getAuthorFormValues } from './author-form-data';

describe('author form data adapter', () => {
  it('maps form data to create author input', () => {
    const formData = new FormData();

    formData.set('name', 'Ana Pérez');
    formData.set('slug', 'ana-perez');
    formData.set('shortBio', 'Bio breve');
    formData.set('biography', 'Biografía completa');
    formData.set('photoUrl', 'https://example.com/photo.jpg');
    formData.set('websiteUrl', 'https://example.com');
    formData.set('instagramUrl', 'https://instagram.com/ana');
    formData.set('facebookUrl', 'https://facebook.com/ana');
    formData.set('country', 'España');
    formData.append('isPublished', 'false');
    formData.append('isPublished', 'true');
    formData.set('isFeatured', 'false');
    formData.set('sortOrder', '3');

    expect(getAuthorCreateInput(formData)).toEqual({
      name: 'Ana Pérez',
      slug: 'ana-perez',
      shortBio: 'Bio breve',
      biography: 'Biografía completa',
      photoUrl: 'https://example.com/photo.jpg',
      websiteUrl: 'https://example.com',
      instagramUrl: 'https://instagram.com/ana',
      facebookUrl: 'https://facebook.com/ana',
      country: 'España',
      isPublished: true,
      isFeatured: false,
      sortOrder: 3,
    });
  });

  it('keeps previous form values for repopulating fields', () => {
    const formData = new FormData();

    formData.set('name', 'Nombre');
    formData.set('slug', 'slug');
    formData.set('sortOrder', '');

    expect(getAuthorFormValues(formData)).toMatchObject({
      name: 'Nombre',
      slug: 'slug',
      isPublished: false,
      isFeatured: false,
      sortOrder: '0',
    });
  });

  it('maps isPublished as true when enabled', () => {
    const formData = new FormData();

    formData.set('isPublished', 'true');

    expect(getAuthorFormValues(formData).isPublished).toBe(true);
  });

  it('maps isPublished as false when absent', () => {
    const formData = new FormData();

    expect(getAuthorFormValues(formData).isPublished).toBe(false);
  });

  it('maps isFeatured as true when enabled', () => {
    const formData = new FormData();

    formData.set('isFeatured', 'true');

    expect(getAuthorFormValues(formData).isFeatured).toBe(true);
  });

  it('maps isFeatured as false when absent', () => {
    const formData = new FormData();

    expect(getAuthorFormValues(formData).isFeatured).toBe(false);
  });
});
