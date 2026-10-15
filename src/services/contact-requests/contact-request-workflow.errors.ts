export class ContactRequestStatusNotFoundError extends Error {
  constructor(key: string) {
    super(`No se encontró el estado comercial solicitado: ${key}.`);
    this.name = 'ContactRequestStatusNotFoundError';
  }
}

export class ContactRequestWorkflowRequestNotFoundError extends Error {
  constructor(id: string) {
    super(`No se encontró la solicitud solicitada: ${id}.`);
    this.name = 'ContactRequestWorkflowRequestNotFoundError';
  }
}

export class ContactRequestStatusConflictError extends Error {
  constructor(id: string) {
    super(`El estado de la solicitud cambió durante la operación: ${id}.`);
    this.name = 'ContactRequestStatusConflictError';
  }
}

export class ContactRequestInitialStatusCannotBeDeactivatedError extends Error {
  constructor() {
    super('El estado inicial de las solicitudes no se puede desactivar.');
    this.name = 'ContactRequestInitialStatusCannotBeDeactivatedError';
  }
}
