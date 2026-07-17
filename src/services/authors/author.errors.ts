export class AuthorNotFoundError extends Error {
  constructor(identifier: string) {
    super(`No se encontro el autor solicitado: ${identifier}.`);
    this.name = 'AuthorNotFoundError';
  }
}

export class AuthorSlugConflictError extends Error {
  constructor(slug: string) {
    super(`Ya existe un autor con el slug "${slug}".`);
    this.name = 'AuthorSlugConflictError';
  }
}
