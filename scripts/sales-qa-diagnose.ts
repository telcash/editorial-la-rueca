import { loadPilotCliEnv } from '@/features/migration/wordpress-pilot/env';
import { cleanupPilotRuntime } from '@/features/migration/wordpress-pilot/runtime-cleanup';

interface QuaresDiagnosticRow {
  productId: string;
  bookId: string;
  title: string;
  slug: string;
  bookPublished: boolean;
  bookArchived: boolean;
  externalProductId: string | null;
  purchaseUrl: string | null;
  status: string;
  productActive: boolean;
  marketCount: number;
  markets: string[];
  productCreatedAt: Date;
  productUpdatedAt: Date;
}

function formatDate(value: Date): string {
  return value.toISOString();
}

function printProduct(row: QuaresDiagnosticRow): void {
  console.log('');
  console.log('------------------------------------------------------------');
  console.log(`TITLE: ${row.title}`);
  console.log(`BOOK ID: ${row.bookId}`);
  console.log(`BOOK SLUG: ${row.slug}`);
  console.log(`PRODUCT ID: ${row.productId}`);
  console.log(`QUARES ID: ${row.externalProductId ?? '(none)'}`);
  console.log(`PRODUCT ACTIVE: ${row.productActive}`);
  console.log(`PRODUCT STATUS: ${row.status}`);
  console.log(`BOOK PUBLISHED: ${row.bookPublished}`);
  console.log(`BOOK ARCHIVED: ${row.bookArchived}`);
  console.log(`MARKET COUNT: ${row.marketCount}`);
  console.log(`MARKETS: ${row.markets.length > 0 ? row.markets.join(', ') : '(none)'}`);
  console.log(`PURCHASE URL: ${row.purchaseUrl ?? '(none)'}`);
  console.log(`CREATED AT: ${formatDate(row.productCreatedAt)}`);
  console.log(`UPDATED AT: ${formatDate(row.productUpdatedAt)}`);
}

async function main() {
  /*
   * Environment must be loaded before importing db-backed modules.
   */
  loadPilotCliEnv(process.cwd());

  try {
    const [{ db }, schema] = await Promise.all([import('@/db'), import('@/db/schema')]);

    const {
      books,
      salesChannels,
      salesChannelMarkets,
      bookSalesProducts,
      bookSalesMarketAvailability,
    } = schema;

    console.log('');
    console.log('============================================================');
    console.log('QUARES QA DIAGNOSTIC');
    console.log('============================================================');
    console.log('');
    console.log('Mode: READ ONLY');

    /*
     * Load everything required for an in-memory diagnosis.
     * The commercial dataset is small enough for this QA script.
     */
    const [allBooks, allChannels, allMarkets, allProducts, allAvailability] = await Promise.all([
      db.select().from(books),
      db.select().from(salesChannels),
      db.select().from(salesChannelMarkets),
      db.select().from(bookSalesProducts),
      db.select().from(bookSalesMarketAvailability),
    ]);

    const quaresChannel = allChannels.find((channel) => channel.slug === 'quares') ?? null;

    if (!quaresChannel) {
      throw new Error('Quares sales channel was not found.');
    }

    const quaresMarkets = allMarkets.filter((market) => market.salesChannelId === quaresChannel.id);

    const quaresProducts = allProducts.filter(
      (product) => product.salesChannelId === quaresChannel.id,
    );

    const booksById = new Map(allBooks.map((book) => [book.id, book]));

    const marketsById = new Map(quaresMarkets.map((market) => [market.id, market]));

    const availabilityByProductId = new Map<string, typeof allAvailability>();

    for (const availability of allAvailability) {
      const existing = availabilityByProductId.get(availability.bookSalesProductId) ?? [];

      existing.push(availability);

      availabilityByProductId.set(availability.bookSalesProductId, existing);
    }

    const diagnostics: QuaresDiagnosticRow[] = [];

    for (const product of quaresProducts) {
      const book = booksById.get(product.bookId);

      if (!book) {
        console.log('');
        console.log(`[ERROR] Missing book for Quares product ${product.id}`);

        continue;
      }

      const availability = availabilityByProductId.get(product.id) ?? [];

      const marketNames = availability
        .map((row) => marketsById.get(row.salesChannelMarketId))
        .filter((market): market is NonNullable<typeof market> => Boolean(market))
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((market) => {
          const countryCode = market.countryCode?.toUpperCase() ?? '--';

          return `${countryCode}:${market.name}`;
        });

      diagnostics.push({
        productId: product.id,
        bookId: product.bookId,
        title: book.title,
        slug: book.slug,
        bookPublished: book.isPublished,
        bookArchived: book.isArchived,
        externalProductId: product.externalProductId?.trim() || null,
        purchaseUrl: product.purchaseUrl?.trim() || null,
        status: product.status,
        productActive: product.isActive,
        marketCount: availability.length,
        markets: marketNames,
        productCreatedAt: product.createdAt,
        productUpdatedAt: product.updatedAt,
      });
    }

    diagnostics.sort((a, b) =>
      a.title.localeCompare(b.title, 'es', {
        sensitivity: 'base',
      }),
    );

    /*
     * ----------------------------------------------------------
     * 1. General state
     * ----------------------------------------------------------
     */

    const inactiveProducts = diagnostics.filter((row) => !row.productActive);

    const nonAvailableProducts = diagnostics.filter((row) => row.status !== 'available');

    const withoutMarkets = diagnostics.filter((row) => row.marketCount === 0);

    const withoutExternalId = diagnostics.filter((row) => !row.externalProductId);

    console.log('');
    console.log('============================================================');
    console.log('SUMMARY');
    console.log('============================================================');

    console.log(`Total Quares products: ${diagnostics.length}`);
    console.log(`Active: ${diagnostics.filter((row) => row.productActive).length}`);
    console.log(`Inactive: ${inactiveProducts.length}`);
    console.log(
      `Status available: ${diagnostics.filter((row) => row.status === 'available').length}`,
    );
    console.log(`Status != available: ${nonAvailableProducts.length}`);
    console.log(`With markets: ${diagnostics.filter((row) => row.marketCount > 0).length}`);
    console.log(`Without markets: ${withoutMarkets.length}`);
    console.log(`Without Quares ID: ${withoutExternalId.length}`);

    /*
     * ----------------------------------------------------------
     * 2. Inactive Quares products
     * ----------------------------------------------------------
     */

    console.log('');
    console.log('============================================================');
    console.log('INACTIVE QUARES PRODUCTS');
    console.log('============================================================');

    if (inactiveProducts.length === 0) {
      console.log('None.');
    } else {
      for (const row of inactiveProducts) {
        printProduct(row);
      }
    }

    /*
     * ----------------------------------------------------------
     * 3. Quares products without market availability
     * ----------------------------------------------------------
     */

    console.log('');
    console.log('============================================================');
    console.log('QUARES PRODUCTS WITHOUT MARKETS');
    console.log('============================================================');

    if (withoutMarkets.length === 0) {
      console.log('None.');
    } else {
      for (const row of withoutMarkets) {
        printProduct(row);
      }
    }

    /*
     * ----------------------------------------------------------
     * 4. Non-available products
     * ----------------------------------------------------------
     */

    console.log('');
    console.log('============================================================');
    console.log('QUARES PRODUCTS WITH NON-AVAILABLE STATUS');
    console.log('============================================================');

    if (nonAvailableProducts.length === 0) {
      console.log('None.');
    } else {
      for (const row of nonAvailableProducts) {
        printProduct(row);
      }
    }

    /*
     * ----------------------------------------------------------
     * 5. Missing external IDs
     * ----------------------------------------------------------
     */

    console.log('');
    console.log('============================================================');
    console.log('QUARES PRODUCTS WITHOUT EXTERNAL ID');
    console.log('============================================================');

    if (withoutExternalId.length === 0) {
      console.log('None.');
    } else {
      for (const row of withoutExternalId) {
        printProduct(row);
      }
    }

    /*
     * ----------------------------------------------------------
     * 6. Products created earliest/latest.
     *
     * This is useful for distinguishing products that existed
     * before the controlled import from products created by F5.
     * We are not making assumptions from timestamps here; we
     * merely expose them for diagnosis.
     * ----------------------------------------------------------
     */

    const byCreatedAt = [...diagnostics].sort(
      (a, b) => a.productCreatedAt.getTime() - b.productCreatedAt.getTime(),
    );

    console.log('');
    console.log('============================================================');
    console.log('10 EARLIEST QUARES PRODUCTS');
    console.log('============================================================');

    for (const row of byCreatedAt.slice(0, 10)) {
      console.log(
        `${formatDate(row.productCreatedAt)} | ` +
          `active=${row.productActive} | ` +
          `markets=${row.marketCount} | ` +
          `quares=${row.externalProductId ?? '-'} | ` +
          `${row.title}`,
      );
    }

    console.log('');
    console.log('============================================================');
    console.log('10 LATEST QUARES PRODUCTS');
    console.log('============================================================');

    for (const row of byCreatedAt.slice(-10)) {
      console.log(
        `${formatDate(row.productCreatedAt)} | ` +
          `active=${row.productActive} | ` +
          `markets=${row.marketCount} | ` +
          `quares=${row.externalProductId ?? '-'} | ` +
          `${row.title}`,
      );
    }

    /*
     * ----------------------------------------------------------
     * 7. Known regression Quares 67778
     * ----------------------------------------------------------
     */

    console.log('');
    console.log('============================================================');
    console.log('KNOWN REGRESSION: QUARES 67778');
    console.log('============================================================');

    const regression67778 = diagnostics.find((row) => row.externalProductId === '67778');

    if (!regression67778) {
      console.log('Quares 67778 was not found.');
    } else {
      printProduct(regression67778);
    }

    /*
     * ----------------------------------------------------------
     * 8. Compact list of all suspicious rows.
     * ----------------------------------------------------------
     */

    const suspicious = diagnostics.filter(
      (row) =>
        !row.productActive ||
        row.status !== 'available' ||
        row.marketCount === 0 ||
        !row.externalProductId,
    );

    console.log('');
    console.log('============================================================');
    console.log('COMPACT SUSPICIOUS PRODUCT LIST');
    console.log('============================================================');

    if (suspicious.length === 0) {
      console.log('None.');
    } else {
      for (const row of suspicious) {
        console.log(
          [
            `product=${row.productId}`,
            `book=${row.bookId}`,
            `quares=${row.externalProductId ?? '-'}`,
            `active=${row.productActive}`,
            `status=${row.status}`,
            `markets=${row.marketCount}`,
            `created=${formatDate(row.productCreatedAt)}`,
            `title="${row.title}"`,
          ].join(' | '),
        );
      }
    }

    console.log('');
    console.log('============================================================');
    console.log('END OF DIAGNOSTIC');
    console.log('============================================================');
    console.log('');
    console.log('No database writes performed.');
  } finally {
    await cleanupPilotRuntime();
  }
}

main().catch((error: unknown) => {
  console.error('');
  console.error('Quares QA diagnostic failed.');

  if (error instanceof Error) {
    console.error(error);
    console.error('Cause:', error.cause);
  } else {
    console.error(error);
  }

  process.exitCode = 1;
});
