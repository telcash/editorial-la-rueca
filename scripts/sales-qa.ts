import path from 'node:path';

import { loadPilotCliEnv } from '@/features/migration/wordpress-pilot/env';
import { cleanupPilotRuntime } from '@/features/migration/wordpress-pilot/runtime-cleanup';
import { isValidHttpUrl, resolvePurchaseUrl } from '@/services/sales/purchase-url-resolver';

interface QaIssue {
  severity: 'ERROR' | 'WARNING' | 'INFO';
  code: string;
  message: string;
}

interface QaSummary {
  channels: number;
  quaresMarkets: number;
  totalProducts: number;
  quaresProducts: number;
  activeQuaresProducts: number;
  inactiveQuaresProducts: number;
  amazonProducts: number;
  quaresAvailabilityRows: number;
  quaresWithoutMarkets: number;
  errors: number;
  warnings: number;
  info: number;
}

const EXPECTED_QUARES_MARKETS = new Set([
  'ES',
  'AR',
  'BO',
  'CL',
  'CO',
  'CR',
  'EC',
  'GT',
  'MX',
  'US',
  'VE',
]);

/*
 * Current known commercial snapshot after F5 + F6:
 *
 * Quares:
 *   185 synchronized/imported active products
 *   + 1 pre-existing inactive product (Quares 22333)
 *   = 186 total
 *
 * Amazon:
 *   118 synchronized products
 *
 * These numbers are regression signals, not schema invariants.
 * Future legitimate additions should therefore produce a warning,
 * never a structural QA failure.
 */
const EXPECTED_TOTAL_QUARES_PRODUCTS = 186;
const EXPECTED_ACTIVE_QUARES_PRODUCTS = 185;
const EXPECTED_AMAZON_PRODUCTS = 118;

const KNOWN_QUARES_REGRESSION_ID = '67778';

function addError(issues: QaIssue[], code: string, message: string): void {
  issues.push({
    severity: 'ERROR',
    code,
    message,
  });
}

function addWarning(issues: QaIssue[], code: string, message: string): void {
  issues.push({
    severity: 'WARNING',
    code,
    message,
  });
}

function addInfo(issues: QaIssue[], code: string, message: string): void {
  issues.push({
    severity: 'INFO',
    code,
    message,
  });
}

function isValidAmazonUrl(value: string): boolean {
  if (!isValidHttpUrl(value)) {
    return false;
  }

  try {
    const url = new URL(value);

    return (
      (url.hostname === 'amazon.es' || url.hostname === 'www.amazon.es') &&
      /^\/dp\/[A-Z0-9]{10}(?:\/|$)/i.test(url.pathname)
    );
  } catch {
    return false;
  }
}

function extractAmazonAsin(value: string): string | null {
  if (!isValidAmazonUrl(value)) {
    return null;
  }

  try {
    const url = new URL(value);
    const match = url.pathname.match(/^\/dp\/([A-Z0-9]{10})(?:\/|$)/i);

    return match?.[1]?.toUpperCase() ?? null;
  } catch {
    return null;
  }
}

async function main() {
  /*
   * Load environment before importing db-backed modules.
   */
  loadPilotCliEnv(process.cwd());

  try {
    const [salesRepository, dbSchema, dbModule] = await Promise.all([
      import('@/repositories/sales/sales.repository'),
      import('@/db/schema'),
      import('@/db'),
    ]);

    const { salesChannels, salesChannelMarkets, bookSalesProducts, bookSalesMarketAvailability } =
      dbSchema;

    const { db } = dbModule;

    const issues: QaIssue[] = [];

    console.log('');
    console.log('============================================================');
    console.log('SALES COMMERCIAL INTEGRITY QA');
    console.log('============================================================');
    console.log('');
    console.log('Mode: READ ONLY');
    console.log(`Project: ${path.basename(process.cwd())}`);

    /*
     * ----------------------------------------------------------
     * Load current commercial state.
     * ----------------------------------------------------------
     */

    const [channels, allMarkets, allProducts, allAvailability] = await Promise.all([
      db.select().from(salesChannels),
      db.select().from(salesChannelMarkets),
      db.select().from(bookSalesProducts),
      db.select().from(bookSalesMarketAvailability),
    ]);

    const quaresChannel = channels.find((channel) => channel.slug === 'quares') ?? null;

    const amazonChannel = channels.find((channel) => channel.slug === 'amazon') ?? null;

    /*
     * ----------------------------------------------------------
     * Required channel integrity.
     * ----------------------------------------------------------
     */

    if (!quaresChannel) {
      addError(issues, 'MISSING_QUARES_CHANNEL', 'Quares sales channel does not exist.');
    }

    if (!amazonChannel) {
      addError(issues, 'MISSING_AMAZON_CHANNEL', 'Amazon sales channel does not exist.');
    }

    if (quaresChannel && !quaresChannel.isActive) {
      addError(issues, 'INACTIVE_QUARES_CHANNEL', 'Quares sales channel is inactive.');
    }

    if (amazonChannel && !amazonChannel.isActive) {
      addError(issues, 'INACTIVE_AMAZON_CHANNEL', 'Amazon sales channel is inactive.');
    }

    const quaresMarkets = quaresChannel
      ? allMarkets.filter((market) => market.salesChannelId === quaresChannel.id)
      : [];

    const amazonMarkets = amazonChannel
      ? allMarkets.filter((market) => market.salesChannelId === amazonChannel.id)
      : [];

    const quaresProducts = quaresChannel
      ? allProducts.filter((product) => product.salesChannelId === quaresChannel.id)
      : [];

    const amazonProducts = amazonChannel
      ? allProducts.filter((product) => product.salesChannelId === amazonChannel.id)
      : [];

    const activeQuaresProducts = quaresProducts.filter((product) => product.isActive);

    const inactiveQuaresProducts = quaresProducts.filter((product) => !product.isActive);

    /*
     * ----------------------------------------------------------
     * Quares market integrity.
     * ----------------------------------------------------------
     */

    if (quaresChannel) {
      if (quaresMarkets.length !== 11) {
        addError(
          issues,
          'QUARES_MARKET_COUNT',
          `Expected 11 Quares markets but found ${quaresMarkets.length}.`,
        );
      }

      const marketCodes = new Set(
        quaresMarkets.flatMap((market) =>
          market.countryCode ? [market.countryCode.toUpperCase()] : [],
        ),
      );

      for (const expectedCode of EXPECTED_QUARES_MARKETS) {
        if (!marketCodes.has(expectedCode)) {
          addError(
            issues,
            'MISSING_QUARES_MARKET',
            `Expected Quares market ${expectedCode} was not found.`,
          );
        }
      }

      for (const market of quaresMarkets) {
        if (!market.isActive) {
          addWarning(
            issues,
            'INACTIVE_QUARES_MARKET',
            `Quares market ${market.name} (${market.countryCode ?? 'no country code'}) is inactive.`,
          );
        }

        if (!isValidHttpUrl(market.baseUrl)) {
          addError(
            issues,
            'INVALID_QUARES_BASE_URL',
            `Quares market ${market.name} has invalid base URL: ${market.baseUrl}`,
          );
        }

        if (!market.productUrlTemplate) {
          addError(
            issues,
            'MISSING_QUARES_TEMPLATE',
            `Quares market ${market.name} has no product URL template.`,
          );

          continue;
        }

        const testUrl = resolvePurchaseUrl({
          externalProductId: KNOWN_QUARES_REGRESSION_ID,
          productUrlTemplate: market.productUrlTemplate,
        });

        if (!testUrl) {
          addError(
            issues,
            'INVALID_QUARES_TEMPLATE',
            `Quares market ${market.name} has an invalid product URL template: ${market.productUrlTemplate}`,
          );
        }
      }
    }

    /*
     * Amazon intentionally has no market entities.
     */
    if (amazonMarkets.length > 0) {
      addError(
        issues,
        'AMAZON_HAS_MARKETS',
        `Amazon should not use sales_channel_markets, but ${amazonMarkets.length} market row(s) were found.`,
      );
    }

    /*
     * ----------------------------------------------------------
     * Regression counts.
     *
     * Count changes are warnings only because adding legitimate
     * commercial products in the future is expected.
     * ----------------------------------------------------------
     */

    if (quaresProducts.length !== EXPECTED_TOTAL_QUARES_PRODUCTS) {
      addWarning(
        issues,
        'QUARES_TOTAL_PRODUCT_COUNT_CHANGED',
        `Expected ${EXPECTED_TOTAL_QUARES_PRODUCTS} total Quares products after F5, but found ${quaresProducts.length}.`,
      );
    }

    if (activeQuaresProducts.length !== EXPECTED_ACTIVE_QUARES_PRODUCTS) {
      addWarning(
        issues,
        'QUARES_ACTIVE_PRODUCT_COUNT_CHANGED',
        `Expected ${EXPECTED_ACTIVE_QUARES_PRODUCTS} active Quares products after F5, but found ${activeQuaresProducts.length}.`,
      );
    }

    if (amazonProducts.length !== EXPECTED_AMAZON_PRODUCTS) {
      addWarning(
        issues,
        'AMAZON_PRODUCT_COUNT_CHANGED',
        `Expected ${EXPECTED_AMAZON_PRODUCTS} Amazon products after F6, but found ${amazonProducts.length}.`,
      );
    }

    /*
     * ----------------------------------------------------------
     * Unique book + channel integrity.
     *
     * The database already enforces this with a UNIQUE index,
     * but the QA makes the invariant explicit.
     * ----------------------------------------------------------
     */

    const productByBookChannel = new Map<string, string>();

    for (const product of allProducts) {
      const key = `${product.bookId}:${product.salesChannelId}`;

      const previous = productByBookChannel.get(key);

      if (previous) {
        addError(
          issues,
          'DUPLICATE_BOOK_CHANNEL',
          `Products ${previous} and ${product.id} share book=${product.bookId} channel=${product.salesChannelId}.`,
        );
      } else {
        productByBookChannel.set(key, product.id);
      }
    }

    /*
     * ----------------------------------------------------------
     * External product IDs should identify one book inside the
     * same channel.
     * ----------------------------------------------------------
     */

    const externalOwners = new Map<string, string>();

    for (const product of allProducts) {
      const externalId = product.externalProductId?.trim();

      if (!externalId) {
        continue;
      }

      const key = `${product.salesChannelId}:${externalId.toUpperCase()}`;

      const ownerBookId = externalOwners.get(key);

      if (ownerBookId && ownerBookId !== product.bookId) {
        addError(
          issues,
          'DUPLICATE_EXTERNAL_PRODUCT_ID',
          `External product ID ${externalId} in channel ${product.salesChannelId} belongs to multiple books.`,
        );
      } else {
        externalOwners.set(key, product.bookId);
      }
    }

    /*
     * ----------------------------------------------------------
     * Quares product integrity.
     * ----------------------------------------------------------
     */

    for (const product of quaresProducts) {
      /*
       * An inactive product is a legitimate state supported by
       * the model. It must not be interpreted as corruption.
       */
      if (!product.isActive) {
        addInfo(
          issues,
          'INACTIVE_QUARES_PRODUCT',
          `Quares product ${product.id} for book ${product.bookId} is intentionally inactive.`,
        );
      }

      const externalId = product.externalProductId?.trim();

      if (!externalId) {
        addError(
          issues,
          'MISSING_QUARES_ID',
          `Quares product ${product.id} has no externalProductId.`,
        );
      } else if (!/^\d+$/.test(externalId)) {
        addError(
          issues,
          'INVALID_QUARES_ID',
          `Quares product ${product.id} has non-numeric externalProductId "${externalId}".`,
        );
      }

      if (product.purchaseUrl?.trim()) {
        addWarning(
          issues,
          'QUARES_EXPLICIT_PURCHASE_URL',
          `Quares product ${product.id} has an explicit purchaseUrl. Quares normally resolves URLs from market templates.`,
        );
      }
    }

    /*
     * ----------------------------------------------------------
     * Amazon product integrity.
     * ----------------------------------------------------------
     */

    for (const product of amazonProducts) {
      if (!product.isActive) {
        addInfo(
          issues,
          'INACTIVE_AMAZON_PRODUCT',
          `Amazon product ${product.id} for book ${product.bookId} is inactive.`,
        );
      }

      const asin = product.externalProductId?.trim().toUpperCase() ?? '';

      if (!asin) {
        addError(issues, 'MISSING_AMAZON_ASIN', `Amazon product ${product.id} has no ASIN.`);
      } else if (!/^[A-Z0-9]{10}$/.test(asin)) {
        addError(
          issues,
          'INVALID_AMAZON_ASIN',
          `Amazon product ${product.id} has invalid ASIN "${asin}".`,
        );
      }

      const purchaseUrl = product.purchaseUrl?.trim() ?? '';

      if (!purchaseUrl) {
        addError(issues, 'MISSING_AMAZON_URL', `Amazon product ${product.id} has no purchase URL.`);

        continue;
      }

      if (!isValidAmazonUrl(purchaseUrl)) {
        addError(
          issues,
          'INVALID_AMAZON_URL',
          `Amazon product ${product.id} has invalid Amazon URL "${purchaseUrl}".`,
        );

        continue;
      }

      const urlAsin = extractAmazonAsin(purchaseUrl);

      if (asin && urlAsin && asin !== urlAsin) {
        addError(
          issues,
          'AMAZON_ASIN_URL_MISMATCH',
          `Amazon product ${product.id}: stored ASIN ${asin} differs from URL ASIN ${urlAsin}.`,
        );
      }

      const resolvedUrl = resolvePurchaseUrl({
        purchaseUrl,
        externalProductId: asin,
      });

      if (resolvedUrl !== purchaseUrl) {
        addError(
          issues,
          'AMAZON_URL_NOT_RESOLVABLE',
          `Amazon product ${product.id} does not resolve to its explicit purchase URL.`,
        );
      }
    }

    /*
     * ----------------------------------------------------------
     * Availability integrity.
     * ----------------------------------------------------------
     */

    const productsById = new Map(allProducts.map((product) => [product.id, product]));

    const marketsById = new Map(allMarkets.map((market) => [market.id, market]));

    const availabilityKeys = new Set<string>();
    const availabilityCountByProductId = new Map<string, number>();

    let quaresAvailabilityRows = 0;

    for (const availability of allAvailability) {
      const product = productsById.get(availability.bookSalesProductId);

      const market = marketsById.get(availability.salesChannelMarketId);

      if (!product) {
        addError(
          issues,
          'ORPHAN_AVAILABILITY_PRODUCT',
          `Availability ${availability.id} references missing product ${availability.bookSalesProductId}.`,
        );

        continue;
      }

      if (!market) {
        addError(
          issues,
          'ORPHAN_AVAILABILITY_MARKET',
          `Availability ${availability.id} references missing market ${availability.salesChannelMarketId}.`,
        );

        continue;
      }

      const currentCount = availabilityCountByProductId.get(product.id) ?? 0;

      availabilityCountByProductId.set(product.id, currentCount + 1);

      const key = `${availability.bookSalesProductId}:${availability.salesChannelMarketId}`;

      if (availabilityKeys.has(key)) {
        addError(
          issues,
          'DUPLICATE_AVAILABILITY',
          `Duplicate availability for product ${availability.bookSalesProductId} and market ${availability.salesChannelMarketId}.`,
        );
      } else {
        availabilityKeys.add(key);
      }

      if (product.salesChannelId !== market.salesChannelId) {
        addError(
          issues,
          'CROSS_CHANNEL_AVAILABILITY',
          `Availability ${availability.id} connects product channel ${product.salesChannelId} to market channel ${market.salesChannelId}.`,
        );
      }

      if (amazonChannel && product.salesChannelId === amazonChannel.id) {
        addError(
          issues,
          'AMAZON_AVAILABILITY_ROW',
          `Amazon product ${product.id} unexpectedly has market availability.`,
        );
      }

      if (quaresChannel && product.salesChannelId === quaresChannel.id) {
        quaresAvailabilityRows += 1;
      }
    }

    /*
     * A Quares product with zero markets is valid.
     *
     * F7 verified against the original Excel that the current
     * zero-market products exactly reproduce source availability.
     * Such a product simply has no current Quares destination
     * that can be exposed publicly.
     */
    const quaresProductsWithoutMarkets = quaresProducts.filter(
      (product) => (availabilityCountByProductId.get(product.id) ?? 0) === 0,
    );

    if (quaresProductsWithoutMarkets.length > 0) {
      addInfo(
        issues,
        'QUARES_PRODUCTS_WITHOUT_MARKETS',
        `${quaresProductsWithoutMarkets.length} Quares product(s) have zero market availability. This is valid and currently matches the controlled Excel source.`,
      );
    }

    /*
     * Amazon must have zero availability rows.
     */
    for (const product of amazonProducts) {
      const count = availabilityCountByProductId.get(product.id) ?? 0;

      if (count > 0) {
        addError(
          issues,
          'AMAZON_WITH_MARKET',
          `Amazon product ${product.id} has ${count} market availability row(s).`,
        );
      }
    }

    /*
     * ----------------------------------------------------------
     * Product status consistency.
     *
     * Non-available statuses are legitimate states in the model.
     * They are informational unless some other structural rule
     * fails.
     * ----------------------------------------------------------
     */

    for (const product of allProducts) {
      if (product.status !== 'available') {
        addInfo(
          issues,
          'NON_AVAILABLE_PRODUCT',
          `Product ${product.id} has commercial status "${product.status}".`,
        );
      }
    }

    /*
     * ----------------------------------------------------------
     * Known regression: Quares 67778 / Cuando el río suena.
     * ----------------------------------------------------------
     */

    const knownQuaresProduct =
      quaresProducts.find(
        (product) => product.externalProductId?.trim() === KNOWN_QUARES_REGRESSION_ID,
      ) ?? null;

    if (!knownQuaresProduct) {
      addError(
        issues,
        'MISSING_KNOWN_QUARES_PRODUCT',
        `Known Quares product ${KNOWN_QUARES_REGRESSION_ID} was not found.`,
      );
    } else {
      if (!knownQuaresProduct.isActive) {
        addError(
          issues,
          'KNOWN_QUARES_PRODUCT_INACTIVE',
          `Known Quares product ${KNOWN_QUARES_REGRESSION_ID} is unexpectedly inactive.`,
        );
      }

      if (knownQuaresProduct.status !== 'available') {
        addError(
          issues,
          'KNOWN_QUARES_PRODUCT_UNAVAILABLE',
          `Known Quares product ${KNOWN_QUARES_REGRESSION_ID} has unexpected status "${knownQuaresProduct.status}".`,
        );
      }

      const knownAvailability = allAvailability.filter(
        (availability) => availability.bookSalesProductId === knownQuaresProduct.id,
      );

      if (knownAvailability.length !== 11) {
        addError(
          issues,
          'KNOWN_QUARES_MARKET_COUNT',
          `Known Quares product ${KNOWN_QUARES_REGRESSION_ID} should have 11 markets but has ${knownAvailability.length}.`,
        );
      }

      for (const availability of knownAvailability) {
        const market = marketsById.get(availability.salesChannelMarketId);

        if (!market?.productUrlTemplate) {
          addError(
            issues,
            'KNOWN_QUARES_INVALID_MARKET',
            `Known Quares product ${KNOWN_QUARES_REGRESSION_ID} references a market without product URL template.`,
          );

          continue;
        }

        const resolved = resolvePurchaseUrl({
          externalProductId: KNOWN_QUARES_REGRESSION_ID,
          productUrlTemplate: market.productUrlTemplate,
        });

        if (!resolved) {
          addError(
            issues,
            'KNOWN_QUARES_URL_FAILURE',
            `Known Quares product ${KNOWN_QUARES_REGRESSION_ID} could not resolve URL for market ${market.name}.`,
          );
        }
      }
    }

    /*
     * ----------------------------------------------------------
     * Public repository regression for known Quares product.
     * ----------------------------------------------------------
     */

    if (knownQuaresProduct) {
      const publicRows = await salesRepository.findPublicPurchaseRowsByBookId(
        knownQuaresProduct.bookId,
      );

      const knownPublicRows = publicRows.filter(
        (row) =>
          row.channelSlug === 'quares' &&
          row.productExternalProductId === KNOWN_QUARES_REGRESSION_ID,
      );

      if (knownPublicRows.length !== 11) {
        addError(
          issues,
          'KNOWN_QUARES_PUBLIC_MARKET_COUNT',
          `Quares ${KNOWN_QUARES_REGRESSION_ID} should expose 11 public market rows but exposes ${knownPublicRows.length}.`,
        );
      }

      for (const row of knownPublicRows) {
        if (!row.productIsActive) {
          addError(
            issues,
            'KNOWN_PUBLIC_PRODUCT_INACTIVE',
            `Public Quares row for ${KNOWN_QUARES_REGRESSION_ID} references an inactive product.`,
          );
        }

        if (!row.channelIsActive) {
          addError(
            issues,
            'KNOWN_PUBLIC_CHANNEL_INACTIVE',
            `Public Quares row for ${KNOWN_QUARES_REGRESSION_ID} references an inactive channel.`,
          );
        }

        if (row.marketIsActive !== true) {
          addError(
            issues,
            'KNOWN_PUBLIC_MARKET_INACTIVE',
            `Public Quares row for market ${row.marketName ?? 'unknown'} is not active.`,
          );
        }

        const url = resolvePurchaseUrl({
          purchaseUrl: row.productPurchaseUrl,
          externalProductId: row.productExternalProductId,
          productUrlTemplate: row.marketProductUrlTemplate,
        });

        if (!url) {
          addError(
            issues,
            'KNOWN_PUBLIC_URL_FAILURE',
            `Public Quares row for market ${row.marketName ?? 'unknown'} cannot resolve a purchase URL.`,
          );
        }
      }
    }

    /*
     * ----------------------------------------------------------
     * Final summary.
     * ----------------------------------------------------------
     */

    const errors = issues.filter((issue) => issue.severity === 'ERROR');

    const warnings = issues.filter((issue) => issue.severity === 'WARNING');

    const info = issues.filter((issue) => issue.severity === 'INFO');

    const summary: QaSummary = {
      channels: channels.length,
      quaresMarkets: quaresMarkets.length,
      totalProducts: allProducts.length,
      quaresProducts: quaresProducts.length,
      activeQuaresProducts: activeQuaresProducts.length,
      inactiveQuaresProducts: inactiveQuaresProducts.length,
      amazonProducts: amazonProducts.length,
      quaresAvailabilityRows,
      quaresWithoutMarkets: quaresProductsWithoutMarkets.length,
      errors: errors.length,
      warnings: warnings.length,
      info: info.length,
    };

    console.log('');
    console.log('============================================================');
    console.log('DATABASE SUMMARY');
    console.log('============================================================');

    console.log(`Sales channels: ${summary.channels}`);
    console.log(`Quares markets: ${summary.quaresMarkets}`);
    console.log(`Total sales products: ${summary.totalProducts}`);
    console.log(`Quares products: ${summary.quaresProducts}`);
    console.log(`Active Quares products: ${summary.activeQuaresProducts}`);
    console.log(`Inactive Quares products: ${summary.inactiveQuaresProducts}`);
    console.log(`Amazon products: ${summary.amazonProducts}`);
    console.log(`Quares availability rows: ${summary.quaresAvailabilityRows}`);
    console.log(`Quares products without markets: ${summary.quaresWithoutMarkets}`);

    if (issues.length > 0) {
      console.log('');
      console.log('============================================================');
      console.log('QA OBSERVATIONS');
      console.log('============================================================');

      for (const issue of issues) {
        console.log(`[${issue.severity}] ${issue.code}`);
        console.log(`  ${issue.message}`);
      }
    }

    console.log('');
    console.log('============================================================');
    console.log('QA RESULT');
    console.log('============================================================');

    console.log(`Errors: ${summary.errors}`);
    console.log(`Warnings: ${summary.warnings}`);
    console.log(`Info: ${summary.info}`);

    if (errors.length > 0) {
      console.log('');
      console.log('RESULT: FAILED');

      process.exitCode = 1;

      return;
    }

    if (warnings.length > 0) {
      console.log('');
      console.log('RESULT: PASSED WITH WARNINGS');

      return;
    }

    console.log('');
    console.log('RESULT: PASSED');
  } finally {
    await cleanupPilotRuntime();
  }
}

main().catch((error: unknown) => {
  console.error('');
  console.error('Sales QA failed.');

  if (error instanceof Error) {
    console.error(error);
    console.error('Cause:', error.cause);
  } else {
    console.error(error);
  }

  process.exitCode = 1;
});
