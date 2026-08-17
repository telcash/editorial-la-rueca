import { access, readFile } from 'node:fs/promises';

import { normalizeQuoteFingerprint, normalizeSlugComparison } from './normalize';
import type { AuthorTestimonialSeedDecision, AuthorTestimonialSeedDecisionValue } from './types';

export const AUTHOR_TESTIMONIALS_SEED_DECISIONS_FILENAME = 'decisions.json';

export function createTestimonialKey(index: number, sourceName: string, quote: string): string {
  const sourceSlug = normalizeSlugComparison(sourceName);
  const quoteFingerprint = normalizeQuoteFingerprint(quote).slice(0, 64).replace(/\s+/g, '-');

  return `${String(index).padStart(2, '0')}-${sourceSlug}-${quoteFingerprint}`;
}

export async function readAuthorTestimonialsSeedDecisions(
  filePath: string,
): Promise<AuthorTestimonialSeedDecision[] | null> {
  if (!(await fileExists(filePath))) {
    return null;
  }

  const raw = await readFile(filePath, 'utf8');
  const parsed = JSON.parse(raw) as unknown;

  return parseAuthorTestimonialsSeedDecisions(parsed);
}

export function parseAuthorTestimonialsSeedDecisions(
  value: unknown,
): AuthorTestimonialSeedDecision[] {
  if (!Array.isArray(value)) {
    throw new Error('decisions.json debe contener un array de decisiones.');
  }

  return value.map(parseDecision);
}

export function serializeAuthorTestimonialsSeedDecisions(
  decisions: AuthorTestimonialSeedDecision[],
): string {
  return `${JSON.stringify(decisions, null, 2)}\n`;
}

function parseDecision(value: unknown): AuthorTestimonialSeedDecision {
  if (!isRecord(value)) {
    throw new Error('Cada decisión debe ser un objeto.');
  }

  const decision = value.decision;

  return {
    testimonialKey: readRequiredString(value, 'testimonialKey'),
    sourceName: readRequiredString(value, 'sourceName'),
    selectedAuthorId: readNullableString(value, 'selectedAuthorId'),
    selectedBookId: readNullableString(value, 'selectedBookId'),
    decision: parseDecisionValue(decision),
    notes: readOptionalString(value, 'notes'),
    reviewed: readBoolean(value, 'reviewed'),
  };
}

function parseDecisionValue(value: unknown): AuthorTestimonialSeedDecisionValue {
  if (value === null || value === 'approved' || value === 'skip' || value === 'manual_review') {
    return value;
  }

  throw new Error('decision debe ser approved, skip, manual_review o null.');
}

function readRequiredString(value: Record<string, unknown>, key: string): string {
  const field = value[key];

  if (typeof field !== 'string' || field.length === 0) {
    throw new Error(`${key} debe ser un string no vacío.`);
  }

  return field;
}

function readNullableString(value: Record<string, unknown>, key: string): string | null {
  const field = value[key];

  if (field === null) {
    return null;
  }

  if (typeof field === 'string') {
    return field.length > 0 ? field : null;
  }

  throw new Error(`${key} debe ser string o null.`);
}

function readOptionalString(value: Record<string, unknown>, key: string): string {
  const field = value[key];

  if (field === undefined) {
    return '';
  }

  if (typeof field !== 'string') {
    throw new Error(`${key} debe ser string.`);
  }

  return field;
}

function readBoolean(value: Record<string, unknown>, key: string): boolean {
  const field = value[key];

  if (typeof field !== 'boolean') {
    throw new Error(`${key} debe ser boolean.`);
  }

  return field;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}
