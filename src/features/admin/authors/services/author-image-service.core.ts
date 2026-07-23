import { z } from 'zod';

import {
  AuthorImageDeleteError,
  AuthorImageUploadError,
  InvalidAuthorImageError,
} from './author-image-errors';
import {
  AUTHOR_IMAGE_ACCEPTED_MIME_TYPES,
  AUTHOR_IMAGE_MAX_SIZE_BYTES,
  AUTHOR_IMAGES_BUCKET,
} from './author-image-constants';

const authorIdSchema = z.string().uuid();
const objectPathPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$/i;

const mimeToExtension = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
} as const;

type AllowedAuthorImageMimeType = keyof typeof mimeToExtension;

interface StorageResult<TData> {
  data: TData | null;
  error: unknown;
}

export interface AuthorImageStorageBucket {
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

export interface AuthorImageStorageClient {
  from(bucket: typeof AUTHOR_IMAGES_BUCKET): AuthorImageStorageBucket;
}

export interface AuthorImageUploadResult {
  path: string;
  publicUrl: string;
  mimeType: AllowedAuthorImageMimeType;
  size: number;
}

export interface AuthorImageReplaceResult extends AuthorImageUploadResult {
  previousImageDeleted: boolean | null;
}

interface AuthorImageServiceOptions {
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
      ? '[AuthorImageService] Upload failed'
      : '[AuthorImageService] Delete failed';

  console.error(label, {
    bucket: AUTHOR_IMAGES_BUCKET,
    path,
    statusCode: details.statusCode,
    status: details.status,
    message: details.message,
  });
}

function isAllowedMimeType(mimeType: string): mimeType is AllowedAuthorImageMimeType {
  return AUTHOR_IMAGE_ACCEPTED_MIME_TYPES.some((allowedMimeType) => allowedMimeType === mimeType);
}

export function getAuthorImageExtension(mimeType: string): 'jpg' | 'png' | 'webp' {
  if (!isAllowedMimeType(mimeType)) {
    throw new InvalidAuthorImageError('El formato de imagen no está permitido.');
  }

  return mimeToExtension[mimeType];
}

export function validateAuthorImagePath(path: string): string {
  const normalizedPath = path.trim();

  if (!objectPathPattern.test(normalizedPath)) {
    throw new InvalidAuthorImageError('La ruta de imagen del autor no es válida.');
  }

  return normalizedPath;
}

function validateAuthorId(authorId: string): string {
  const parsedAuthorId = authorIdSchema.safeParse(authorId);

  if (!parsedAuthorId.success) {
    throw new InvalidAuthorImageError('El id del autor no es válido.');
  }

  return parsedAuthorId.data.toLowerCase();
}

export function validateAuthorImageFile(file: File): AllowedAuthorImageMimeType {
  if (file.size <= 0) {
    throw new InvalidAuthorImageError('La imagen no puede estar vacía.');
  }

  if (file.size > AUTHOR_IMAGE_MAX_SIZE_BYTES) {
    throw new InvalidAuthorImageError('La imagen no puede superar los 5 MB.');
  }

  if (!isAllowedMimeType(file.type)) {
    throw new InvalidAuthorImageError('El formato de imagen no está permitido.');
  }

  return file.type;
}

export function getAuthorImagePathFromPublicUrl(publicUrl: string | null): string | null {
  if (!publicUrl) {
    return null;
  }

  let pathname: string;

  try {
    pathname = new URL(publicUrl).pathname;
  } catch {
    return null;
  }

  const bucketSegment = `/${AUTHOR_IMAGES_BUCKET}/`;
  const bucketSegmentIndex = pathname.indexOf(bucketSegment);

  if (bucketSegmentIndex === -1) {
    return null;
  }

  const path = decodeURIComponent(pathname.slice(bucketSegmentIndex + bucketSegment.length));

  try {
    return validateAuthorImagePath(path);
  } catch {
    return null;
  }
}

function buildAuthorImagePath(
  authorId: string,
  mimeType: AllowedAuthorImageMimeType,
  uuid: string,
) {
  const extension = getAuthorImageExtension(mimeType);
  const normalizedUuid = validateAuthorId(uuid);

  return `${authorId}/${normalizedUuid}.${extension}`;
}

export function createAuthorImageService(
  storageClient: AuthorImageStorageClient,
  options: AuthorImageServiceOptions = {},
) {
  const getRandomUUID = options.randomUUID ?? (() => globalThis.crypto.randomUUID());

  return {
    async uploadAuthorImage(authorId: string, file: File): Promise<AuthorImageUploadResult> {
      const normalizedAuthorId = validateAuthorId(authorId);
      const mimeType = validateAuthorImageFile(file);
      const path = buildAuthorImagePath(normalizedAuthorId, mimeType, getRandomUUID());
      const bucket = storageClient.from(AUTHOR_IMAGES_BUCKET);
      const { error } = await bucket.upload(path, file, {
        contentType: mimeType,
        upsert: false,
      });

      if (error) {
        logStorageError('upload', path, error);
        throw new AuthorImageUploadError();
      }

      const { data } = bucket.getPublicUrl(path);

      return {
        path,
        publicUrl: data.publicUrl,
        mimeType,
        size: file.size,
      };
    },

    async deleteAuthorImage(path: string): Promise<void> {
      const safePath = validateAuthorImagePath(path);
      const bucket = storageClient.from(AUTHOR_IMAGES_BUCKET);
      const { error } = await bucket.remove([safePath]);

      if (error) {
        logStorageError('delete', safePath, error);
        throw new AuthorImageDeleteError();
      }
    },

    async replaceAuthorImage(
      authorId: string,
      file: File,
      previousPath?: string | null,
    ): Promise<AuthorImageReplaceResult> {
      const uploadedImage = await this.uploadAuthorImage(authorId, file);

      if (!previousPath) {
        return {
          ...uploadedImage,
          previousImageDeleted: null,
        };
      }

      try {
        await this.deleteAuthorImage(previousPath);
      } catch (error) {
        if (error instanceof AuthorImageDeleteError) {
          return {
            ...uploadedImage,
            previousImageDeleted: false,
          };
        }

        throw error;
      }

      return {
        ...uploadedImage,
        previousImageDeleted: true,
      };
    },
  };
}
