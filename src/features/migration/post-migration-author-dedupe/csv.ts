export function toCsv(rows: Array<Record<string, string | number | boolean | null>>) {
  if (rows.length === 0) {
    return '';
  }

  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(','),
    ...rows.map((row) => headers.map((header) => escapeCsvCell(row[header] ?? '')).join(',')),
  ];

  return `${lines.join('\n')}\n`;
}

function escapeCsvCell(value: string | number | boolean) {
  const cell = String(value);

  if (!/[",\n\r]/.test(cell)) {
    return cell;
  }

  return `"${cell.replace(/"/g, '""')}"`;
}
