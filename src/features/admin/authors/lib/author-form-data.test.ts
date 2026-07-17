import { describe, expect, it } from 'vitest';

import type { Author } from '@/db/schema';
import { updateAuthorSchema } from '@/schemas/authors/author.schema';
import {
  getAuthorCreateInput,
  getAuthorFormValues,
  getAuthorFormValuesFromAuthor,
  getAuthorUpdateInput,
} from './author-form-data';

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

  it('maps form data to update author input', () => {
    const formData = new FormData();

    formData.set('name', 'Autora Editada');
    formData.set('slug', 'autora-editada');
    formData.set('shortBio', '');
    formData.set('biography', '');
    formData.set('photoUrl', 'https://attacker.example/photo.jpg');
    formData.set('websiteUrl', '');
    formData.set('instagramUrl', '');
    formData.set('facebookUrl', '');
    formData.set('country', '');
    formData.set('isPublished', 'true');
    formData.set('isFeatured', 'true');
    formData.set('sortOrder', '7');

    expect(getAuthorUpdateInput(formData)).toEqual({
      name: 'Autora Editada',
      slug: 'autora-editada',
      shortBio: '',
      biography: '',
      websiteUrl: '',
      instagramUrl: '',
      facebookUrl: '',
      country: '',
      isPublished: true,
      isFeatured: true,
      sortOrder: 7,
    });
  });

  it('lets updateAuthorSchema normalize empty strings to null', () => {
    const formData = new FormData();

    formData.set('name', 'Autora Editada');
    formData.set('slug', 'autora-editada');
    formData.set('shortBio', '');
    formData.set('biography', '');
    formData.set('photoUrl', 'https://attacker.example/photo.jpg');
    formData.set('websiteUrl', '');
    formData.set('instagramUrl', '');
    formData.set('facebookUrl', '');
    formData.set('country', '');
    formData.set('sortOrder', '0');

    expect(updateAuthorSchema.parse(getAuthorUpdateInput(formData))).toMatchObject({
      shortBio: null,
      biography: null,
      websiteUrl: null,
      instagramUrl: null,
      facebookUrl: null,
      country: null,
    });
  });

  it('maps an author record to editable form values', () => {
    const author: Author = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Autora Existente',
      slug: 'autora-existente',
      shortBio: null,
      biography: 'Texto largo',
      photoUrl: null,
      websiteUrl: 'https://example.com',
      instagramUrl: null,
      facebookUrl: null,
      country: 'España',
      isPublished: true,
      isFeatured: false,
      sortOrder: 4,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    };

    expect(getAuthorFormValuesFromAuthor(author)).toEqual({
      name: 'Autora Existente',
      slug: 'autora-existente',
      shortBio: '',
      biography: 'Texto largo',
      photoUrl: '',
      websiteUrl: 'https://example.com',
      instagramUrl: '',
      facebookUrl: '',
      country: 'España',
      isPublished: true,
      isFeatured: false,
      sortOrder: '4',
    });
  });
});
