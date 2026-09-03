import path from 'node:path';

import { parseQuaresWorkbook } from '@/features/quares-import/excel-parser';
import { QUARES_COUNTRY_CODES } from '@/features/quares-import/types';

const SOURCE_PATH = path.resolve(process.cwd(), 'data/imports/libros_quares.xlsx');

const TARGET_QUARES_IDS = [
  '43713',
  '43724',
  '49599',
  '43769',
  '43717',
  '43716',
  '43743',
  '43718',
  '43748',
  '43745',
  '42789',
] as const;

async function main() {
  const parsed = await parseQuaresWorkbook(SOURCE_PATH);

  console.log('');
  console.log('============================================================');
  console.log('QUARES ZERO-MARKET SOURCE DIAGNOSTIC');
  console.log('============================================================');
  console.log('');
  console.log(`Source: ${SOURCE_PATH}`);
  console.log(`Sheet: ${parsed.sheetName}`);
  console.log(`Valid source rows: ${parsed.rows.length}`);
  console.log('');

  let found = 0;
  let zeroMarkets = 0;
  let withMarkets = 0;

  for (const externalProductId of TARGET_QUARES_IDS) {
    const row = parsed.rows.find((candidate) => candidate.externalProductId === externalProductId);

    console.log('------------------------------------------------------------');

    if (!row) {
      console.log(`QUARES ID: ${externalProductId}`);
      console.log('SOURCE ROW: NOT FOUND');
      console.log('');

      continue;
    }

    found += 1;

    if (row.marketCountryCodes.length === 0) {
      zeroMarkets += 1;
    } else {
      withMarkets += 1;
    }

    console.log(`QUARES ID: ${row.externalProductId}`);
    console.log(`SOURCE ROW: ${row.sourceRow}`);
    console.log(`TITLE: ${row.title}`);
    console.log(`AVAILABLE MARKETS: ${row.marketCountryCodes.length}`);
    console.log(
      `MARKET CODES: ${
        row.marketCountryCodes.length > 0 ? row.marketCountryCodes.join(', ') : '(none)'
      }`,
    );

    const marketSet = new Set(row.marketCountryCodes);

    console.log(
      QUARES_COUNTRY_CODES.map(
        (countryCode) => `${countryCode}=${marketSet.has(countryCode) ? 'SI' : 'NO'}`,
      ).join(' | '),
    );

    console.log('');
  }

  console.log('============================================================');
  console.log('SUMMARY');
  console.log('============================================================');
  console.log(`Target Quares IDs: ${TARGET_QUARES_IDS.length}`);
  console.log(`Found in source: ${found}`);
  console.log(`Not found in source: ${TARGET_QUARES_IDS.length - found}`);
  console.log(`With zero markets: ${zeroMarkets}`);
  console.log(`With one or more markets: ${withMarkets}`);

  console.log('');

  if (found === TARGET_QUARES_IDS.length && zeroMarkets === TARGET_QUARES_IDS.length) {
    console.log('RESULT: ALL 11 DATABASE ZERO-MARKET PRODUCTS MATCH THE EXCEL SOURCE.');
    console.log('The Quares importer synchronized market availability correctly.');
  } else {
    console.log('RESULT: DATABASE ZERO-MARKET STATE DOES NOT FULLY MATCH THE SOURCE.');
  }

  console.log('');
  console.log('No database writes performed.');
}

main().catch((error: unknown) => {
  console.error('');
  console.error('Quares zero-market diagnostic failed.');

  if (error instanceof Error) {
    console.error(error);
    console.error('Cause:', error.cause);
  } else {
    console.error(error);
  }

  process.exitCode = 1;
});
