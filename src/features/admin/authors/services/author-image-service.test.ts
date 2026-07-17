import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createAuthorImageService,
  getAuthorImagePathFromPublicUrl,
  type AuthorImageStorageBucket,
  type AuthorImageStorageClient,
} from './author-image-service.core';
import { AUTHOR_IMAGE_MAX_SIZE_BYTES, AUTHOR_IMAGES_BUCKET } from './author-image-constants';
import {
  AuthorImageDeleteError,
  AuthorImageUploadError,
  InvalidAuthorImageError,
} from './author-image-errors';

const authorId = '550e8400-e29b-41d4-a716-446655440000';
const imageId = '1d2e4f8a-2a8a-42b9-8d1f-9c8a1f4c7b61';
const imagePath = `${authorId}/${imageId}.jpg`;

function createImageFile(type: string, size = 1024) {
  return new File([new Uint8Array(size)], 'original-name', { type });
}

function createStorageMock() {
  const bucket: AuthorImageStorageBucket = {
    upload: vi.fn().mockResolvedValue({ data: {}, error: null }),
    remove: vi.fn().mockResolvedValue({ data: [], error: null }),
    getPublicUrl: vi.fn((path: string) => ({
      data: {
        publicUrl: `https://storage.example.com/${AUTHOR_IMAGES_BUCKET}/${path}`,
      },
    })),
  };
  const storage: AuthorImageStorageClient = {
    from: vi.fn(() => bucket),
  };

  return { bucket, storage };
}

describe('author image service', () => {
  let storageMock: ReturnType<typeof createStorageMock>;
  let service: ReturnType<typeof createAuthorImageService>;

  beforeEach(() => {
    storageMock = createStorageMock();
    service = createAuthorImageService(storageMock.storage, {
      randomUUID: () => imageId,
    });
  });

  it('accepts valid JPEG images and normalizes the extension to jpg', async () => {
    const result = await service.uploadAuthorImage(authorId, createImageFile('image/jpeg'));

    expect(result).toEqual({
      path: imagePath,
      publicUrl: `https://storage.example.com/${AUTHOR_IMAGES_BUCKET}/${imagePath}`,
      mimeType: 'image/jpeg',
      size: 1024,
    });
    expect(storageMock.bucket.upload).toHaveBeenCalledWith(imagePath, expect.any(File), {
      contentType: 'image/jpeg',
      upsert: false,
    });
  });

  it('accepts PNG and WebP images', async () => {
    await service.uploadAuthorImage(authorId, createImageFile('image/png'));
    await service.uploadAuthorImage(authorId, createImageFile('image/webp'));

    expect(storageMock.bucket.upload).toHaveBeenNthCalledWith(
      1,
      `${authorId}/${imageId}.png`,
      expect.any(File),
      {
        contentType: 'image/png',
        upsert: false,
      },
    );
    expect(storageMock.bucket.upload).toHaveBeenNthCalledWith(
      2,
      `${authorId}/${imageId}.webp`,
      expect.any(File),
      {
        contentType: 'image/webp',
        upsert: false,
      },
    );
  });

  it('rejects invalid MIME types', async () => {
    await expect(service.uploadAuthorImage(authorId, createImageFile('image/gif'))).rejects.toThrow(
      InvalidAuthorImageError,
    );

    expect(storageMock.bucket.upload).not.toHaveBeenCalled();
  });

  it('rejects files over the maximum size', async () => {
    await expect(
      service.uploadAuthorImage(
        authorId,
        createImageFile('image/jpeg', AUTHOR_IMAGE_MAX_SIZE_BYTES + 1),
      ),
    ).rejects.toThrow(InvalidAuthorImageError);

    expect(storageMock.bucket.upload).not.toHaveBeenCalled();
  });

  it('rejects empty files', async () => {
    await expect(
      service.uploadAuthorImage(authorId, createImageFile('image/jpeg', 0)),
    ).rejects.toThrow(InvalidAuthorImageError);

    expect(storageMock.bucket.upload).not.toHaveBeenCalled();
  });

  it('rejects invalid author ids before uploading', async () => {
    await expect(
      service.uploadAuthorImage('not-a-uuid', createImageFile('image/jpeg')),
    ).rejects.toThrow(InvalidAuthorImageError);

    expect(storageMock.bucket.upload).not.toHaveBeenCalled();
  });

  it('rejects unsafe delete paths', async () => {
    await expect(service.deleteAuthorImage('../other-bucket/file.jpg')).rejects.toThrow(
      InvalidAuthorImageError,
    );
    await expect(service.deleteAuthorImage(`${authorId}/not-a-uuid.jpg`)).rejects.toThrow(
      InvalidAuthorImageError,
    );

    expect(storageMock.bucket.remove).not.toHaveBeenCalled();
  });

  it('extracts safe object paths from public URLs', () => {
    expect(
      getAuthorImagePathFromPublicUrl(
        `https://project.supabase.co/storage/v1/object/public/authors/${imagePath}`,
      ),
    ).toBe(imagePath);
    expect(getAuthorImagePathFromPublicUrl('https://example.com/not-storage/file.jpg')).toBeNull();
  });

  it('deletes safe object paths', async () => {
    await service.deleteAuthorImage(imagePath);

    expect(storageMock.bucket.remove).toHaveBeenCalledWith([imagePath]);
  });

  it('replaces an image by uploading first and deleting the previous path after', async () => {
    const previousPath = `${authorId}/7c2f3a5b-1a8e-4f7d-9b2c-6a1e5d4f8c9b.png`;

    const result = await service.replaceAuthorImage(
      authorId,
      createImageFile('image/jpeg'),
      previousPath,
    );

    expect(result.previousImageDeleted).toBe(true);
    expect(vi.mocked(storageMock.bucket.upload).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(storageMock.bucket.remove).mock.invocationCallOrder[0] ?? 0,
    );
    expect(storageMock.bucket.remove).toHaveBeenCalledWith([previousPath]);
  });

  it('throws a domain error when upload fails', async () => {
    vi.mocked(storageMock.bucket.upload).mockResolvedValueOnce({
      data: null,
      error: new Error('internal storage error'),
    });

    await expect(
      service.uploadAuthorImage(authorId, createImageFile('image/jpeg')),
    ).rejects.toThrow(AuthorImageUploadError);
  });

  it('throws a domain error when delete fails', async () => {
    vi.mocked(storageMock.bucket.remove).mockResolvedValueOnce({
      data: null,
      error: new Error('internal storage error'),
    });

    await expect(service.deleteAuthorImage(imagePath)).rejects.toThrow(AuthorImageDeleteError);
  });

  it('keeps the new image when previous deletion fails during replacement', async () => {
    vi.mocked(storageMock.bucket.remove).mockResolvedValueOnce({
      data: null,
      error: new Error('internal storage error'),
    });

    const result = await service.replaceAuthorImage(
      authorId,
      createImageFile('image/jpeg'),
      imagePath,
    );

    expect(result.path).toBe(imagePath);
    expect(result.previousImageDeleted).toBe(false);
    expect(storageMock.bucket.remove).toHaveBeenCalledTimes(1);
  });
});
