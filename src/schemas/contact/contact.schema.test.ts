import { describe, expect, it } from 'vitest';

import { publicContactSchema } from './contact.schema';

const validPayload = {
  name: 'María López',
  email: 'maria@example.com',
  phone: '+34 600 000 000',
  message: 'Quiero recibir orientación editorial para publicar mi primer libro.',
  privacyAccepted: true,
};

describe('publicContactSchema', () => {
  it('accepts a valid payload', () => {
    expect(publicContactSchema.parse(validPayload)).toEqual(validPayload);
  });

  it('rejects an invalid name', () => {
    expect(publicContactSchema.safeParse({ ...validPayload, name: 'A' }).success).toBe(false);
  });

  it('rejects an invalid email', () => {
    expect(publicContactSchema.safeParse({ ...validPayload, email: 'correo' }).success).toBe(false);
  });

  it('rejects an invalid message', () => {
    expect(publicContactSchema.safeParse({ ...validPayload, message: 'Corto' }).success).toBe(
      false,
    );
  });

  it('rejects privacyAccepted false', () => {
    expect(publicContactSchema.safeParse({ ...validPayload, privacyAccepted: false }).success).toBe(
      false,
    );
  });

  it('normalizes an empty phone as null', () => {
    expect(publicContactSchema.parse({ ...validPayload, phone: '' }).phone).toBeNull();
  });
});
