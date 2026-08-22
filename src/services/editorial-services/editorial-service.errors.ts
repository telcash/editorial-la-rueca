export class EditorialServiceNotFoundError extends Error {
  constructor(identifier: string) {
    super(`No se encontro el servicio solicitado: ${identifier}.`);
    this.name = 'EditorialServiceNotFoundError';
  }
}

export class EditorialServiceSlugConflictError extends Error {
  constructor(slug: string) {
    super(`Ya existe un servicio con el slug "${slug}".`);
    this.name = 'EditorialServiceSlugConflictError';
  }
}
