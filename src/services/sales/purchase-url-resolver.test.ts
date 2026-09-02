import { describe, expect, it } from 'vitest';

import { isValidProductUrlTemplate, resolvePurchaseUrl } from './purchase-url-resolver';

describe('resolvePurchaseUrl', () => {
  it('uses a valid explicit purchaseUrl before the template', () => {
    expect(
      resolvePurchaseUrl({
        purchaseUrl: 'https://www.amazon.es/libro',
        externalProductId: '67778',
        productUrlTemplate: 'https://tienda.editoriallarueca.com/q/detalle?p2_id={externalId}',
      }),
    ).toBe('https://www.amazon.es/libro');
  });

  it('resolves a template with encoded externalProductId', () => {
    expect(
      resolvePurchaseUrl({
        externalProductId: 'id con espacios/ñ',
        productUrlTemplate: 'https://colombia.editoriallarueca.com/q/detalle?p2_id={externalId}',
      }),
    ).toBe('https://colombia.editoriallarueca.com/q/detalle?p2_id=id%20con%20espacios%2F%C3%B1');
  });

  it('returns null when the template has no externalId placeholder', () => {
    expect(
      resolvePurchaseUrl({
        externalProductId: '67778',
        productUrlTemplate: 'https://tienda.editoriallarueca.com/q/detalle',
      }),
    ).toBeNull();
  });

  it('returns null when externalProductId is missing', () => {
    expect(
      resolvePurchaseUrl({
        productUrlTemplate: 'https://tienda.editoriallarueca.com/q/detalle?p2_id={externalId}',
      }),
    ).toBeNull();
  });

  it('rejects unsafe or invalid URLs', () => {
    expect(isValidProductUrlTemplate('javascript:alert({externalId})')).toBe(false);
    expect(resolvePurchaseUrl({ purchaseUrl: 'not-a-url' })).toBeNull();
  });
});
