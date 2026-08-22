export class ContactRequestNotFoundError extends Error {
  constructor(identifier: string) {
    super(`No se encontro la solicitud solicitada: ${identifier}.`);
    this.name = 'ContactRequestNotFoundError';
  }
}

export class ContactRequestInvalidServiceError extends Error {
  constructor(serviceId: string) {
    super(`El servicio seleccionado no es valido para una solicitud: ${serviceId}.`);
    this.name = 'ContactRequestInvalidServiceError';
  }
}
