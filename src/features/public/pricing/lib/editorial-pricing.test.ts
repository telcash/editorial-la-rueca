import { describe, expect, it } from 'vitest';

import {
  amazonPrices,
  buildCompleteEstimateSummary,
  completePrices,
  copyCounts,
  describeEstimate,
  formatCount,
  formatMoney,
  formatUnitPrice,
  getIndividualEstimate,
  getPrintEstimate,
  layoutPrices,
  pageLimits,
  printingPrices,
} from './editorial-pricing';

describe('Editorial pricing from the 2026–2027 workbook', () => {
  it.each([
    [200, 50, 555],
    [150, 200, 880],
    [400, 1000, 5455],
    [130, 200, 880],
    [1, 50, 435],
    [100, 50, 435],
    [101, 50, 520],
    [150, 50, 520],
    [151, 50, 555],
  ])('prices the main estimate for %i pages and %i copies at %i euros', (pages, copies, amount) => {
    expect(getPrintEstimate('complete', pages, copies)).toMatchObject({ kind: 'priced', amount });
  });

  it('resolves all 36 inclusive main tiers and all 36 separate printing tiers', () => {
    let combinations = 0;
    for (const copies of copyCounts) {
      pageLimits.forEach((limit, index) => {
        const first = index === 0 ? 1 : pageLimits[index - 1] + 1;
        for (const pages of [first, limit]) {
          expect(getPrintEstimate('complete', pages, copies)).toEqual({
            kind: 'priced',
            amount: completePrices[copies][index],
            minPages: first,
            maxPages: limit,
          });
          expect(getPrintEstimate('printing', pages, copies)).toEqual({
            kind: 'priced',
            amount: printingPrices[copies][index],
            minPages: first,
            maxPages: limit,
          });
        }
        combinations++;
      });
    }
    expect(combinations).toBe(36);
  });

  it.each([
    ['layout', 1, 60],
    ['layout', 50, 60],
    ['layout', 51, 110],
    ['layout', 180, 210],
    ['layout', 400, 410],
    ['amazon', 140, 340],
    ['amazon', 150, 340],
    ['amazon', 201, 410],
    ['amazon', 225, 410],
    ['amazon', 400, 685],
  ] as const)('%s at %i pages costs %i euros', (service, pages, amount) => {
    expect(getIndividualEstimate(service, pages)).toMatchObject({ kind: 'priced', amount });
  });

  it.each([151, 180, 195, 200])('uses the explicit Amazon tariff at %i pages', (pages) => {
    expect(getIndividualEstimate('amazon', pages)).toEqual({
      kind: 'priced',
      amount: 375,
      minPages: 151,
      maxPages: 200,
    });
  });

  it('resolves every inclusive layout and Amazon tier without interpolation', () => {
    const limits = [50, 100, 150, 200, 250, 300, 350, 400];
    const expected = {
      layout: [60, 110, 160, 210, 260, 310, 360, 410],
      amazon: [206, 275, 340, 375, 410, 550, 619, 685],
    };
    for (const service of ['layout', 'amazon'] as const) {
      limits.forEach((maxPages, index) => {
        const minPages = index === 0 ? 1 : limits[index - 1] + 1;
        for (const pages of [minPages, maxPages]) {
          expect(getIndividualEstimate(service, pages)).toEqual({
            kind: 'priced',
            amount: expected[service][index],
            minPages,
            maxPages,
          });
        }
      });
    }
  });

  it.each([0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])(
    'rejects invalid page counts: %s',
    (pages) => {
      expect(getIndividualEstimate('layout', pages)).toEqual({
        kind: 'consult',
        reason: 'invalid',
      });
      expect(getPrintEstimate('complete', pages, 50)).toEqual({
        kind: 'consult',
        reason: 'invalid',
      });
      expect(getIndividualEstimate('amazon', pages)).toEqual({
        kind: 'consult',
        reason: 'invalid',
      });
    },
  );

  it.each([401, 500, 10000])('requests a quote for %i pages, without extrapolation', (pages) => {
    expect(getIndividualEstimate('layout', pages)).toEqual({
      kind: 'consult',
      reason: 'out_of_range',
    });
    expect(getIndividualEstimate('amazon', pages)).toEqual({
      kind: 'consult',
      reason: 'out_of_range',
    });
    expect(getPrintEstimate('printing', pages, 50)).toEqual({
      kind: 'consult',
      reason: 'out_of_range',
    });
  });

  it('does not accept unsupported copy counts', () => {
    for (const copies of [0, 51, 150, 1001, NaN]) {
      expect(getPrintEstimate('complete', 200, copies)).toEqual({
        kind: 'consult',
        reason: 'invalid',
      });
      expect(buildCompleteEstimateSummary(200, copies)).toBeNull();
      expect(getPrintEstimate('printing', 200, copies)).toEqual({
        kind: 'consult',
        reason: 'invalid',
      });
    }
  });

  it('uses the independent printing matrix, not the complete proposal', () => {
    expect(getPrintEstimate('printing', 200, 50)).toMatchObject({ amount: 199 });
    expect(getPrintEstimate('printing', 300, 1000)).toMatchObject({ amount: 3830 });
    expect(getPrintEstimate('complete', 200, 50)).toMatchObject({ amount: 555 });
  });

  it('keeps the published single-service ranges intact', () => {
    expect(Object.values(layoutPrices)).toEqual([60, 110, 160, 210, 260, 310, 360, 410]);
    expect(Object.values(amazonPrices)).toEqual([206, 275, 340, 375, 410, 550, 619, 685]);
  });

  it('keeps all printing tariffs and divides by the requested number of copies', () => {
    const expected = [
      [130, 162, 199, 225, 250, 320],
      [230, 275, 325, 380, 430, 550],
      [430, 530, 630, 730, 830, 1100],
      [599, 740, 890, 1100, 1200, 1530],
      [980, 1220, 1470, 1700, 1950, 2530],
      [1920, 2390, 2900, 3360, 3830, 4999],
    ];
    const currency = new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    copyCounts.forEach((copies, row) => {
      pageLimits.forEach((pages, column) => {
        const estimate = getPrintEstimate('printing', pages, copies);
        expect(estimate).toMatchObject({ kind: 'priced', amount: expected[row][column] });
        if (estimate.kind !== 'priced') throw new Error('Expected a published printing price');
        expect(formatUnitPrice(estimate.amount, copies)).toBe(
          currency.format(expected[row][column] / copies),
        );
      });
    });
    expect(formatUnitPrice(199, 50).replace(/\s/g, '')).toBe('3,98€');
  });

  it('copies an estimate with scope, technical specifications, tax caveat and no invented tax rate', () => {
    const summary = buildCompleteEstimateSummary(130, 200)!;
    expect(summary).toContain('Hasta 150 páginas');
    expect(summary).toContain('880');
    expect(summary).toContain('sin IVA');
    expect(summary).toContain(
      'maquetación, diseño de cubierta, impresión, ISBN y depósito legal, y distribución y envío',
    );
    expect(summary).toContain(
      'según las condiciones del servicio, a un único punto de la península',
    );
    expect(summary).toContain('270 g');
    expect(summary).toContain('solapas de 9 cm');
    expect(summary).toContain('Formato 15 x 21 cm - A5');
    expect(summary).not.toContain('A5');
    expect(summary).toContain(
      'No incluye por defecto corrección de estilo, corrección ortotipográfica, publicación en Amazon ni promoción.',
    );
    expect(summary).not.toContain('ISBN/depósito legal');
    expect(summary).not.toMatch(/\d+\s*%/);
  });

  it.each([
    [200, 50, 555, '11,10'],
    [200, 100, 670, '6,70'],
    [150, 200, 880, '4,40'],
    [400, 1000, 5455, '5,46'],
  ])(
    'formats the complete budget average for %i pages and %i copies',
    (pages, copies, total, unit) => {
      const estimate = getPrintEstimate('complete', pages, copies);
      expect(estimate).toMatchObject({ kind: 'priced', amount: total });
      if (estimate.kind !== 'priced') throw new Error('Expected a published price');
      expect(formatUnitPrice(estimate.amount, copies).replace(/\s/g, '')).toBe(`${unit}€`);
    },
  );

  it('formats in Spanish and explains unpriced or invalid estimates', () => {
    expect(formatMoney(0.011)).toContain('0,011');
    expect(formatCount(1000)).toBe('1.000');
    expect(describeEstimate(getIndividualEstimate('layout', 180))).toBe('De 151 a 200 páginas');
    expect(describeEstimate(getIndividualEstimate('amazon', 195))).toBe('De 151 a 200 páginas');
    expect(describeEstimate(getIndividualEstimate('amazon', 401))).toContain('personalizado');
    expect(describeEstimate(getIndividualEstimate('layout', 0))).toContain('número entero');
  });
});
