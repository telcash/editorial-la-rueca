import type { AuthorTestimonial } from '@/db/schema';
import type {
  CreateAuthorTestimonialInput,
  UpdateAuthorTestimonialInput,
} from '@/schemas/author-testimonials/author-testimonial.schema';

export interface AuthorTestimonialAuthorSummary {
  id: string;
  name: string;
  slug: string;
  photoUrl: string | null;
}

export interface AuthorTestimonialBookSummary {
  id: string;
  title: string;
  slug: string;
}

export interface AuthorTestimonialAdminListItem {
  testimonial: AuthorTestimonial;
  author: AuthorTestimonialAuthorSummary;
  book: AuthorTestimonialBookSummary | null;
}

export interface AuthorTestimonialPublicItem {
  id: string;
  quote: string;
  author: AuthorTestimonialAuthorSummary;
  book: AuthorTestimonialBookSummary | null;
}

export interface AuthorTestimonialRepository {
  findById(id: string): Promise<AuthorTestimonial | null>;
  findAll(): Promise<AuthorTestimonialAdminListItem[]>;
  findPublished(): Promise<AuthorTestimonialPublicItem[]>;
  findFeaturedPublished(): Promise<AuthorTestimonialPublicItem[]>;
  findByAuthorId(authorId: string): Promise<AuthorTestimonialAdminListItem[]>;
  create(data: CreateAuthorTestimonialInput): Promise<AuthorTestimonial>;
  update(id: string, data: UpdateAuthorTestimonialInput): Promise<AuthorTestimonial | null>;
  deleteById(id: string): Promise<AuthorTestimonial | null>;
}

export interface AuthorReferenceRepository {
  findById(id: string): Promise<unknown | null>;
}

export interface BookReferenceRepository {
  findById(id: string): Promise<unknown | null>;
}
