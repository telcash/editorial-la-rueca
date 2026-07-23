export type CsvValue = string | number | boolean | null | undefined;
export type CsvRow = Record<string, CsvValue>;

export function toCsv<Row extends object>(rows: Row[], headers: string[]) {
  return [
    headers.map(escapeCsvValue).join(','),
    ...rows.map((row) =>
      headers.map((header) => escapeCsvValue(readCsvValue(row, header))).join(','),
    ),
  ].join('\n');
}

function readCsvValue(row: object, header: string): CsvValue {
  if (!Object.prototype.hasOwnProperty.call(row, header)) {
    return '';
  }

  const value = (row as Partial<CsvRow>)[header];

  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    value === null ||
    value === undefined
  ) {
    return value;
  }

  return JSON.stringify(value);
}

function escapeCsvValue(value: string | number | boolean | null | undefined) {
  if (value === null || value === undefined) {
    return '';
  }

  const stringValue = String(value);

  if (/["\n\r,]/u.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}
