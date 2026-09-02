import ExcelJS from 'exceljs';

import { normalizeBookTitle } from './title-normalizer';
import type {
  QuaresCountryCode,
  QuaresParsedWorkbook,
  QuaresRowIssue,
  QuaresSourceRow,
} from './types';

interface MarketColumnDefinition {
  column: number;
  headerVariants: string[];
  countryCode: QuaresCountryCode;
}

const MARKET_COLUMNS: MarketColumnDefinition[] = [
  {
    column: 4,
    headerVariants: ['españa'],
    countryCode: 'ES',
  },
  {
    column: 5,
    headerVariants: ['mexico', 'méxico'],
    countryCode: 'MX',
  },
  {
    column: 6,
    headerVariants: ['usa', 'eeuu', 'estados unidos'],
    countryCode: 'US',
  },
  {
    column: 7,
    headerVariants: ['ecuador'],
    countryCode: 'EC',
  },
  {
    column: 8,
    headerVariants: ['argentina'],
    countryCode: 'AR',
  },
  {
    column: 9,
    headerVariants: ['chile'],
    countryCode: 'CL',
  },
  {
    column: 10,
    headerVariants: ['costa rica'],
    countryCode: 'CR',
  },
  {
    column: 11,
    headerVariants: ['colombia'],
    countryCode: 'CO',
  },
  {
    column: 12,
    headerVariants: ['bolivia'],
    countryCode: 'BO',
  },
  {
    column: 13,
    headerVariants: ['guatemala'],
    countryCode: 'GT',
  },
  {
    column: 14,
    headerVariants: ['venezuela'],
    countryCode: 'VE',
  },
];

function cellToString(cell: ExcelJS.Cell): string {
  const value = cell.value;

  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'string') {
    return value.trim();
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value).trim();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === 'object') {
    if ('text' in value && typeof value.text === 'string') {
      return value.text.trim();
    }

    if ('result' in value && value.result !== undefined && value.result !== null) {
      return String(value.result).trim();
    }

    if ('richText' in value && Array.isArray(value.richText)) {
      return value.richText
        .map((part) => ('text' in part ? part.text : ''))
        .join('')
        .trim();
    }
  }

  return String(value).trim();
}

function normalizeHeader(value: string): string {
  return value.normalize('NFKC').trim().toLocaleLowerCase('es').replace(/\s+/g, ' ');
}

function validateHeaders(worksheet: ExcelJS.Worksheet): void {
  const titleHeader = normalizeHeader(cellToString(worksheet.getCell(1, 2)));

  if (titleHeader !== 'título' && titleHeader !== 'titulo') {
    throw new Error(
      `Formato Quares no reconocido. Se esperaba "Título" en B1 y se encontró "${cellToString(
        worksheet.getCell(1, 2),
      )}".`,
    );
  }

  for (const market of MARKET_COLUMNS) {
    const actual = normalizeHeader(cellToString(worksheet.getCell(1, market.column)));

    if (!market.headerVariants.includes(actual)) {
      throw new Error(
        `Formato Quares no reconocido en columna ${market.column}. ` +
          `Se esperaba ${market.headerVariants.join(' / ')} y se encontró "${actual}".`,
      );
    }
  }
}

function parseMarketValue(
  rawValue: string,
  sourceRow: number,
  columnName: string,
  issues: QuaresRowIssue[],
): boolean {
  const value = rawValue.normalize('NFKC').trim().toLocaleUpperCase('es');

  if (value === 'SI' || value === 'SÍ') {
    return true;
  }

  if (value === 'N/D' || value === '') {
    return false;
  }

  issues.push({
    sourceRow,
    code: 'INVALID_MARKET_VALUE',
    message: `Valor territorial no reconocido en ${columnName}: "${rawValue}".`,
    column: columnName,
    value: rawValue,
  });

  return false;
}

export async function parseQuaresWorkbook(filePath: string): Promise<QuaresParsedWorkbook> {
  const workbook = new ExcelJS.Workbook();

  await workbook.xlsx.readFile(filePath);

  if (workbook.worksheets.length === 0) {
    throw new Error('El Excel Quares no contiene ninguna hoja.');
  }

  const worksheet =
    workbook.worksheets.find((sheet) => normalizeHeader(sheet.name).includes('titulos')) ??
    workbook.worksheets.find((sheet) => normalizeHeader(sheet.name).includes('títulos')) ??
    workbook.worksheets[0];

  if (!worksheet) {
    throw new Error('No se pudo resolver la hoja del Excel Quares.');
  }

  validateHeaders(worksheet);

  const issues: QuaresRowIssue[] = [];
  const provisionalRows: QuaresSourceRow[] = [];

  for (let sourceRow = 2; sourceRow <= worksheet.rowCount; sourceRow += 1) {
    const row = worksheet.getRow(sourceRow);

    const externalProductId = cellToString(row.getCell(1));
    const title = cellToString(row.getCell(2));

    const entireRelevantRowIsEmpty =
      externalProductId === '' &&
      title === '' &&
      MARKET_COLUMNS.every(({ column }) => cellToString(row.getCell(column)) === '');

    if (entireRelevantRowIsEmpty) {
      continue;
    }

    let rowIsValid = true;

    if (!externalProductId) {
      rowIsValid = false;

      issues.push({
        sourceRow,
        code: 'MISSING_EXTERNAL_PRODUCT_ID',
        message: 'La fila no tiene ID Quares.',
        column: 'A',
      });
    }

    if (!title) {
      rowIsValid = false;

      issues.push({
        sourceRow,
        code: 'MISSING_TITLE',
        message: 'La fila no tiene título.',
        column: 'B',
      });
    }

    const marketCountryCodes: QuaresCountryCode[] = [];

    for (const market of MARKET_COLUMNS) {
      const rawValue = cellToString(row.getCell(market.column));
      const issueCountBefore = issues.length;

      const isAvailable = parseMarketValue(rawValue, sourceRow, market.countryCode, issues);

      if (issues.length > issueCountBefore) {
        rowIsValid = false;
      }

      if (isAvailable) {
        marketCountryCodes.push(market.countryCode);
      }
    }

    if (!rowIsValid) {
      continue;
    }

    provisionalRows.push({
      sourceRow,
      externalProductId,
      title,
      normalizedTitle: normalizeBookTitle(title),
      marketCountryCodes,
    });
  }

  const rowsByExternalId = new Map<string, QuaresSourceRow[]>();

  for (const row of provisionalRows) {
    const existing = rowsByExternalId.get(row.externalProductId) ?? [];
    existing.push(row);
    rowsByExternalId.set(row.externalProductId, existing);
  }

  const duplicateExternalProductIds = Array.from(rowsByExternalId.entries())
    .filter(([, rows]) => rows.length > 1)
    .map(([externalProductId]) => externalProductId)
    .sort();

  for (const externalProductId of duplicateExternalProductIds) {
    const duplicateRows = rowsByExternalId.get(externalProductId) ?? [];

    for (const row of duplicateRows) {
      issues.push({
        sourceRow: row.sourceRow,
        code: 'DUPLICATE_EXTERNAL_PRODUCT_ID',
        message: `El ID Quares "${externalProductId}" aparece más de una vez en la fuente.`,
        column: 'A',
        value: externalProductId,
      });
    }
  }

  const rows = provisionalRows.filter(
    (row) => !duplicateExternalProductIds.includes(row.externalProductId),
  );

  const rowsByNormalizedTitle = new Map<string, QuaresSourceRow[]>();

  for (const row of rows) {
    const existing = rowsByNormalizedTitle.get(row.normalizedTitle) ?? [];
    existing.push(row);
    rowsByNormalizedTitle.set(row.normalizedTitle, existing);
  }

  const duplicateNormalizedTitles = Array.from(rowsByNormalizedTitle.entries())
    .filter(([, matchingRows]) => matchingRows.length > 1)
    .map(([normalizedTitle, matchingRows]) => ({
      normalizedTitle,
      rows: matchingRows.map((row) => ({
        sourceRow: row.sourceRow,
        externalProductId: row.externalProductId,
        title: row.title,
      })),
    }))
    .sort((left, right) => left.normalizedTitle.localeCompare(right.normalizedTitle, 'es'));

  return {
    filePath,
    sheetName: worksheet.name,
    totalSourceRows: provisionalRows.length,
    rows,
    issues,
    duplicateExternalProductIds,
    duplicateNormalizedTitles,
  };
}
