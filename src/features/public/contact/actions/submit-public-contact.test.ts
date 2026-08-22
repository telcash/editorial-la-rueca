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
  formData.set('privacyAccepted', 'true');

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
      privacyAccepted: ['Debes aceptar la política de privacidad.'],
    });
    expect(mocks.createContactRequest).not.toHaveBeenCalled();
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
  });
});
