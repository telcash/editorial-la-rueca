import 'server-only';

import { z } from 'zod';

import {
  createAuthorSchema,
  updateAuthorSchema,
  type CreateAuthorInput,
  type UpdateAuthorInput,
} from '@/schemas/authors/author.schema';
import {
  create as createAuthorRecord,
  existsBySlug,
  findAll,
  findById,
  findBySlug,
  findPublished,
  update as updateAuthorRecord,
} from '@/repositories/authors/author.repository';
import { AuthorNotFoundError, AuthorSlugConflictError } from './author.errors';

const authorIdSchema = z.string().uuid('El id del autor debe ser un UUID valido.');
const authorSlugSchema = createAuthorSchema.shape.slug;

export async function getAuthorById(id: string) {
  const validId = authorIdSchema.parse(id);
  const author = await findById(validId);

  if (!author) {
    throw new AuthorNotFoundError(validId);
  }

  return author;
}

export async function getAuthorBySlug(slug: string) {
  const validSlug = authorSlugSchema.parse(slug);
  const author = await findBySlug(validSlug);

  if (!author) {
    throw new AuthorNotFoundError(validSlug);
  }

  return author;
}

export async function listAuthors() {
  return findAll();
}

export async function listPublishedAuthors() {
  return findPublished();
}

export async function createAuthor(input: unknown) {
  const data: CreateAuthorInput = createAuthorSchema.parse(input);
  const slugExists = await existsBySlug(data.slug);

  if (slugExists) {
    throw new AuthorSlugConflictError(data.slug);
  }

  return createAuthorRecord(data);
}

export async function updateAuthor(id: string, input: unknown) {
  const validId = authorIdSchema.parse(id);
  const data: UpdateAuthorInput = updateAuthorSchema.parse(input);
  const currentAuthor = await findById(validId);

  if (!currentAuthor) {
    throw new AuthorNotFoundError(validId);
  }

  if (data.slug && data.slug !== currentAuthor.slug) {
    const slugExists = await existsBySlug(data.slug, validId);

    if (slugExists) {
      throw new AuthorSlugConflictError(data.slug);
    }
  }

  const updatedAuthor = await updateAuthorRecord(validId, data);

  if (!updatedAuthor) {
    throw new AuthorNotFoundError(validId);
  }

  return updatedAuthor;
}
