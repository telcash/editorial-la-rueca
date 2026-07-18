import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BOOK_COVER_MAX_SIZE_BYTES, BOOK_COVERS_BUCKET } from './book-cover-constants';
import {
  BookCoverDeleteError,
  BookCoverUploadError,
  InvalidBookCoverError,
} from './book-cover-errors';
import {
  createBookCoverService,
  getBookCoverPathFromPublicUrl,
  type BookCoverStorageBucket,
  type BookCoverStorageClient,
} from './book-cover-service.core';

const bookId = '550e8400-e29b-41d4-a716-446655440000';
const coverId = '1d2e4f8a-2a8a-42b9-8d1f-9c8a1f4c7b61';
const coverPath = `${bookId}/${coverId}.jpg`;

function createImageFile(type: string, size = 1024) {
  return new File([new Uint8Array(size)], 'original-name', { type });
}

function createStorageMock() {
  const bucket: BookCoverStorageBucket = {
    upload: vi.fn().mockResolvedValue({ data: {}, error: null }),
    remove: vi.fn().mockResolvedValue({ data: [], error: null }),
    getPublicUrl: vi.fn((path: string) => ({
      data: {
        publicUrl: `https://storage.example.com/${BOOK_COVERS_BUCKET}/${path}`,
      },
    })),
  };
  const storage: BookCoverStorageClient = {
    from: vi.fn(() => bucket),
  };

  return { bucket, storage };
}

describe('book cover service', () => {
  let storageMock: ReturnType<typeof createStorageMock>;
  let service: ReturnType<typeof createBookCoverService>;

  beforeEach(() => {
    storageMock = createStorageMock();
    service = createBookCoverService(storageMock.storage, {
      randomUUID: () => coverId,
    });
  });

  it('accepts valid JPEG images and normalizes the extension to jpg', async () => {
    const result = await service.uploadBookCover(bookId, createImageFile('image/jpeg'));

    expect(result).toEqual({
      path: coverPath,
      publicUrl: `https://storage.example.com/${BOOK_COVERS_BUCKET}/${coverPath}`,
      mimeType: 'image/jpeg',
      size: 1024,
    });
    expect(storageMock.bucket.upload).toHaveBeenCalledWith(coverPath, expect.any(File), {
      contentType: 'image/jpeg',
      upsert: false,
    });
  });

  it('accepts PNG and WebP images', async () => {
    await service.uploadBookCover(bookId, createImageFile('image/png'));
    await service.uploadBookCover(bookId, createImageFile('image/webp'));

    expect(storageMock.bucket.upload).toHaveBeenNthCalledWith(
      1,
      `${bookId}/${coverId}.png`,
      expect.any(File),
      {
        contentType: 'image/png',
        upsert: false,
      },
    );
    expect(storageMock.bucket.upload).toHaveBeenNthCalledWith(
      2,
      `${bookId}/${coverId}.webp`,
      expect.any(File),
      {
        contentType: 'image/webp',
        upsert: false,
      },
    );
  });

  it('rejects invalid MIME types, oversized files, empty files and invalid ids', async () => {
    await expect(service.uploadBookCover(bookId, createImageFile('image/gif'))).rejects.toThrow(
      InvalidBookCoverError,
    );
    await expect(
      service.uploadBookCover(bookId, createImageFile('image/jpeg', BOOK_COVER_MAX_SIZE_BYTES + 1)),
    ).rejects.toThrow(InvalidBookCoverError);
    await expect(service.uploadBookCover(bookId, createImageFile('image/jpeg', 0))).rejects.toThrow(
      InvalidBookCoverError,
    );
    await expect(
      service.uploadBookCover('not-a-uuid', createImageFile('image/jpeg')),
    ).rejects.toThrow(InvalidBookCoverError);

    expect(storageMock.bucket.upload).not.toHaveBeenCalled();
  });

  it('extracts safe object paths from public URLs', () => {
    expect(
      getBookCoverPathFromPublicUrl(
        `https://project.supabase.co/storage/v1/object/public/book-covers/${coverPath}`,
      ),
    ).toBe(coverPath);
    expect(getBookCoverPathFromPublicUrl('https://example.com/not-storage/file.jpg')).toBeNull();
    expect(
      getBookCoverPathFromPublicUrl(
        `https://project.supabase.co/storage/v1/object/public/book-covers/${bookId}/bad.svg`,
      ),
    ).toBeNull();
  });

  it('deletes safe public URLs and ignores unrelated URLs', async () => {
    await service.deleteBookCover(
      `https://project.supabase.co/storage/v1/object/public/book-covers/${coverPath}`,
    );
    await service.deleteBookCover('https://example.com/not-storage/file.jpg');

    expect(storageMock.bucket.remove).toHaveBeenCalledTimes(1);
    expect(storageMock.bucket.remove).toHaveBeenCalledWith([coverPath]);
  });

  it('replaces by uploading first and deleting the previous cover after', async () => {
    const previousPath = `${bookId}/7c2f3a5b-1a8e-4f7d-9b2c-6a1e5d4f8c9b.png`;
    const previousUrl = `https://project.supabase.co/storage/v1/object/public/book-covers/${previousPath}`;

    const result = await service.replaceBookCover(
      bookId,
      previousUrl,
      createImageFile('image/jpeg'),
    );

    expect(result.previousCoverDeleted).toBe(true);
    expect(vi.mocked(storageMock.bucket.upload).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(storageMock.bucket.remove).mock.invocationCallOrder[0] ?? 0,
    );
    expect(storageMock.bucket.remove).toHaveBeenCalledWith([previousPath]);
  });

  it('throws a domain error when upload fails without deleting previous cover', async () => {
    vi.mocked(storageMock.bucket.upload).mockResolvedValueOnce({
      data: null,
      error: new Error('internal storage error'),
    });

    await expect(service.uploadBookCover(bookId, createImageFile('image/jpeg'))).rejects.toThrow(
      BookCoverUploadError,
    );
    expect(storageMock.bucket.remove).not.toHaveBeenCalled();
  });

  it('throws a domain error when delete fails', async () => {
    vi.mocked(storageMock.bucket.remove).mockResolvedValueOnce({
      data: null,
      error: new Error('internal storage error'),
    });

    await expect(
      service.deleteBookCover(
        `https://project.supabase.co/storage/v1/object/public/book-covers/${coverPath}`,
      ),
    ).rejects.toThrow(BookCoverDeleteError);
  });

  it('keeps the new cover when previous deletion fails during replacement', async () => {
    const previousUrl = `https://project.supabase.co/storage/v1/object/public/book-covers/${coverPath}`;
    vi.mocked(storageMock.bucket.remove).mockResolvedValueOnce({
      data: null,
      error: new Error('internal storage error'),
    });

    const result = await service.replaceBookCover(
      bookId,
      previousUrl,
      createImageFile('image/jpeg'),
    );

    expect(result.path).toBe(coverPath);
    expect(result.previousCoverDeleted).toBe(false);
    expect(storageMock.bucket.remove).toHaveBeenCalledTimes(1);
  });
});
