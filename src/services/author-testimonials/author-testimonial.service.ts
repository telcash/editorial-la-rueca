import 'server-only';

import * as authorTestimonialRepository from '@/repositories/author-testimonials/author-testimonial.repository';
import * as authorRepository from '@/repositories/authors/author.repository';
import * as bookRepository from '@/repositories/books/book.repository';
import { createAuthorTestimonialService } from './author-testimonial.service.core';

export { createAuthorTestimonialService } from './author-testimonial.service.core';
export type {
  AuthorTestimonialAdminListItem,
  AuthorTestimonialPublicItem,
  AuthorTestimonialRepository,
} from './author-testimonial.types';

const authorTestimonialService = createAuthorTestimonialService(
  authorTestimonialRepository,
  authorRepository,
  bookRepository,
);

export const {
  getTestimonialById,
  listTestimonials,
  listPublishedTestimonials,
  listFeaturedPublishedTestimonials,
  listTestimonialsByAuthorId,
  createTestimonial,
  updateTestimonial,
  deleteTestimonial,
} = authorTestimonialService;
