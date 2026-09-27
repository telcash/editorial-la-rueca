import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const mocks = vi.hoisted(() => ({
  createContactRequest: vi.fn(),
  getContactRequestById: vi.fn(),
  markContactRequestEmailNotificationSent: vi.fn(),
  markContactRequestEmailNotificationFailed: vi.fn(),
  sendContactRequestNotification: vi.fn(),
  getContactRequestNotificationErrorMessage: vi.fn(),
}));

vi.mock('./contact-request.service', () => ({
  createContactRequest: mocks.createContactRequest,
  getContactRequestById: mocks.getContactRequestById,
  markContactRequestEmailNotificationSent: mocks.markContactRequestEmailNotificationSent,
  markContactRequestEmailNotificationFailed: mocks.markContactRequestEmailNotificationFailed,
}));

vi.mock('./contact-request-notification', () => ({
  sendContactRequestNotification: mocks.sendContactRequestNotification,
  getContactRequestNotificationErrorMessage: mocks.getContactRequestNotificationErrorMessage,
}));

const { createAndNotifyContactRequest } = await import('./create-and-notify-contact-request');

const id = '45aa8657-bf26-4b62-bc01-8ba7570d7bbb';
const input = {
  name: 'Lucía Martín',
  email: 'lucia@example.com',
  phone: null,
  province: null,
  serviceId: null,
  message: 'Solicitud desde formulario Meta. ¿Manuscrito terminado?: Sí',
  source: 'meta_instant_form' as const,
  metaLeadId: 'lead-123',
  metaFormId: 'form-456',
  metaFormName: null,
};

describe('createAndNotifyContactRequest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createContactRequest.mockResolvedValue({
      status: 'created',
      contactRequest: { id },
    });
    mocks.getContactRequestById.mockResolvedValue({ id, emailSentAt: null });
    mocks.sendContactRequestNotification.mockResolvedValue({
      status: 'sent',
      sentAt: new Date('2026-09-01T10:00:00Z'),
    });
    mocks.markContactRequestEmailNotificationSent.mockResolvedValue({});
    mocks.markContactRequestEmailNotificationFailed.mockResolvedValue({});
    mocks.getContactRequestNotificationErrorMessage.mockReturnValue('SMTP_SEND_ERROR');
  });

  it('persists before SMTP, then marks the notification sent', async () => {
    const result = await createAndNotifyContactRequest(input);

    expect(result).toEqual({ status: 'created', contactRequestId: id });
    expect(mocks.createContactRequest).toHaveBeenCalledWith(input);
    expect(mocks.createContactRequest.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.sendContactRequestNotification.mock.invocationCallOrder[0],
    );
    expect(mocks.markContactRequestEmailNotificationSent).toHaveBeenCalledOnce();
    expect(mocks.markContactRequestEmailNotificationFailed).not.toHaveBeenCalled();
  });

  it('keeps a persisted lead and records SMTP failure without failing intake', async () => {
    mocks.sendContactRequestNotification.mockRejectedValue(new Error('smtp failed'));

    await expect(createAndNotifyContactRequest(input)).resolves.toEqual({
      status: 'created',
      contactRequestId: id,
    });
    expect(mocks.markContactRequestEmailNotificationFailed).toHaveBeenCalledWith(
      id,
      'SMTP_SEND_ERROR',
    );
    expect(mocks.markContactRequestEmailNotificationSent).not.toHaveBeenCalled();
  });

  it('does not label a database read failure as SMTP failure', async () => {
    mocks.getContactRequestById.mockRejectedValue(new Error('DB read failed'));

    await expect(createAndNotifyContactRequest(input)).resolves.toEqual({
      status: 'created',
      contactRequestId: id,
    });
    expect(mocks.sendContactRequestNotification).not.toHaveBeenCalled();
    expect(mocks.markContactRequestEmailNotificationFailed).not.toHaveBeenCalled();
  });

  it('does not mark SMTP failed when post-send status persistence fails', async () => {
    mocks.markContactRequestEmailNotificationSent.mockRejectedValue(new Error('DB update failed'));

    await expect(createAndNotifyContactRequest(input)).resolves.toMatchObject({
      status: 'created',
    });
    expect(mocks.markContactRequestEmailNotificationFailed).not.toHaveBeenCalled();
  });

  it('does not notify again for an idempotent duplicate', async () => {
    mocks.createContactRequest.mockResolvedValue({ status: 'duplicate', contactRequest: null });

    await expect(createAndNotifyContactRequest(input)).resolves.toEqual({
      status: 'duplicate',
      contactRequestId: null,
    });
    expect(mocks.getContactRequestById).not.toHaveBeenCalled();
    expect(mocks.sendContactRequestNotification).not.toHaveBeenCalled();
  });
});
