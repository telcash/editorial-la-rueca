export const SALES_PRODUCT_EXTERNAL_ID_PLACEHOLDER = '{externalId}';

function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);

    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export interface PurchaseUrlResolutionInput {
  purchaseUrl?: string | null;
  externalProductId?: string | null;
  productUrlTemplate?: string | null;
}

export function isValidProductUrlTemplate(template: string): boolean {
  if (!template.includes(SALES_PRODUCT_EXTERNAL_ID_PLACEHOLDER)) {
    return false;
  }

  const resolvedUrl = template.replace(
    SALES_PRODUCT_EXTERNAL_ID_PLACEHOLDER,
    encodeURIComponent('sample-id'),
  );

  return isValidHttpUrl(resolvedUrl);
}

export function resolvePurchaseUrl({
  purchaseUrl,
  externalProductId,
  productUrlTemplate,
}: PurchaseUrlResolutionInput): string | null {
  const normalizedPurchaseUrl = purchaseUrl?.trim();

  if (normalizedPurchaseUrl && isValidHttpUrl(normalizedPurchaseUrl)) {
    return normalizedPurchaseUrl;
  }

  const normalizedExternalProductId = externalProductId?.trim();
  const normalizedProductUrlTemplate = productUrlTemplate?.trim();

  if (
    !normalizedExternalProductId ||
    !normalizedProductUrlTemplate ||
    !isValidProductUrlTemplate(normalizedProductUrlTemplate)
  ) {
    return null;
  }

  const resolvedUrl = normalizedProductUrlTemplate.replace(
    SALES_PRODUCT_EXTERNAL_ID_PLACEHOLDER,
    encodeURIComponent(normalizedExternalProductId),
  );

  return isValidHttpUrl(resolvedUrl) ? resolvedUrl : null;
}
