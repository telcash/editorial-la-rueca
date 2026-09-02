import fs from 'node:fs/promises';
import mammoth from 'mammoth';

import type {
  AmazonAuditIssue,
  AmazonAuditResult,
  AmazonSourceRecord,
  AmazonSourceStatus,
} from './types';
import { normalizeBookTitle } from '../quares-import/title-normalizer';

const AMAZON_URL_RE = /^https?:\/\/(?:www\.)?amazon\.es\/dp\/([A-Z0-9]{10})(?:[/?#].*)?$/i;

function cleanLine(value: string): string {
  return value
    .normalize('NFKC')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractTitle(line: string): string | null {
  const match = line.match(/^(?:t[ií]tulo|titulo)\s*(?::|\.|-)?\s*(.+)$/i);

  return match?.[1]?.trim() || null;
}

function extractAuthor(line: string): string | null {
  const match = line.match(/^(?:autor|autora|autores|autorl|adutor)\s*(?::)?\s*(.+)$/i);

  if (match?.[1]) {
    return match[1].split(/\s*\/\s*(?:en amazon|cuenta)/i)[0]?.trim() || null;
  }

  const deMatch = line.match(/^de\s+(.+)$/i);

  return deMatch?.[1]?.trim() || null;
}

function extractAmazonUrl(line: string): {
  url: string;
  asin: string;
} | null {
  const value = line.trim();
  const match = value.match(AMAZON_URL_RE);

  if (!match?.[1]) {
    return null;
  }

  return {
    url: value,
    asin: match[1].toUpperCase(),
  };
}

function classifySpecialNote(line: string): {
  status: AmazonSourceStatus;
  note: string;
} | null {
  const normalized = line.toLocaleLowerCase('es');

  if (normalized.includes('no lo han aprobado') || normalized.includes('no aprobado')) {
    return {
      status: 'NOT_APPROVED',
      note: line,
    };
  }

  if (normalized.includes('cuenta a la autora') || normalized.includes('cuenta al autor')) {
    return {
      status: 'EXTERNAL_ACCOUNT',
      note: line,
    };
  }

  return null;
}

interface WorkingRecord {
  title: string;
  author: string | null;
  purchaseUrl: string | null;
  asin: string | null;
  status: AmazonSourceStatus;
  note: string | null;
}

function emptyWorkingRecord(title: string): WorkingRecord {
  return {
    title,
    author: null,
    purchaseUrl: null,
    asin: null,
    status: 'NO_URL',
    note: null,
  };
}

function finalizeRecord(working: WorkingRecord, sourceIndex: number): AmazonSourceRecord {
  let status = working.status;

  if (working.purchaseUrl && status === 'NO_URL') {
    status = 'HAS_URL';
  }

  return {
    sourceIndex,
    title: working.title,
    author: working.author,
    purchaseUrl: working.purchaseUrl,
    asin: working.asin,
    status,
    note: working.note,
  };
}

export async function auditAmazonDocx(filePath: string): Promise<AmazonAuditResult> {
  await fs.access(filePath);

  const extracted = await mammoth.extractRawText({ path: filePath });

  const lines = extracted.value.split(/\r?\n/).map(cleanLine).filter(Boolean);

  const records: AmazonSourceRecord[] = [];
  const issues: AmazonAuditIssue[] = [];

  let working: WorkingRecord | null = null;
  let sourceIndex = 0;

  // Caso especial del bloque:
  // "Libros de Guillermo M. Schrem:"
  let inheritedAuthor: string | null = null;

  const finishWorking = () => {
    if (!working) {
      return;
    }

    sourceIndex += 1;

    if (!working.author && inheritedAuthor) {
      working.author = inheritedAuthor;
    }

    records.push(finalizeRecord(working, sourceIndex));
    working = null;
  };

  for (const line of lines) {
    if (/^libros de guillermo m\. schrem\s*:?$/i.test(line)) {
      finishWorking();
      inheritedAuthor = 'Guillermo M. Schrem';
      continue;
    }

    const title = extractTitle(line);

    if (title) {
      finishWorking();
      working = emptyWorkingRecord(title);
      continue;
    }

    const amazon = extractAmazonUrl(line);

    if (amazon && working) {
      working.purchaseUrl = amazon.url;
      working.asin = amazon.asin;
      working.status = 'HAS_URL';
      continue;
    }

    const author = extractAuthor(line);

    if (author && working) {
      working.author = author;

      if (/^guillermo m\. schrem$/i.test(author)) {
        inheritedAuthor = author;
      }

      /*
       * La nota especial puede venir en la misma línea que el autor,
       * por ejemplo:
       * "Autor: Manuel Antón Pérez / en amazon no lo han aprobado"
       *
       * extractAuthor() limpia correctamente el nombre, pero la
       * clasificación debe hacerse sobre la línea original.
       */
      const inlineSpecial = classifySpecialNote(line);

      if (inlineSpecial) {
        working.status = inlineSpecial.status;
        working.note = inlineSpecial.note;
      }

      continue;
    }

    const special = classifySpecialNote(line);

    if (special && working) {
      working.status = special.status;
      working.note = special.note;
      continue;
    }

    // Cabeceras y espacios editoriales conocidos.
    if (/^libros dados de alta en amazon$/i.test(line)) {
      continue;
    }

    // Cualquier otro texto queda señalado, pero nunca genera escritura.
    issues.push({
      sourceIndex: working ? sourceIndex + 1 : null,
      code: 'UNPARSED_TEXT',
      message: line,
    });
  }

  finishWorking();

  for (const record of records) {
    if (!record.title.trim()) {
      issues.push({
        sourceIndex: record.sourceIndex,
        code: 'MISSING_TITLE',
        message: 'Record without title.',
      });
    }

    if (!record.author) {
      issues.push({
        sourceIndex: record.sourceIndex,
        code: 'MISSING_AUTHOR',
        message: `Missing author for "${record.title}".`,
      });
    }

    if (record.purchaseUrl && !AMAZON_URL_RE.test(record.purchaseUrl)) {
      issues.push({
        sourceIndex: record.sourceIndex,
        code: 'INVALID_AMAZON_URL',
        message: `Invalid Amazon URL for "${record.title}": ${record.purchaseUrl}`,
      });
    }
  }

  const urls = new Map<string, AmazonSourceRecord[]>();
  const asins = new Map<string, AmazonSourceRecord[]>();
  const normalizedTitles = new Map<string, AmazonSourceRecord[]>();

  for (const record of records) {
    if (record.purchaseUrl) {
      const group = urls.get(record.purchaseUrl) ?? [];
      group.push(record);
      urls.set(record.purchaseUrl, group);
    }

    if (record.asin) {
      const group = asins.get(record.asin) ?? [];
      group.push(record);
      asins.set(record.asin, group);
    }

    const normalizedTitle = normalizeBookTitle(record.title);
    const titleGroup = normalizedTitles.get(normalizedTitle) ?? [];
    titleGroup.push(record);
    normalizedTitles.set(normalizedTitle, titleGroup);
  }

  const duplicateUrls = Array.from(urls.values()).filter((group) => group.length > 1);

  const duplicateAsins = Array.from(asins.values()).filter((group) => group.length > 1);

  const duplicateTitles = Array.from(normalizedTitles.values()).filter((group) => group.length > 1);

  for (const group of duplicateUrls) {
    issues.push({
      sourceIndex: null,
      code: 'DUPLICATE_URL',
      message: `${group[0]?.purchaseUrl} used by: ${group.map((item) => item.title).join(' | ')}`,
    });
  }

  for (const group of duplicateAsins) {
    issues.push({
      sourceIndex: null,
      code: 'DUPLICATE_ASIN',
      message: `${group[0]?.asin} used by: ${group.map((item) => item.title).join(' | ')}`,
    });
  }

  for (const group of duplicateTitles) {
    issues.push({
      sourceIndex: null,
      code: 'DUPLICATE_NORMALIZED_TITLE',
      message: group
        .map((item) => `${item.title} -> ${item.purchaseUrl ?? item.status}`)
        .join(' | '),
    });
  }

  return {
    filePath,
    records,
    issues,
    summary: {
      totalRecords: records.length,
      withUrl: records.filter((item) => item.status === 'HAS_URL').length,
      withoutUrl: records.filter((item) => item.status === 'NO_URL').length,
      notApproved: records.filter((item) => item.status === 'NOT_APPROVED').length,
      externalAccount: records.filter((item) => item.status === 'EXTERNAL_ACCOUNT').length,
      review: records.filter((item) => item.status === 'REVIEW').length,
      duplicateUrls: duplicateUrls.length,
      duplicateAsins: duplicateAsins.length,
      duplicateNormalizedTitles: duplicateTitles.length,
    },
  };
}
