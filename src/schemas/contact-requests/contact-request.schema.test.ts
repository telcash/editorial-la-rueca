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

  it('requires identity fields, selected service and message', () => {
    const result = createContactRequestSchema.safeParse({
      name: '',
      email: 'not-an-email',
      phone: '',
      province: '',
      serviceId: 'not-a-uuid',
      message: 'corto',
    });

    expect(result.success).toBe(false);
    const fieldErrors = result.error?.flatten().fieldErrors;

    expect(fieldErrors).toMatchObject({
      name: ['El nombre es obligatorio.'],
      email: ['Introduce un email válido.'],
      province: ['La provincia es obligatoria.'],
      serviceId: ['Selecciona un servicio válido.'],
      message: ['El mensaje debe tener al menos 10 caracteres.'],
    });
    expect(fieldErrors?.phone).toContain('El teléfono es obligatorio.');
  });

  it('accepts broad but intentional phone characters only', () => {
    expect(createContactRequestSchema.safeParse(validCreateInput).success).toBe(true);
    expect(
      createContactRequestSchema.safeParse({
        ...validCreateInput,
        phone: 'teléfono<script>',
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
