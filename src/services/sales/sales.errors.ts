export class SalesMarketChannelMismatchError extends Error {
  constructor() {
    super('El mercado seleccionado no pertenece al canal de venta del producto.');
    this.name = 'SalesMarketChannelMismatchError';
  }
}

export class SalesChannelNotFoundError extends Error {
  constructor(slug: string) {
    super(`No se encontró el canal de venta "${slug}".`);
    this.name = 'SalesChannelNotFoundError';
  }
}

export class SalesMarketNotFoundError extends Error {
  constructor() {
    super('Uno de los mercados seleccionados no existe.');
    this.name = 'SalesMarketNotFoundError';
  }
}

export class SalesMarketInactiveError extends Error {
  constructor() {
    super('Uno de los mercados seleccionados ya no está activo.');
    this.name = 'SalesMarketInactiveError';
  }
}
