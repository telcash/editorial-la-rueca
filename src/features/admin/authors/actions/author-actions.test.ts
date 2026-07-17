import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Author } from '@/db/schema';
import { AuthorSlugConflictError } from '@/services/authors/author.errors';
import { AuthorImageUploadError } from '../services/author-image-errors';

const mocks = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  redirect: vi.fn(() => {
    throw new Error('NEXT_REDIRECT');
  }),
  requireEditorialStaff: vi.fn(),
  createAuthor: vi.fn(),
  updateAuthor: vi.fn(),
  getAuthorById: vi.fn(),
  uploadAuthorImage: vi.fn(),
  replaceAuthorImage: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: mocks.revalidatePath,
}));

vi.mock('next/navigation', () => ({
  redirect: mocks.redirect,
}));

vi.mock('@/services/auth/access.service', () => ({
  requireEditorialStaff: mocks.requireEditorialStaff,
}));

vi.mock('@/services/authors/author.service', () => ({
  createAuthor: mocks.createAuthor,
  updateAuthor: mocks.updateAuthor,
  getAuthorById: mocks.getAuthorById,
}));

vi.mock('../services/author-image-service', () => ({
  uploadAuthorImage: mocks.uploadAuthorImage,
  replaceAuthorImage: mocks.replaceAuthorImage,
}));

const { createAuthor } = await import('./create-author');
const { updateAuthor } = await import('./update-author');

const authorId = '550e8400-e29b-41d4-a716-446655440000';
const existingImageId = '1d2e4f8a-2a8a-42b9-8d1f-9c8a1f4c7b61';
const existingPhotoUrl = `https://project.supabase.co/storage/v1/object/public/authors/${authorId}/${existingImageId}.jpg`;

const baseAuthor: Author = {
  id: authorId,
  name: 'Ana Autora',
  slug: 'ana-autora',
  shortBio: null,
  biography: null,
  photoUrl: null,
  websiteUrl: null,
  instagramUrl: null,
  facebookUrl: null,
  country: null,
  isFeatured: false,
  isPublished: false,
  sortOrder: 0,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
};

function createValidFormData() {
  const formData = new FormData();

  formData.set('name', 'Ana Autora');
  formData.set('slug', 'ana-autora');
  formData.set('shortBio', '');
  formData.set('biography', '');
  formData.set('websiteUrl', '');
  formData.set('instagramUrl', '');
  formData.set('facebookUrl', '');
  formData.set('country', '');
  formData.set('isPublished', 'false');
  formData.set('isFeatured', 'false');
  formData.set('sortOrder', '0');

  return formData;
}

function createImageFile(type = 'image/jpeg', size = 1024) {
  return new File([new Uint8Array(size)], 'photo', { type });
}

describe('author server actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireEditorialStaff.mockResolvedValue({ role: 'editor' });
    mocks.createAuthor.mockResolvedValue(baseAuthor);
    mocks.updateAuthor.mockResolvedValue(baseAuthor);
    mocks.getAuthorById.mockResolvedValue(baseAuthor);
    mocks.uploadAuthorImage.mockResolvedValue({
      path: `${authorId}/7c2f3a5b-1a8e-4f7d-9b2c-6a1e5d4f8c9b.jpg`,
      publicUrl: 'https://project.supabase.co/storage/v1/object/public/authors/new.jpg',
      mimeType: 'image/jpeg',
      size: 1024,
    });
    mocks.replaceAuthorImage.mockResolvedValue({
      path: `${authorId}/7c2f3a5b-1a8e-4f7d-9b2c-6a1e5d4f8c9b.jpg`,
      publicUrl: 'https://project.supabase.co/storage/v1/object/public/authors/replaced.jpg',
      mimeType: 'image/jpeg',
      size: 1024,
      previousImageDeleted: true,
    });
  });

  it('creates an author without an image', async () => {
    await expect(createAuthor({} as never, createValidFormData())).rejects.toThrow('NEXT_REDIRECT');

    expect(mocks.createAuthor).toHaveBeenCalledWith(
      expect.not.objectContaining({
        photoUrl: expect.any(String),
      }),
    );
    expect(mocks.uploadAuthorImage).not.toHaveBeenCalled();
  });

  it('creates an author and uploads an image', async () => {
    const formData = createValidFormData();
    formData.set('photo', createImageFile());

    await expect(createAuthor({} as never, formData)).rejects.toThrow('NEXT_REDIRECT');

    expect(mocks.createAuthor).toHaveBeenCalledOnce();
    expect(mocks.uploadAuthorImage).toHaveBeenCalledWith(authorId, expect.any(File));
    expect(mocks.updateAuthor).toHaveBeenCalledWith(authorId, {
      photoUrl: 'https://project.supabase.co/storage/v1/object/public/authors/new.jpg',
    });
  });

  it('returns a clear error when image upload fails after creating an author', async () => {
    const formData = createValidFormData();
    formData.set('photo', createImageFile());
    mocks.uploadAuthorImage.mockRejectedValueOnce(new AuthorImageUploadError());

    const state = await createAuthor({} as never, formData);

    expect(mocks.createAuthor).toHaveBeenCalledOnce();
    expect(state.formError).toBe('El autor fue creado, pero no se pudo subir la imagen.');
  });

  it('treats an empty file as no image', async () => {
    const formData = createValidFormData();
    formData.set('photo', createImageFile('image/jpeg', 0));

    await expect(createAuthor({} as never, formData)).rejects.toThrow('NEXT_REDIRECT');

    expect(mocks.uploadAuthorImage).not.toHaveBeenCalled();
  });

  it('returns a photo field error for invalid files before creating', async () => {
    const formData = createValidFormData();
    formData.set('photo', createImageFile('image/gif'));

    const state = await createAuthor({} as never, formData);

    expect(state.fieldErrors.photo).toBeDefined();
    expect(mocks.createAuthor).not.toHaveBeenCalled();
  });

  it('does not trust photoUrl sent in FormData', async () => {
    const formData = createValidFormData();
    formData.set('photoUrl', 'https://attacker.example/image.jpg');

    await expect(createAuthor({} as never, formData)).rejects.toThrow('NEXT_REDIRECT');

    expect(mocks.createAuthor).toHaveBeenCalledWith(
      expect.not.objectContaining({
        photoUrl: 'https://attacker.example/image.jpg',
      }),
    );
  });

  it('updates an author without changing its image', async () => {
    await expect(updateAuthor(authorId, {} as never, createValidFormData())).rejects.toThrow(
      'NEXT_REDIRECT',
    );

    expect(mocks.getAuthorById).toHaveBeenCalledWith(authorId);
    expect(mocks.updateAuthor).toHaveBeenCalledOnce();
    expect(mocks.replaceAuthorImage).not.toHaveBeenCalled();
  });

  it('updates an author and replaces its image', async () => {
    const formData = createValidFormData();
    formData.set('photo', createImageFile());
    mocks.getAuthorById.mockResolvedValueOnce({
      ...baseAuthor,
      photoUrl: existingPhotoUrl,
    });

    await expect(updateAuthor(authorId, {} as never, formData)).rejects.toThrow('NEXT_REDIRECT');

    expect(mocks.replaceAuthorImage).toHaveBeenCalledWith(
      authorId,
      expect.any(File),
      `${authorId}/${existingImageId}.jpg`,
    );
    expect(mocks.updateAuthor).toHaveBeenLastCalledWith(authorId, {
      photoUrl: 'https://project.supabase.co/storage/v1/object/public/authors/replaced.jpg',
    });
  });

  it('does not upload an image when slug update conflicts', async () => {
    const formData = createValidFormData();
    formData.set('slug', 'slug-existente');
    formData.set('photo', createImageFile());
    mocks.updateAuthor.mockRejectedValueOnce(new AuthorSlugConflictError('slug-existente'));

    const state = await updateAuthor(authorId, {} as never, formData);

    expect(state.fieldErrors.slug).toBeDefined();
    expect(mocks.replaceAuthorImage).not.toHaveBeenCalled();
  });
});
