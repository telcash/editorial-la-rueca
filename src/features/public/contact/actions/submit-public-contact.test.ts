import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ContactRequestInvalidServiceError } from '@/services/contact-requests/contact-request.errors';
import { initialPublicContactFormState } from '../types/contact-form-state';

const mocks = vi.hoisted(() => ({
  createAndNotifyContactRequest: vi.fn(),
  checkContactRateLimit: vi.fn(),
  headers: vi.fn(),
}));

vi.mock('@/services/contact-requests/create-and-notify-contact-request', () => ({
  createAndNotifyContactRequest: mocks.createAndNotifyContactRequest,
}));

vi.mock('../lib/contact-rate-limit', () => ({
  checkContactRateLimit: mocks.checkContactRateLimit,
}));

vi.mock('next/headers', () => ({ headers: mocks.headers }));

const { submitPublicContactAction } = await import('./submit-public-contact');

const serviceId = 'f3f6a49f-c418-4522-b311-a70b88aab7f4';

function createValidFormData() {
  const formData = new FormData();
  formData.set('name', 'María López');
  formData.set('email', 'maria@example.com');
  formData.set('phone', '+34 600 000 000');
  formData.set('province', 'Madrid');
  formData.set('serviceId', serviceId);
  formData.set('message', 'Quiero recibir orientación editorial para publicar mi primer libro.');
  return formData;
}

describe('submitPublicContactAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createAndNotifyContactRequest.mockResolvedValue({
      status: 'created',
      contactRequestId: '45aa8657-bf26-4b62-bc01-8ba7570d7bbb',
    });
    mocks.checkContactRateLimit.mockResolvedValue({ allowed: true, reason: 'allowed' });
    mocks.headers.mockResolvedValue(new Headers({ 'x-forwarded-for': '203.0.113.10' }));
  });

  it('keeps the web form requirements and fixes source to website', async () => {
    const formData = createValidFormData();
    formData.set('source', 'instagram');
    formData.set('status', 'won');
    formData.set('internalNotes', 'must not be accepted');

    const result = await submitPublicContactAction(initialPublicContactFormState, formData);

    expect(result.success).toBe(true);
    expect(result.contactRequestCreated).toBe(true);
    expect(mocks.createAndNotifyContactRequest).toHaveBeenCalledWith({
      name: 'María López',
      email: 'maria@example.com',
      phone: '+34 600 000 000',
      province: 'Madrid',
      serviceId,
      message: 'Quiero recibir orientación editorial para publicar mi primer libro.',
      source: 'website',
      utmSource: null,
      utmMedium: null,
      utmCampaign: null,
      utmContent: null,
      utmTerm: null,
    });
  });

  it('still requires phone, province and service in the web channel schema', async () => {
    const result = await submitPublicContactAction(initialPublicContactFormState, new FormData());

    expect(result.fieldErrors).toMatchObject({
      name: ['El nombre es obligatorio.'],
      email: ['Introduce un email válido.'],
      phone: expect.arrayContaining(['El teléfono es obligatorio.']),
      province: ['La provincia es obligatoria.'],
      serviceId: ['Selecciona un servicio válido.'],
      message: ['El mensaje debe tener al menos 10 caracteres.'],
    });
    expect(mocks.createAndNotifyContactRequest).not.toHaveBeenCalled();
  });

  it('passes validated UTM attribution to the shared intake use case', async () => {
    const formData = createValidFormData();
    formData.set('utm_source', 'instagram');
    formData.set('utm_medium', 'social');
    formData.set('utm_campaign', 'manuscrito_cajon');
    formData.set('utm_content', 'reel_01');

    await submitPublicContactAction(initialPublicContactFormState, formData);

    expect(mocks.createAndNotifyContactRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'website',
        utmSource: 'instagram',
        utmMedium: 'social',
        utmCampaign: 'manuscrito_cajon',
        utmContent: 'reel_01',
      }),
    );
  });

  it('preserves UTM values when web validation fails', async () => {
    const formData = new FormData();
    formData.set('utm_source', 'instagram');
    formData.set('utm_campaign', 'manuscrito_cajon');
    const result = await submitPublicContactAction(initialPublicContactFormState, formData);

    expect(result.values.utmSource).toBe('instagram');
    expect(result.values.utmCampaign).toBe('manuscrito_cajon');
  });

  it('maps unavailable service and persistence errors without changing the form UX', async () => {
    mocks.createAndNotifyContactRequest.mockRejectedValueOnce(
      new ContactRequestInvalidServiceError(serviceId),
    );
    const unavailableService = await submitPublicContactAction(
      initialPublicContactFormState,
      createValidFormData(),
    );
    expect(unavailableService.fieldErrors.serviceId).toEqual([
      'Selecciona un servicio disponible.',
    ]);

    mocks.createAndNotifyContactRequest.mockRejectedValueOnce(new Error('database failed'));
    const failed = await submitPublicContactAction(
      initialPublicContactFormState,
      createValidFormData(),
    );
    expect(failed.formError).toBe('No hemos podido enviar tu consulta. Inténtalo de nuevo.');
    expect(failed.contactRequestCreated).toBe(false);
  });

  it('keeps honeypot and IP rate limiting before the shared intake use case', async () => {
    const trapped = createValidFormData();
    trapped.set('company', 'Bot Corp');
    await submitPublicContactAction(initialPublicContactFormState, trapped);
    expect(mocks.checkContactRateLimit).not.toHaveBeenCalled();

    mocks.checkContactRateLimit.mockResolvedValue({ allowed: false, reason: 'blocked' });
    const blocked = await submitPublicContactAction(
      initialPublicContactFormState,
      createValidFormData(),
    );
    expect(blocked.formError).toContain('varios envíos');
    expect(mocks.createAndNotifyContactRequest).not.toHaveBeenCalled();
  });
});
