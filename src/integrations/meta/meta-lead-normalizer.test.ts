import { describe, expect, it } from 'vitest';

import { normalizeMetaLead } from './meta-lead-normalizer';

describe('normalizeMetaLead', () => {
  it('normalizes standard fields and preserves unknown answers from a form', () => {
    const result = normalizeMetaLead(
      {
        id: 'lead-a',
        form_id: 'form-a',
        field_data: [
          { name: 'full_name', values: ['  Ana Pérez '] },
          { name: 'email', values: [' ANA@example.com '] },
          { name: 'phone_number', values: ['+34 600 000 000'] },
          { name: 'provincia', values: ['Madrid'] },
          { name: '¿Manuscrito terminado?', values: ['Sí'] },
        ],
      },
      null,
    );

    expect(result).toMatchObject({
      status: 'normalized',
      input: {
        name: 'Ana Pérez',
        email: 'ana@example.com',
        phone: '+34 600 000 000',
        province: 'Madrid',
        serviceId: null,
        source: 'meta_instant_form',
        metaLeadId: 'lead-a',
        metaFormId: 'form-a',
        metaFormName: null,
      },
    });
    if (result.status === 'normalized') {
      expect(result.input.message).toContain('¿Manuscrito terminado?:\nSí');
      expect(result.input.message).not.toContain('ANA@example.com');
    }
  });

  it('supports different custom fields and optional phone/province', () => {
    const result = normalizeMetaLead(
      {
        id: 'lead-b',
        field_data: [
          { name: 'first_name', values: ['Luis'] },
          { name: 'last_name', values: ['García'] },
          { name: 'email', values: ['luis@example.com'] },
          { name: 'pages', values: ['230'] },
          { name: 'genre', values: ['Novela histórica'] },
        ],
      },
      'form-b',
    );

    expect(result.status).toBe('normalized');
    if (result.status === 'normalized') {
      expect(result.input.name).toBe('Luis García');
      expect(result.input.phone).toBeNull();
      expect(result.input.province).toBeNull();
      expect(result.input.message).toContain('pages:\n230');
      expect(result.input.message).toContain('genre:\nNovela histórica');
    }
  });

  it('does not invent identity when name or email is absent', () => {
    expect(
      normalizeMetaLead(
        { id: 'lead-c', field_data: [{ name: 'email', values: ['a@b.es'] }] },
        null,
      ),
    ).toEqual({ status: 'unprocessable', reason: 'missing_name' });
    expect(
      normalizeMetaLead(
        { id: 'lead-d', field_data: [{ name: 'full_name', values: ['Eva'] }] },
        null,
      ),
    ).toEqual({ status: 'unprocessable', reason: 'missing_email' });
    expect(
      normalizeMetaLead(
        {
          id: 'lead-invalid-email',
          field_data: [
            { name: 'full_name', values: ['Eva'] },
            { name: 'email', values: ['not-an-email'] },
          ],
        },
        null,
      ),
    ).toEqual({ status: 'unprocessable', reason: 'invalid_email' });
  });

  it('creates a useful message even when there are no custom answers', () => {
    const result = normalizeMetaLead(
      {
        id: 'lead-e',
        field_data: [
          { name: 'full_name', values: ['Eva'] },
          { name: 'email', values: ['eva@example.com'] },
        ],
      },
      'form-e',
    );

    expect(result.status).toBe('normalized');
    if (result.status === 'normalized') {
      expect(result.input.message).toContain('Meta Instant Form');
      expect(result.input.message).toContain('form-e');
    }
  });
});
