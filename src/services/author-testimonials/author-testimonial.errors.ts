export class AuthorTestimonialNotFoundError extends Error {
  constructor(id: string) {
    super(`Author testimonial not found: ${id}`);
    this.name = 'AuthorTestimonialNotFoundError';
  }
}

export class AuthorTestimonialAuthorNotFoundError extends Error {
  constructor(authorId: string) {
    super(`Author not found for testimonial: ${authorId}`);
    this.name = 'AuthorTestimonialAuthorNotFoundError';
  }
}

export class AuthorTestimonialBookNotFoundError extends Error {
  constructor(bookId: string) {
    super(`Book not found for testimonial: ${bookId}`);
    this.name = 'AuthorTestimonialBookNotFoundError';
  }
}
