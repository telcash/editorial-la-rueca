import {
  BOOK_COVER_ACCEPTED_MIME_TYPES,
  BOOK_COVER_MAX_SIZE_BYTES,
} from '../services/book-cover-constants';
import type { CreateBookFormPayload, UpdateBookFormPayload } from './book-edition-form.helpers';

const bookPayloadFormField = 'payload';
const bookCoverFormField = 'cover';
const removeExistingCoverFormField = 'removeExistingCover';

export interface BookCoverClientState {
  selectedFile: File | null;
  removeExistingCover: boolean;
}

export function formatBookCoverFileSize(size: number): string {
  if (size < 1024 * 1024) {
    return `${Math.max(1, Math.round(size / 1024))} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function validateBookCoverClientFile(file: File): string | null {
  if (!BOOK_COVER_ACCEPTED_MIME_TYPES.some((mimeType) => mimeType === file.type)) {
    return 'Formato no permitido. Usa JPG, PNG o WebP.';
  }

  if (file.size > BOOK_COVER_MAX_SIZE_BYTES) {
    return 'La imagen no puede superar los 5 MB.';
  }

  return null;
}

export function isBookCoverDirty(state: BookCoverClientState): boolean {
  return state.selectedFile !== null || state.removeExistingCover;
}

export function createBookActionFormData(
  payload: CreateBookFormPayload,
  coverFile: File | null,
): FormData {
  const formData = new FormData();

  formData.set(bookPayloadFormField, JSON.stringify(payload));

  if (coverFile) {
    formData.set(bookCoverFormField, coverFile);
  }

  return formData;
}

export function updateBookActionFormData(
  payload: UpdateBookFormPayload,
  coverFile: File | null,
  removeExistingCover: boolean,
): FormData {
  const formData = new FormData();

  formData.set(bookPayloadFormField, JSON.stringify(payload));
  formData.set(removeExistingCoverFormField, removeExistingCover ? 'true' : 'false');

  if (coverFile) {
    formData.set(bookCoverFormField, coverFile);
  }

  return formData;
}

export function isBookActionFormData(input: unknown): input is FormData {
  return input instanceof FormData;
}

export function getBookPayloadFromFormData<TPayload>(formData: FormData): TPayload {
  const value = formData.get(bookPayloadFormField);

  if (typeof value !== 'string') {
    return {} as TPayload;
  }

  try {
    return JSON.parse(value) as TPayload;
  } catch {
    return {} as TPayload;
  }
}

export function getBookCoverFileFromFormData(formData: FormData): File | null {
  const cover = formData.get(bookCoverFormField);

  if (!(cover instanceof File) || cover.size === 0) {
    return null;
  }

  return cover;
}

export function getRemoveExistingCoverFromFormData(formData: FormData): boolean {
  return formData.get(removeExistingCoverFormField) === 'true';
}
