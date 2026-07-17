export class AccessDeniedError extends Error {
  constructor() {
    super('La cuenta no tiene permisos para acceder al panel editorial.');
    this.name = 'AccessDeniedError';
  }
}
