export class CategoryNotFoundError extends Error {
  constructor(identifier: string) {
    super(`No se encontro la categoría solicitada: ${identifier}.`);
    this.name = 'CategoryNotFoundError';
  }
}

export class CategorySlugConflictError extends Error {
  constructor(slug: string) {
    super(`Ya existe una categoría con el slug "${slug}".`);
    this.name = 'CategorySlugConflictError';
  }
}

export class CategoryMustBeArchivedError extends Error {
  constructor() {
    super('Archiva la categoría antes de eliminarla definitivamente.');
    this.name = 'CategoryMustBeArchivedError';
  }
}

export class CategoryHasBooksError extends Error {
  constructor(public readonly bookCount: number) {
    super(
      `La categoría está relacionada con ${bookCount} libros y no puede eliminarse definitivamente.`,
    );
    this.name = 'CategoryHasBooksError';
  }
}
