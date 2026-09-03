import { describe, expect, it } from 'vitest';

import { publicContactSchema } from './contact.schema';

const validPayload = {
  name: 'María López',
  email: 'maria@example.com',
  phone: '+34 600 000 000',
  province: 'Madrid',
  serviceId: 'f3f6a49f-c418-4522-b311-a70b88aab7f4',
  message: 'Quiero recibir orientación editorial para publicar mi primer libro.',
  company: '',
};

describe('publicContactSchema', () => {
  it('accepts a valid payload', () => {
    expect(publicContactSchema.parse(validPayload)).toEqual(validPayload);
  });

  it('rejects an invalid name', () => {
    expect(publicContactSchema.safeParse({ ...validPayload, name: '' }).success).toBe(false);
  });

  it('rejects an invalid email', () => {
    expect(publicContactSchema.safeParse({ ...validPayload, email: 'correo' }).success).toBe(false);
  });

  it('rejects an invalid message', () => {
    expect(publicContactSchema.safeParse({ ...validPayload, message: 'Corto' }).success).toBe(
      false,
    );
  });

  it('rejects missing province and serviceId', () => {
    expect(publicContactSchema.safeParse({ ...validPayload, province: '' }).success).toBe(false);
    expect(publicContactSchema.safeParse({ ...validPayload, serviceId: '' }).success).toBe(false);
  });

  it('does not require a privacy acceptance field', () => {
    expect(publicContactSchema.safeParse(validPayload).success).toBe(true);
  });

  it('rejects an empty phone because the business requires it', () => {
    expect(publicContactSchema.safeParse({ ...validPayload, phone: '' }).success).toBe(false);
  });

  it('rejects admin fields and filled honeypot values', () => {
    expect(publicContactSchema.safeParse({ ...validPayload, status: 'won' }).success).toBe(false);
    expect(publicContactSchema.safeParse({ ...validPayload, company: 'Bot Corp' }).success).toBe(
      false,
    );
  });
});
