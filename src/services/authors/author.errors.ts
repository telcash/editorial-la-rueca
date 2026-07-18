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

export class AuthorMustBeArchivedError extends Error {
  constructor() {
    super('Archiva el autor antes de eliminarlo definitivamente.');
    this.name = 'AuthorMustBeArchivedError';
  }
}

export class AuthorHasBooksError extends Error {
  constructor(public readonly bookCount: number) {
    super(`El autor está relacionado con ${bookCount} libros y no puede eliminarse.`);
    this.name = 'AuthorHasBooksError';
  }
}
