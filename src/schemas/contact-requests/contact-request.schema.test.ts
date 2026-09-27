import { describe, expect, it } from 'vitest';

import {
  createContactRequestSchema,
  updateContactRequestAdminSchema,
} from './contact-request.schema';

const serviceId = 'f3f6a49f-c418-4522-b311-a70b88aab7f4';

const validCreateInput = {
  name: '  Ana Pérez  ',
  email: '  ANA@EXAMPLE.COM  ',
  phone: '+34 600 111 222',
  province: 'Madrid',
  serviceId,
  message: 'Quiero publicar mi libro con acompañamiento editorial.',
};

describe('contact request schemas', () => {
  it('normalizes and validates public creation input', () => {
    const result = createContactRequestSchema.parse({
      ...validCreateInput,
      utmSource: ' instagram ',
      utmMedium: '',
    });

    expect(result).toMatchObject({
      name: 'Ana Pérez',
      email: 'ana@example.com',
      phone: '+34 600 111 222',
      province: 'Madrid',
      source: 'website',
      utmSource: 'instagram',
      utmMedium: null,
    });
  });

  it('requires a usable name, email and message in the shared CRM contract', () => {
    const result = createContactRequestSchema.safeParse({
      name: '',
      email: 'not-an-email',
      message: '',
    });

    expect(result.success).toBe(false);
    const fieldErrors = result.error?.flatten().fieldErrors;

    expect(fieldErrors).toMatchObject({
      name: ['El nombre es obligatorio.'],
      email: ['Introduce un email válido.'],
      message: ['El mensaje es obligatorio.'],
    });
  });

  it('allows Meta CRM records without phone, province or service', () => {
    const result = createContactRequestSchema.parse({
      name: 'Eva Ruiz',
      email: 'eva@example.com',
      message: 'Solicitud recibida mediante Meta Instant Form.',
      source: 'meta_instant_form',
      metaLeadId: 'lead-1',
      metaFormId: 'form-1',
      metaFormName: null,
    });

    expect(result).toMatchObject({
      source: 'meta_instant_form',
      metaLeadId: 'lead-1',
    });
    expect(result).not.toHaveProperty('phone');
    expect(result).not.toHaveProperty('province');
    expect(result).not.toHaveProperty('serviceId');
  });

  it('accepts optional phone values while retaining length limits', () => {
    expect(createContactRequestSchema.safeParse(validCreateInput).success).toBe(true);
    expect(
      createContactRequestSchema.safeParse({
        ...validCreateInput,
        phone: 'x'.repeat(81),
      }).success,
    ).toBe(false);
  });

  it('enforces the database-aligned UTM limits', () => {
    const result = createContactRequestSchema.safeParse({
      ...validCreateInput,
      utmSource: 'x'.repeat(161),
      utmMedium: 'x'.repeat(161),
      utmCampaign: 'x'.repeat(180),
      utmContent: 'x'.repeat(180),
      utmTerm: 'x'.repeat(180),
    });

    expect(result.success).toBe(false);
  });

  it('rejects status and internal notes from public creation input', () => {
    const result = createContactRequestSchema.safeParse({
      ...validCreateInput,
      status: 'won',
      internalNotes: 'No debe entrar por formulario público.',
    });

    expect(result.success).toBe(false);
  });

  it('validates admin update status, service and internal notes', () => {
    expect(
      updateContactRequestAdminSchema.parse({
        status: 'in_progress',
        serviceId,
        internalNotes: '  Llamar el jueves  ',
      }),
    ).toEqual({
      status: 'in_progress',
      serviceId,
      internalNotes: 'Llamar el jueves',
    });
  });

  it('rejects invalid admin status', () => {
    expect(updateContactRequestAdminSchema.safeParse({ status: 'closed' }).success).toBe(false);
  });
});
