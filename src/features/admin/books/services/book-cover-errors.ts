export class InvalidBookCoverError extends Error {
  constructor(message = 'Archivo no válido.') {
    super(message);
    this.name = 'InvalidBookCoverError';
  }
}

export class BookCoverUploadError extends Error {
  constructor() {
    super('No se pudo subir la portada.');
    this.name = 'BookCoverUploadError';
  }
}

export class BookCoverDeleteError extends Error {
  constructor() {
    super('No se pudo eliminar la portada.');
    this.name = 'BookCoverDeleteError';
  }
}
