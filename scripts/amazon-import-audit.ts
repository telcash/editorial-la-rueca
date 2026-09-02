import path from 'node:path';

import { auditAmazonDocx } from '../src/features/amazon-import/docx-parser';

async function main() {
  const filePath = path.resolve(process.cwd(), 'data/imports/titulos_amazon.docx');

  const result = await auditAmazonDocx(filePath);

  console.log('');
  console.log('='.repeat(60));
  console.log('AMAZON SOURCE AUDIT');
  console.log('='.repeat(60));
  console.log('');
  console.log(`Source records: ${result.summary.totalRecords}`);
  console.log(`With Amazon URL: ${result.summary.withUrl}`);
  console.log(`Without URL: ${result.summary.withoutUrl}`);
  console.log(`Not approved: ${result.summary.notApproved}`);
  console.log(`External account: ${result.summary.externalAccount}`);
  console.log(`Review: ${result.summary.review}`);
  console.log(`Duplicate URLs: ${result.summary.duplicateUrls}`);
  console.log(`Duplicate ASINs: ${result.summary.duplicateAsins}`);
  console.log(`Duplicate normalized titles: ${result.summary.duplicateNormalizedTitles}`);

  const importantIssues = result.issues.filter((issue) => issue.code !== 'UNPARSED_TEXT');

  if (importantIssues.length > 0) {
    console.log('');
    console.log('ISSUES');
    console.log('-'.repeat(60));

    for (const issue of importantIssues) {
      console.log(`- ${issue.code} source=${issue.sourceIndex ?? '-'} ${issue.message}`);
    }
  }

  const unparsed = result.issues.filter((issue) => issue.code === 'UNPARSED_TEXT');

  if (unparsed.length > 0) {
    console.log('');
    console.log(`UNPARSED TEXT (${unparsed.length})`);
    console.log('-'.repeat(60));

    for (const issue of unparsed) {
      console.log(`- ${issue.message}`);
    }
  }

  console.log('');
  console.log('SPECIAL / NO URL');
  console.log('-'.repeat(60));

  for (const record of result.records.filter((item) => item.status !== 'HAS_URL')) {
    console.log(
      `- ${record.status} source=${record.sourceIndex} title="${record.title}" author="${record.author ?? '-'}" note="${record.note ?? '-'}"`,
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
