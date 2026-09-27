import type { CreateContactRequestInput } from '@/schemas/contact-requests/contact-request.schema';
import { z } from 'zod';

export interface MetaLeadField {
  name: string;
  values: string[];
}

export interface MetaLeadData {
  id: string;
  form_id?: string;
  field_data: MetaLeadField[];
}

export type MetaLeadNormalizationResult =
  | { status: 'normalized'; input: CreateContactRequestInput }
  | { status: 'unprocessable'; reason: 'missing_name' | 'missing_email' | 'invalid_email' };

const normalizedEmailSchema = z.string().trim().toLowerCase().email().max(254);

const knownFieldAliases = {
  fullName: new Set(['full_name', 'fullname', 'name']),
  firstName: new Set(['first_name', 'firstname']),
  lastName: new Set(['last_name', 'lastname', 'surname']),
  email: new Set(['email', 'email_address']),
  phone: new Set(['phone_number', 'phone', 'mobile_phone']),
  province: new Set(['province', 'provincia', 'state', 'region', 'region_name']),
};

function normalizedKey(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
}

function answer(field: MetaLeadField): string {
  return field.values
    .map((value) => value.trim())
    .filter(Boolean)
    .join(', ');
}

function findAnswer(fields: MetaLeadField[], aliases: Set<string>): string | null {
  const found = fields.find((field) => aliases.has(normalizedKey(field.name)));
  const value = found ? answer(found) : '';

  return value || null;
}

function limitText(value: string, limit: number): string {
  return value.slice(0, limit).trim();
}

function buildMessage(fields: MetaLeadField[], formId: string | null): string {
  const standardAliases = new Set(Object.values(knownFieldAliases).flatMap((set) => [...set]));
  const customAnswers = fields
    .filter((field) => !standardAliases.has(normalizedKey(field.name)))
    .map((field) => {
      const question = limitText(field.name.replace(/\s+/g, ' ').trim(), 180);
      const response = limitText(answer(field), 700);
      return question && response ? `${question}:\n${response}` : null;
    })
    .filter((value): value is string => Boolean(value));

  const header = formId
    ? `Solicitud recibida mediante Meta Instant Form. Formulario ID: ${formId}.`
    : 'Solicitud recibida mediante Meta Instant Form.';
  return limitText([header, ...customAnswers].join('\n\n'), 5000);
}

export function normalizeMetaLead(
  lead: MetaLeadData,
  fallbackFormId: string | null,
): MetaLeadNormalizationResult {
  const fields = lead.field_data;
  const fullName = findAnswer(fields, knownFieldAliases.fullName);
  const firstName = findAnswer(fields, knownFieldAliases.firstName);
  const lastName = findAnswer(fields, knownFieldAliases.lastName);
  const name = fullName || [firstName, lastName].filter(Boolean).join(' ').trim();
  const email = findAnswer(fields, knownFieldAliases.email);

  if (!name) {
    return { status: 'unprocessable', reason: 'missing_name' };
  }
  if (!email) {
    return { status: 'unprocessable', reason: 'missing_email' };
  }
  const parsedEmail = normalizedEmailSchema.safeParse(email);
  if (!parsedEmail.success) {
    return { status: 'unprocessable', reason: 'invalid_email' };
  }

  const formId = lead.form_id || fallbackFormId;
  const phone = findAnswer(fields, knownFieldAliases.phone);
  const province = findAnswer(fields, knownFieldAliases.province);

  return {
    status: 'normalized',
    input: {
      name: limitText(name, 160),
      email: limitText(parsedEmail.data, 254),
      phone: phone ? limitText(phone, 80) : null,
      province: province ? limitText(province, 120) : null,
      serviceId: null,
      message: buildMessage(fields, formId),
      source: 'meta_instant_form',
      metaLeadId: lead.id,
      metaFormId: formId,
      metaFormName: null,
    },
  };
}
