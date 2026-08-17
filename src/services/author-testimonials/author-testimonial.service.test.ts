import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

import type { AuthorTestimonial } from '@/db/schema';
import {
  AuthorTestimonialAuthorNotFoundError,
  AuthorTestimonialBookNotFoundError,
  AuthorTestimonialNotFoundError,
} from './author-testimonial.errors';
import { createAuthorTestimonialService } from './author-testimonial.service.core';
import type {
  AuthorReferenceRepository,
  AuthorTestimonialRepository,
  BookReferenceRepository,
} from './author-testimonial.types';

type MockTestimonialRepository = {
  [Key in keyof AuthorTestimonialRepository]: Mock<AuthorTestimonialRepository[Key]>;
};

type MockAuthorRepository = {
  [Key in keyof AuthorReferenceRepository]: Mock<AuthorReferenceRepository[Key]>;
};

type MockBookRepository = {
  [Key in keyof BookReferenceRepository]: Mock<BookReferenceRepository[Key]>;
};

const testimonialId = '6cd949bd-50d0-4032-b6f3-dfe7d7509aef';
const authorId = '8a9dd9a7-a564-44f3-b65f-94f0390b6d75';
const bookId = '4250d083-874a-4095-ae82-77490910d9b1';

const baseTestimonial: AuthorTestimonial = {
  id: testimonialId,
  authorId,
  bookId: null,
  quote: 'Una experiencia editorial muy cuidada y profesional.',
  source: 'manual',
  rating: null,
  isPublished: true,
  isFeatured: true,
  sortOrder: 2,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
};

function createRepositoryMock(): MockTestimonialRepository {
  return {
    findById: vi.fn<AuthorTestimonialRepository['findById']>(),
    findAll: vi.fn<AuthorTestimonialRepository['findAll']>(),
    findPublished: vi.fn<AuthorTestimonialRepository['findPublished']>(),
    findFeaturedPublished: vi.fn<AuthorTestimonialRepository['findFeaturedPublished']>(),
    findByAuthorId: vi.fn<AuthorTestimonialRepository['findByAuthorId']>(),
    create: vi.fn<AuthorTestimonialRepository['create']>(),
    update: vi.fn<AuthorTestimonialRepository['update']>(),
    deleteById: vi.fn<AuthorTestimonialRepository['deleteById']>(),
  };
}

describe('createAuthorTestimonialService', () => {
  let repository: MockTestimonialRepository;
  let authorRepository: MockAuthorRepository;
  let bookRepository: MockBookRepository;
  let service: ReturnType<typeof createAuthorTestimonialService>;

  beforeEach(() => {
    repository = createRepositoryMock();
    authorRepository = {
      findById: vi.fn<AuthorReferenceRepository['findById']>(),
    };
    bookRepository = {
      findById: vi.fn<BookReferenceRepository['findById']>(),
    };
    service = createAuthorTestimonialService(repository, authorRepository, bookRepository);
  });

  it('creates a testimonial without a book', async () => {
    authorRepository.findById.mockResolvedValue({ id: authorId });
    repository.create.mockResolvedValue(baseTestimonial);

    await expect(
      service.createTestimonial({
        authorId,
        quote: 'Una experiencia editorial muy cuidada y profesional.',
        source: 'manual',
        isPublished: true,
        isFeatured: true,
        sortOrder: 2,
      }),
    ).resolves.toBe(baseTestimonial);

    expect(bookRepository.findById).not.toHaveBeenCalled();
    expect(repository.create).toHaveBeenCalledWith({
      authorId,
      bookId: null,
      quote: 'Una experiencia editorial muy cuidada y profesional.',
      source: 'manual',
      rating: null,
      isPublished: true,
      isFeatured: true,
      sortOrder: 2,
    });
  });

  it('creates a testimonial linked to a book and rating', async () => {
    authorRepository.findById.mockResolvedValue({ id: authorId });
    bookRepository.findById.mockResolvedValue({ id: bookId });
    repository.create.mockResolvedValue({ ...baseTestimonial, bookId, rating: 5 });

    await expect(
      service.createTestimonial({
        authorId,
        bookId,
        quote: 'La edición de mi libro fue cercana, rigurosa y profesional.',
        rating: 5,
      }),
    ).resolves.toEqual(expect.objectContaining({ bookId, rating: 5 }));
  });

  it('rejects testimonials for unknown authors', async () => {
    authorRepository.findById.mockResolvedValue(null);

    await expect(
      service.createTestimonial({
        authorId,
        quote: 'Una experiencia editorial muy cuidada y profesional.',
      }),
    ).rejects.toBeInstanceOf(AuthorTestimonialAuthorNotFoundError);

    expect(repository.create).not.toHaveBeenCalled();
  });

  it('rejects testimonials for unknown books', async () => {
    authorRepository.findById.mockResolvedValue({ id: authorId });
    bookRepository.findById.mockResolvedValue(null);

    await expect(
      service.createTestimonial({
        authorId,
        bookId,
        quote: 'La edición de mi libro fue cercana, rigurosa y profesional.',
      }),
    ).rejects.toBeInstanceOf(AuthorTestimonialBookNotFoundError);
  });

  it('updates publication, featured and sort order flags', async () => {
    repository.findById.mockResolvedValue(baseTestimonial);
    repository.update.mockResolvedValue({ ...baseTestimonial, isPublished: false, sortOrder: 7 });

    await expect(
      service.updateTestimonial(testimonialId, {
        isPublished: false,
        isFeatured: false,
        sortOrder: 7,
      }),
    ).resolves.toEqual(expect.objectContaining({ isPublished: false, sortOrder: 7 }));

    expect(repository.update).toHaveBeenCalledWith(testimonialId, {
      isPublished: false,
      isFeatured: false,
      sortOrder: 7,
    });
  });

  it('delegates author, published and featured public queries', async () => {
    const publicItems = [
      {
        id: testimonialId,
        quote: baseTestimonial.quote,
        author: { id: authorId, name: 'Autora', slug: 'autora', photoUrl: null },
        book: null,
      },
    ];
    repository.findByAuthorId.mockResolvedValue([
      {
        testimonial: baseTestimonial,
        author: { id: authorId, name: 'Autora', slug: 'autora', photoUrl: null },
        book: null,
      },
    ]);
    repository.findPublished.mockResolvedValue(publicItems);
    repository.findFeaturedPublished.mockResolvedValue(publicItems);

    await expect(service.listTestimonialsByAuthorId(authorId)).resolves.toHaveLength(1);
    await expect(service.listPublishedTestimonials()).resolves.toBe(publicItems);
    await expect(service.listFeaturedPublishedTestimonials()).resolves.toBe(publicItems);
  });

  it('throws AuthorTestimonialNotFoundError for unknown testimonials', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(service.getTestimonialById(testimonialId)).rejects.toBeInstanceOf(
      AuthorTestimonialNotFoundError,
    );
  });
});
