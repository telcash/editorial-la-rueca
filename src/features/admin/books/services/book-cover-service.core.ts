import { z } from 'zod';

import {
  BOOK_COVER_ACCEPTED_MIME_TYPES,
  BOOK_COVER_MAX_SIZE_BYTES,
  BOOK_COVERS_BUCKET,
} from './book-cover-constants';
import {
  BookCoverDeleteError,
  BookCoverUploadError,
  InvalidBookCoverError,
} from './book-cover-errors';

const bookIdSchema = z.string().uuid();
const objectPathPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$/i;

const mimeToExtension = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
} as const;

type AllowedBookCoverMimeType = keyof typeof mimeToExtension;

interface StorageResult<TData> {
  data: TData | null;
  error: unknown;
}

export interface BookCoverStorageBucket {
  upload(
    path: string,
    file: File,
    options: {
      contentType: string;
      upsert: false;
    },
  ): Promise<StorageResult<unknown>>;
  remove(paths: string[]): Promise<StorageResult<unknown>>;
  getPublicUrl(path: string): {
    data: {
      publicUrl: string;
    };
  };
}

export interface BookCoverStorageClient {
  from(bucket: typeof BOOK_COVERS_BUCKET): BookCoverStorageBucket;
}

export interface BookCoverUploadResult {
  path: string;
  publicUrl: string;
  mimeType: AllowedBookCoverMimeType;
  size: number;
}

export interface BookCoverReplaceResult extends BookCoverUploadResult {
  previousCoverDeleted: boolean | null;
}

interface BookCoverServiceOptions {
  randomUUID?: () => string;
}

function getStorageErrorDetails(error: unknown): {
  status?: unknown;
  statusCode?: unknown;
  message?: string;
} {
  if (!error || typeof error !== 'object') {
    return {
      message: typeof error === 'string' ? error : undefined,
    };
  }

  const storageError = error as {
    status?: unknown;
    statusCode?: unknown;
    message?: unknown;
  };

  return {
    status: storageError.status,
    statusCode: storageError.statusCode,
    message: typeof storageError.message === 'string' ? storageError.message : undefined,
  };
}

function logStorageError(operation: 'upload' | 'delete', path: string, error: unknown) {
  if (process.env.NODE_ENV !== 'development') {
    return;
  }

  const details = getStorageErrorDetails(error);
  const label =
    operation === 'upload'
      ? '[BookCoverService] Upload failed'
      : '[BookCoverService] Delete failed';

  console.error(label, {
    bucket: BOOK_COVERS_BUCKET,
    path,
    statusCode: details.statusCode,
    status: details.status,
    message: details.message,
  });
}

function isAllowedMimeType(mimeType: string): mimeType is AllowedBookCoverMimeType {
  return BOOK_COVER_ACCEPTED_MIME_TYPES.some((allowedMimeType) => allowedMimeType === mimeType);
}

export function getBookCoverExtension(mimeType: string): 'jpg' | 'png' | 'webp' {
  if (!isAllowedMimeType(mimeType)) {
    throw new InvalidBookCoverError('Formato no permitido. Usa JPG, PNG o WebP.');
  }

  return mimeToExtension[mimeType];
}

export function validateBookCoverPath(path: string): string {
  const normalizedPath = path.trim();

  if (!objectPathPattern.test(normalizedPath)) {
    throw new InvalidBookCoverError('La ruta de portada no es válida.');
  }

  return normalizedPath;
}

function validateBookId(bookId: string): string {
  const parsedBookId = bookIdSchema.safeParse(bookId);

  if (!parsedBookId.success) {
    throw new InvalidBookCoverError('El id del libro no es válido.');
  }

  return parsedBookId.data.toLowerCase();
}

export function validateBookCoverFile(file: File): AllowedBookCoverMimeType {
  if (file.size <= 0) {
    throw new InvalidBookCoverError('La portada no puede estar vacía.');
  }

  if (file.size > BOOK_COVER_MAX_SIZE_BYTES) {
    throw new InvalidBookCoverError('La imagen no puede superar los 5 MB.');
  }

  if (!isAllowedMimeType(file.type)) {
    throw new InvalidBookCoverError('Formato no permitido. Usa JPG, PNG o WebP.');
  }

  return file.type;
}

export function getBookCoverPathFromPublicUrl(publicUrl: string | null): string | null {
  if (!publicUrl) {
    return null;
  }

  let pathname: string;

  try {
    pathname = new URL(publicUrl).pathname;
  } catch {
    return null;
  }

  const bucketSegment = `/${BOOK_COVERS_BUCKET}/`;
  const bucketSegmentIndex = pathname.indexOf(bucketSegment);

  if (bucketSegmentIndex === -1) {
    return null;
  }

  const path = decodeURIComponent(pathname.slice(bucketSegmentIndex + bucketSegment.length));

  try {
    return validateBookCoverPath(path);
  } catch {
    return null;
  }
}

function buildBookCoverPath(bookId: string, mimeType: AllowedBookCoverMimeType, uuid: string) {
  const extension = getBookCoverExtension(mimeType);
  const normalizedUuid = validateBookId(uuid);

  return `${bookId}/${normalizedUuid}.${extension}`;
}

export function createBookCoverService(
  storageClient: BookCoverStorageClient,
  options: BookCoverServiceOptions = {},
) {
  const getRandomUUID = options.randomUUID ?? crypto.randomUUID;

  return {
    async uploadBookCover(bookId: string, file: File): Promise<BookCoverUploadResult> {
      const normalizedBookId = validateBookId(bookId);
      const mimeType = validateBookCoverFile(file);
      const path = buildBookCoverPath(normalizedBookId, mimeType, getRandomUUID());
      const bucket = storageClient.from(BOOK_COVERS_BUCKET);
      const { error } = await bucket.upload(path, file, {
        contentType: mimeType,
        upsert: false,
      });

      if (error) {
        logStorageError('upload', path, error);
        throw new BookCoverUploadError();
      }

      const { data } = bucket.getPublicUrl(path);

      return {
        path,
        publicUrl: data.publicUrl,
        mimeType,
        size: file.size,
      };
    },

    async deleteBookCover(publicUrl: string | null): Promise<void> {
      const path = getBookCoverPathFromPublicUrl(publicUrl);

      if (!path) {
        return;
      }

      const safePath = validateBookCoverPath(path);
      const bucket = storageClient.from(BOOK_COVERS_BUCKET);
      const { error } = await bucket.remove([safePath]);

      if (error) {
        logStorageError('delete', safePath, error);
        throw new BookCoverDeleteError();
      }
    },

    async replaceBookCover(
      bookId: string,
      previousUrl: string | null,
      file: File,
    ): Promise<BookCoverReplaceResult> {
      const uploadedCover = await this.uploadBookCover(bookId, file);

      try {
        await this.deleteBookCover(previousUrl);
      } catch (error) {
        if (error instanceof BookCoverDeleteError) {
          return {
            ...uploadedCover,
            previousCoverDeleted: false,
          };
        }

        throw error;
      }

      return {
        ...uploadedCover,
        previousCoverDeleted: previousUrl ? true : null,
      };
    },
  };
}
