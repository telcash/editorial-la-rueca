export const pageLimits = [100, 150, 200, 250, 300, 400] as const;
export const copyCounts = [50, 100, 200, 300, 500, 1000] as const;
export type CopyCount = (typeof copyCounts)[number];
type PriceRow = readonly [number, number, number, number, number, number];

// Fuente: «tarifas WEB», columnas B–G, filas 5–10 (Excel 2026–2027).
export const completePrices: Readonly<Record<CopyCount, PriceRow>> = {
  50: [435, 520, 555, 610, 650, 780],
  100: [530, 630, 670, 760, 830, 1030],
  200: [730, 880, 985, 1110, 1220, 1540],
  300: [900, 1100, 1250, 1430, 1580, 1995],
  500: [1280, 1580, 1830, 2090, 2340, 2990],
  1000: [2220, 2740, 3250, 3740, 4230, 5455],
};

// Fuente: «tarifas MAQUETACIÓN», sección SOLO IMPRESIÓN, filas 32–67.
export const printingPrices: Readonly<Record<CopyCount, PriceRow>> = {
  50: [130, 162, 199, 225, 250, 320],
  100: [230, 275, 325, 380, 430, 550],
  200: [430, 530, 630, 730, 830, 1100],
  300: [599, 740, 890, 1100, 1200, 1530],
  500: [980, 1220, 1470, 1700, 1950, 2530],
  1000: [1920, 2390, 2900, 3360, 3830, 4999],
};

export const individualPageLimits = [50, 100, 150, 200, 250, 300, 350, 400] as const;
type IndividualPageLimit = (typeof individualPageLimits)[number];
export const layoutPrices: Readonly<Record<IndividualPageLimit, number>> = {
  50: 60,
  100: 110,
  150: 160,
  200: 210,
  250: 260,
  300: 310,
  350: 360,
  400: 410,
};
export const amazonPrices: Readonly<Record<IndividualPageLimit, number | null>> = {
  50: 206,
  100: 275,
  150: 340,
  200: null,
  250: 410,
  300: 550,
  350: 619,
  400: 685,
};

export const individualStartingPrices = {
  layout: layoutPrices[50],
  amazon: amazonPrices[50]!,
  printing: printingPrices[50][0],
  correctionPerWord: 0.011,
  readingReport: 50,
  coverWithPhoto: 140,
  coverWithoutPhoto: 165,
} as const;

export type Estimate =
  | { kind: 'priced'; amount: number; minPages: number; maxPages: number }
  | { kind: 'consult'; reason: 'invalid' | 'out_of_range' | 'unpublished' };

function validPages(pages: number): boolean {
  return Number.isSafeInteger(pages) && pages > 0;
}

export function getPrintEstimate(
  service: 'complete' | 'printing',
  pages: number,
  copies: number,
): Estimate {
  if (!validPages(pages) || !copyCounts.some((value) => value === copies)) {
    return { kind: 'consult', reason: 'invalid' };
  }
  const index = pageLimits.findIndex((limit) => pages <= limit);
  if (index < 0) return { kind: 'consult', reason: 'out_of_range' };
  const prices = service === 'complete' ? completePrices : printingPrices;
  return {
    kind: 'priced',
    amount: prices[copies as CopyCount][index],
    minPages: index === 0 ? 1 : pageLimits[index - 1] + 1,
    maxPages: pageLimits[index],
  };
}

export function getIndividualEstimate(service: 'layout' | 'amazon', pages: number): Estimate {
  if (!validPages(pages)) return { kind: 'consult', reason: 'invalid' };
  const index = individualPageLimits.findIndex((limit) => pages <= limit);
  if (index < 0) return { kind: 'consult', reason: 'out_of_range' };
  const maxPages = individualPageLimits[index];
  const amount = (service === 'layout' ? layoutPrices : amazonPrices)[maxPages];
  if (amount === null) return { kind: 'consult', reason: 'unpublished' };
  return {
    kind: 'priced',
    amount,
    maxPages,
    minPages: index === 0 ? 1 : individualPageLimits[index - 1] + 1,
  };
}

const money = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 3,
  useGrouping: 'always',
});
const integer = new Intl.NumberFormat('es-ES', { useGrouping: 'always' });
export const formatMoney = (value: number): string => money.format(value);
export const formatCount = (value: number): string => integer.format(value);

export function describeEstimate(estimate: Estimate): string {
  if (estimate.kind === 'priced') {
    return `De ${estimate.minPages} a ${estimate.maxPages} páginas`;
  }
  if (estimate.reason === 'invalid') return 'Introduce un número entero de páginas mayor que cero.';
  if (estimate.reason === 'out_of_range')
    return 'Para más de 400 páginas, presupuesto personalizado.';
  return 'Tramo 151–200 páginas: tarifa pendiente de confirmar.';
}

export function buildCompleteEstimateSummary(pages: number, copies: number): string | null {
  const estimate = getPrintEstimate('complete', pages, copies);
  if (estimate.kind !== 'priced') return null;
  return [
    'Editorial La Rueca · Presupuesto estimado',
    `Hasta ${estimate.maxPages} páginas · ${formatCount(copies)} ejemplares · ${formatMoney(estimate.amount)} sin IVA.`,
    'Incluye maquetación, diseño de cubierta, impresión y envío a un único punto de la península.',
    '15 × 21 cm (similar al A5, no DIN A5 exacto). Interior B/N, papel ahuesado de 90 g, sin fotografías, imágenes ni tablas.',
    'Cubierta a color, estucado mate blanco de 270 g, plastificado por una cara y solapas de 9 cm.',
    'No incluye por defecto correcciones, ISBN/depósito legal, distribución, publicación en Amazon ni promoción.',
    'Importe orientativo: el precio definitivo y los impuestos aplicables se confirmarán tras valorar el proyecto.',
  ].join('\n');
}
