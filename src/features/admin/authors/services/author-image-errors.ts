export class InvalidAuthorImageError extends Error {
  constructor(message = 'La imagen del autor no es válida.') {
    super(message);
    this.name = 'InvalidAuthorImageError';
  }
}

export class AuthorImageUploadError extends Error {
  constructor() {
    super('No se pudo subir la imagen del autor.');
    this.name = 'AuthorImageUploadError';
  }
}

export class AuthorImageDeleteError extends Error {
  constructor() {
    super('No se pudo eliminar la imagen del autor.');
    this.name = 'AuthorImageDeleteError';
  }
}
