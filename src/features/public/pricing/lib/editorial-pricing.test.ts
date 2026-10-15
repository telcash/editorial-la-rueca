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

  it.each([151, 180, 200])('never interpolates Amazon prices at %i pages', (pages) => {
    expect(getIndividualEstimate('amazon', pages)).toEqual({
      kind: 'consult',
      reason: 'unpublished',
    });
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
    }
  });

  it('uses the independent printing matrix, not the complete proposal', () => {
    expect(getPrintEstimate('printing', 200, 50)).toMatchObject({ amount: 199 });
    expect(getPrintEstimate('printing', 300, 1000)).toMatchObject({ amount: 3830 });
    expect(getPrintEstimate('complete', 200, 50)).toMatchObject({ amount: 555 });
  });

  it('keeps the published single-service ranges intact', () => {
    expect(Object.values(layoutPrices)).toEqual([60, 110, 160, 210, 260, 310, 360, 410]);
    expect(Object.values(amazonPrices)).toEqual([206, 275, 340, null, 410, 550, 619, 685]);
  });

  it('copies an estimate with scope, technical specifications, tax caveat and no invented tax rate', () => {
    const summary = buildCompleteEstimateSummary(130, 200)!;
    expect(summary).toContain('Hasta 150 páginas');
    expect(summary).toContain('880');
    expect(summary).toContain('sin IVA');
    expect(summary).toContain('maquetación, diseño de cubierta, impresión y envío');
    expect(summary).toContain('270 g');
    expect(summary).toContain('solapas de 9 cm');
    expect(summary).toContain('Formato 15 × 21 cm');
    expect(summary).not.toContain('A5');
    expect(summary).toContain('No incluye por defecto correcciones');
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
    expect(describeEstimate(getIndividualEstimate('amazon', 180))).toContain('pendiente');
    expect(describeEstimate(getIndividualEstimate('layout', 0))).toContain('número entero');
  });
});
