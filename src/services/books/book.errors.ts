export class BookNotFoundError extends Error {
  constructor(identifier: string) {
    super(`No se encontro el libro solicitado: ${identifier}.`);
    this.name = 'BookNotFoundError';
  }
}

export class BookSlugConflictError extends Error {
  constructor(slug: string) {
    super(`Ya existe un libro con el slug "${slug}".`);
    this.name = 'BookSlugConflictError';
  }
}

export class BookIsbnConflictError extends Error {
  constructor(
    public readonly isbnType: 'isbn10' | 'isbn13',
    public readonly value: string,
  ) {
    super(`Ya existe una edicion con ${isbnType.toUpperCase()} "${value}".`);
    this.name = 'BookIsbnConflictError';
  }
}

export class BookAuthorNotFoundError extends Error {
  constructor(public readonly authorIds: string[]) {
    super(`No se encontraron los autores solicitados: ${authorIds.join(', ')}.`);
    this.name = 'BookAuthorNotFoundError';
  }
}

export class ArchivedBookAuthorError extends Error {
  constructor(public readonly authorIds: string[]) {
    super(`No se pueden asociar autores archivados: ${authorIds.join(', ')}.`);
    this.name = 'ArchivedBookAuthorError';
  }
}

export class DuplicateBookAuthorError extends Error {
  constructor() {
    super('No puedes repetir autores en el mismo libro.');
    this.name = 'DuplicateBookAuthorError';
  }
}

export class BookEditionNotFoundError extends Error {
  constructor(editionId: string) {
    super(`No se encontro la edicion solicitada: ${editionId}.`);
    this.name = 'BookEditionNotFoundError';
  }
}

export class BookRequiresAuthorError extends Error {
  constructor() {
    super('Un libro debe tener al menos un autor.');
    this.name = 'BookRequiresAuthorError';
  }
}

export class BookRequiresEditionError extends Error {
  constructor() {
    super('Un libro debe tener al menos una edicion.');
    this.name = 'BookRequiresEditionError';
  }
}
