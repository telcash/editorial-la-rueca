import path from 'node:path';

import { parseQuaresWorkbook } from '@/features/quares-import/excel-parser';

async function main() {
  const filePath = path.resolve(process.cwd(), 'data/imports/libros_quares.xlsx');

  const result = await parseQuaresWorkbook(filePath);

  console.log('');
  console.log('============================================================');
  console.log('QUARES IMPORT — SOURCE AUDIT');
  console.log('============================================================');
  console.log(`File: ${result.filePath}`);
  console.log(`Sheet: ${result.sheetName}`);
  console.log(`Source rows: ${result.totalSourceRows}`);
  console.log(`Valid rows: ${result.rows.length}`);
  console.log(`Issues: ${result.issues.length}`);
  console.log(`Duplicate external IDs: ${result.duplicateExternalProductIds.length}`);
  console.log(`Duplicate normalized titles: ${result.duplicateNormalizedTitles.length}`);

  if (result.duplicateExternalProductIds.length > 0) {
    console.log('');
    console.log('DUPLICATE EXTERNAL PRODUCT IDS');

    for (const externalProductId of result.duplicateExternalProductIds) {
      console.log(`- ${externalProductId}`);
    }
  }

  if (result.duplicateNormalizedTitles.length > 0) {
    console.log('');
    console.log('DUPLICATE TITLES');

    for (const duplicate of result.duplicateNormalizedTitles) {
      console.log('');
      console.log(`- ${duplicate.normalizedTitle}`);

      for (const row of duplicate.rows) {
        console.log(
          `    row=${row.sourceRow} quares=${row.externalProductId} title="${row.title}"`,
        );
      }
    }
  }

  if (result.issues.length > 0) {
    console.log('');
    console.log('ISSUES');

    for (const issue of result.issues) {
      console.log(`- row=${issue.sourceRow} code=${issue.code}: ${issue.message}`);
    }
  }

  console.log('');
  console.log('MARKET AVAILABILITY COUNTS');

  const counts = new Map<string, number>();

  for (const row of result.rows) {
    for (const countryCode of row.marketCountryCodes) {
      counts.set(countryCode, (counts.get(countryCode) ?? 0) + 1);
    }
  }

  for (const countryCode of ['ES', 'MX', 'US', 'EC', 'AR', 'CL', 'CR', 'CO', 'BO', 'GT', 'VE']) {
    console.log(`${countryCode}: ${counts.get(countryCode) ?? 0}`);
  }

  console.log('');
  console.log('No database writes performed.');
}

main().catch((error) => {
  console.error('');
  console.error('Quares source audit failed.');
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
