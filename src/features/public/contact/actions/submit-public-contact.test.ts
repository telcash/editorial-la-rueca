import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ContactRequestInvalidServiceError } from '@/services/contact-requests/contact-request.errors';
import { initialPublicContactFormState } from '../types/contact-form-state';

const mocks = vi.hoisted(() => ({
  createContactRequest: vi.fn(),
  getContactRequestById: vi.fn(),
  markContactRequestEmailNotificationSent: vi.fn(),
  markContactRequestEmailNotificationFailed: vi.fn(),
  sendContactRequestNotification: vi.fn(),
  getContactRequestNotificationErrorMessage: vi.fn(),
  checkContactRateLimit: vi.fn(),
  headers: vi.fn(),
}));

vi.mock('@/services/contact-requests/contact-request.service', () => ({
  createContactRequest: mocks.createContactRequest,
  getContactRequestById: mocks.getContactRequestById,
  markContactRequestEmailNotificationSent: mocks.markContactRequestEmailNotificationSent,
  markContactRequestEmailNotificationFailed: mocks.markContactRequestEmailNotificationFailed,
}));

vi.mock('@/services/contact-requests/contact-request-notification', () => ({
  sendContactRequestNotification: mocks.sendContactRequestNotification,
  getContactRequestNotificationErrorMessage: mocks.getContactRequestNotificationErrorMessage,
}));

vi.mock('../lib/contact-rate-limit', () => ({
  checkContactRateLimit: mocks.checkContactRateLimit,
}));

vi.mock('next/headers', () => ({
  headers: mocks.headers,
}));

const { submitPublicContactAction } = await import('./submit-public-contact');

const serviceId = 'f3f6a49f-c418-4522-b311-a70b88aab7f4';
const contactRequestId = '45aa8657-bf26-4b62-bc01-8ba7570d7bbb';
const sentAt = new Date('2026-08-20T10:00:00.000Z');

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
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mocks.createContactRequest.mockResolvedValue({
      id: contactRequestId,
    });
    mocks.getContactRequestById.mockResolvedValue({
      id: contactRequestId,
      emailSentAt: null,
    });
    mocks.sendContactRequestNotification.mockResolvedValue({
      status: 'sent',
      sentAt,
    });
    mocks.markContactRequestEmailNotificationSent.mockResolvedValue({});
    mocks.markContactRequestEmailNotificationFailed.mockResolvedValue({});
    mocks.getContactRequestNotificationErrorMessage.mockImplementation((error: unknown) =>
      error instanceof Error ? error.message : 'Email failed.',
    );
    mocks.checkContactRateLimit.mockResolvedValue({ allowed: true, reason: 'allowed' });
    mocks.headers.mockResolvedValue(new Headers({ 'x-forwarded-for': '203.0.113.10' }));
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('creates a contact request before sending email with server-side status/source defaults', async () => {
    const formData = createValidFormData();
    formData.set('status', 'won');
    formData.set('source', 'instagram');
    formData.set('internalNotes', 'No debe aceptarse desde cliente.');

    const result = await submitPublicContactAction(initialPublicContactFormState, formData);

    expect(result).toEqual({
      success: true,
      fieldErrors: {},
      formError: null,
      values: initialPublicContactFormState.values,
    });
    expect(mocks.createContactRequest).toHaveBeenCalledWith({
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
    expect(mocks.getContactRequestById).toHaveBeenCalledWith(contactRequestId);
    expect(mocks.sendContactRequestNotification).toHaveBeenCalledWith({
      id: contactRequestId,
      emailSentAt: null,
    });
    expect(mocks.markContactRequestEmailNotificationSent).toHaveBeenCalledWith(
      contactRequestId,
      sentAt,
    );

    const createOrder = mocks.createContactRequest.mock.invocationCallOrder[0];
    const sendOrder = mocks.sendContactRequestNotification.mock.invocationCallOrder[0];

    expect(createOrder).toBeLessThan(sendOrder);
  });

  it('returns field errors without creating a lead when required fields are missing', async () => {
    const result = await submitPublicContactAction(initialPublicContactFormState, new FormData());

    expect(result.success).toBe(false);
    expect(result.fieldErrors).toMatchObject({
      name: ['El nombre es obligatorio.'],
      email: ['Introduce un email válido.'],
      phone: expect.arrayContaining(['El teléfono es obligatorio.']),
      province: ['La provincia es obligatoria.'],
      serviceId: ['Selecciona un servicio válido.'],
      message: ['El mensaje debe tener al menos 10 caracteres.'],
    });
    expect(mocks.createContactRequest).not.toHaveBeenCalled();
  });

  it('processes a valid request without privacyAccepted', async () => {
    const result = await submitPublicContactAction(
      initialPublicContactFormState,
      createValidFormData(),
    );

    expect(result.success).toBe(true);
    expect(mocks.createContactRequest).toHaveBeenCalledOnce();
  });

  it('passes validated UTM attribution to the contact request service', async () => {
    const formData = createValidFormData();
    formData.set('utm_source', 'instagram');
    formData.set('utm_medium', 'social');
    formData.set('utm_campaign', 'manuscrito_cajon');
    formData.set('utm_content', 'reel_01');

    await submitPublicContactAction(initialPublicContactFormState, formData);

    expect(mocks.createContactRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'website',
        utmSource: 'instagram',
        utmMedium: 'social',
        utmCampaign: 'manuscrito_cajon',
        utmContent: 'reel_01',
        utmTerm: null,
      }),
    );
  });

  it('preserves UTM attribution values when validation fails', async () => {
    const formData = new FormData();
    formData.set('utm_source', 'instagram');
    formData.set('utm_campaign', 'manuscrito_cajon');

    const result = await submitPublicContactAction(initialPublicContactFormState, formData);

    expect(result.values.utmSource).toBe('instagram');
    expect(result.values.utmCampaign).toBe('manuscrito_cajon');
  });

  it('returns a service field error for unavailable services', async () => {
    mocks.createContactRequest.mockRejectedValue(new ContactRequestInvalidServiceError(serviceId));

    const result = await submitPublicContactAction(
      initialPublicContactFormState,
      createValidFormData(),
    );

    expect(result).toMatchObject({
      success: false,
      fieldErrors: {
        serviceId: ['Selecciona un servicio disponible.'],
      },
      formError: null,
    });
  });

  it('returns a generic error for unexpected persistence failures', async () => {
    mocks.createContactRequest.mockRejectedValue(new Error('database unavailable'));

    const result = await submitPublicContactAction(
      initialPublicContactFormState,
      createValidFormData(),
    );

    expect(result).toMatchObject({
      success: false,
      fieldErrors: {},
      formError: 'No hemos podido enviar tu consulta. Inténtalo de nuevo.',
    });
    expect(mocks.sendContactRequestNotification).not.toHaveBeenCalled();
  });

  it('returns success and stores emailError when notification fails after persistence', async () => {
    mocks.sendContactRequestNotification.mockRejectedValue(new Error('SMTP connection timeout'));

    const result = await submitPublicContactAction(
      initialPublicContactFormState,
      createValidFormData(),
    );

    expect(result).toEqual({
      success: true,
      fieldErrors: {},
      formError: null,
      values: initialPublicContactFormState.values,
    });
    expect(mocks.createContactRequest).toHaveBeenCalledOnce();
    expect(mocks.markContactRequestEmailNotificationFailed).toHaveBeenCalledWith(
      contactRequestId,
      'SMTP connection timeout',
    );
    expect(mocks.markContactRequestEmailNotificationSent).not.toHaveBeenCalled();
  });

  it('keeps SMTP success separate when confirming the sent status fails', async () => {
    mocks.markContactRequestEmailNotificationSent.mockRejectedValue(
      new Error('database unavailable after SMTP delivery'),
    );

    const result = await submitPublicContactAction(
      initialPublicContactFormState,
      createValidFormData(),
    );

    expect(result.success).toBe(true);
    expect(mocks.markContactRequestEmailNotificationSent).toHaveBeenCalledOnce();
    expect(mocks.markContactRequestEmailNotificationFailed).not.toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[PublicContact] Contact request notification sent but status confirmation failed',
      expect.objectContaining({ contactRequestId }),
    );
  });

  it('returns success when SMTP configuration is missing after persistence', async () => {
    mocks.sendContactRequestNotification.mockRejectedValue(
      new Error('Missing SMTP configuration: SMTP_HOST.'),
    );

    const result = await submitPublicContactAction(
      initialPublicContactFormState,
      createValidFormData(),
    );

    expect(result.success).toBe(true);
    expect(mocks.markContactRequestEmailNotificationFailed).toHaveBeenCalledWith(
      contactRequestId,
      'Missing SMTP configuration: SMTP_HOST.',
    );
  });

  it('does not create a lead when the honeypot is filled', async () => {
    const formData = createValidFormData();
    formData.set('company', 'Bot Corp');

    const result = await submitPublicContactAction(initialPublicContactFormState, formData);

    expect(result.success).toBe(true);
    expect(mocks.createContactRequest).not.toHaveBeenCalled();
    expect(mocks.checkContactRateLimit).not.toHaveBeenCalled();
  });

  it('stops before validation, persistence and SMTP when the rate limit is exceeded', async () => {
    mocks.checkContactRateLimit.mockResolvedValue({ allowed: false, reason: 'blocked' });

    const result = await submitPublicContactAction(
      initialPublicContactFormState,
      createValidFormData(),
    );

    expect(result).toMatchObject({
      success: false,
      formError:
        'Has realizado varios envíos en poco tiempo. Espera unos minutos antes de intentarlo de nuevo.',
    });
    expect(result.values.name).toBe('María López');
    expect(result.values.email).toBe('maria@example.com');
    expect(mocks.createContactRequest).not.toHaveBeenCalled();
    expect(mocks.sendContactRequestNotification).not.toHaveBeenCalled();
  });
});
