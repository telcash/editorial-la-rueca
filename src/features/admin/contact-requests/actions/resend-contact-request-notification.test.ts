import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ContactRequestAdminDetail } from '@/services/contact-requests/contact-request.types';

const mocks = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  requireEditorialStaff: vi.fn(),
  getContactRequestById: vi.fn(),
  markContactRequestEmailNotificationSent: vi.fn(),
  markContactRequestEmailNotificationFailed: vi.fn(),
  sendContactRequestNotification: vi.fn(),
  getContactRequestNotificationErrorMessage: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: mocks.revalidatePath,
}));

vi.mock('@/services/auth/access.service', () => ({
  requireEditorialStaff: mocks.requireEditorialStaff,
}));

vi.mock('@/services/contact-requests/contact-request.service', () => ({
  getContactRequestById: mocks.getContactRequestById,
  markContactRequestEmailNotificationSent: mocks.markContactRequestEmailNotificationSent,
  markContactRequestEmailNotificationFailed: mocks.markContactRequestEmailNotificationFailed,
}));

vi.mock('@/services/contact-requests/contact-request-notification', () => ({
  sendContactRequestNotification: mocks.sendContactRequestNotification,
  getContactRequestNotificationErrorMessage: mocks.getContactRequestNotificationErrorMessage,
}));

const { resendContactRequestNotificationAction } =
  await import('./resend-contact-request-notification');

const contactRequestId = '45aa8657-bf26-4b62-bc01-8ba7570d7bbb';

const contactRequest: ContactRequestAdminDetail = {
  id: contactRequestId,
  name: 'Ana Pérez',
  email: 'ana@example.com',
  phone: '+34 600 111 222',
  province: 'Madrid',
  serviceId: 'f3f6a49f-c418-4522-b311-a70b88aab7f4',
  message: 'Quiero publicar mi libro con acompañamiento editorial.',
  status: 'in_progress',
  source: 'website',
  utmSource: null,
  utmMedium: null,
  utmCampaign: null,
  utmContent: null,
  utmTerm: null,
  emailSentAt: null,
  emailError: 'Previous SMTP timeout',
  internalNotes: 'Llamar por la tarde',
  createdAt: new Date('2026-02-01T10:00:00.000Z'),
  updatedAt: new Date('2026-02-01T10:00:00.000Z'),
  service: {
    id: 'f3f6a49f-c418-4522-b311-a70b88aab7f4',
    name: 'Corrección de manuscrito',
    slug: 'correccion-de-manuscrito',
  },
};

describe('resendContactRequestNotificationAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireEditorialStaff.mockResolvedValue({ role: 'editor' });
    mocks.getContactRequestById.mockResolvedValue(contactRequest);
    mocks.markContactRequestEmailNotificationSent.mockResolvedValue({
      ...contactRequest,
      emailSentAt: new Date('2026-08-21T10:00:00.000Z'),
      emailError: null,
    });
    mocks.markContactRequestEmailNotificationFailed.mockResolvedValue({
      ...contactRequest,
      emailSentAt: null,
      emailError: 'SMTP timeout',
    });
    mocks.sendContactRequestNotification.mockResolvedValue({
      status: 'sent',
      sentAt: new Date('2026-08-21T10:00:00.000Z'),
    });
    mocks.getContactRequestNotificationErrorMessage.mockReturnValue('SMTP timeout');
  });

  it('requires editorial staff and resends with force enabled', async () => {
    await resendContactRequestNotificationAction(contactRequestId);

    expect(mocks.requireEditorialStaff).toHaveBeenCalledOnce();
    expect(mocks.sendContactRequestNotification).toHaveBeenCalledWith(
      contactRequest,
      undefined,
      undefined,
      { force: true },
    );
  });

  it('marks the notification as sent and clears the previous email error', async () => {
    const result = await resendContactRequestNotificationAction(contactRequestId);

    expect(result).toEqual({
      success: true,
      feedback: 'contactRequestNotificationSent',
    });
    expect(mocks.markContactRequestEmailNotificationSent).toHaveBeenCalledWith(
      contactRequestId,
      new Date('2026-08-21T10:00:00.000Z'),
    );
    expect(mocks.markContactRequestEmailNotificationFailed).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/admin/contact-requests');
    expect(mocks.revalidatePath).toHaveBeenCalledWith(
      `/admin/contact-requests/${contactRequestId}`,
    );
  });

  it('stores a sanitized email error without changing commercial status when SMTP fails', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mocks.sendContactRequestNotification.mockRejectedValue(new Error('smtp raw failure'));

    const result = await resendContactRequestNotificationAction(contactRequestId);

    expect(result).toEqual({
      success: false,
      feedback: 'contactRequestNotificationFailed',
    });
    expect(mocks.markContactRequestEmailNotificationFailed).toHaveBeenCalledWith(
      contactRequestId,
      'SMTP timeout',
    );
    expect(mocks.markContactRequestEmailNotificationSent).not.toHaveBeenCalled();
    expect(mocks.getContactRequestById).toHaveBeenCalledWith(contactRequestId);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[ContactRequestAdmin] Notification retry failed',
      {
        contactRequestId,
        message: 'SMTP timeout',
      },
    );

    consoleErrorSpy.mockRestore();
  });

  it('does not mark SMTP failed when sent status confirmation fails', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mocks.markContactRequestEmailNotificationSent.mockRejectedValue(
      new Error('database unavailable after SMTP delivery'),
    );

    const result = await resendContactRequestNotificationAction(contactRequestId);

    expect(result).toEqual({
      success: true,
      feedback: 'contactRequestNotificationSentUnconfirmed',
    });
    expect(mocks.markContactRequestEmailNotificationFailed).not.toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[ContactRequestAdmin] Notification sent but status confirmation failed',
      expect.objectContaining({ contactRequestId }),
    );

    consoleErrorSpy.mockRestore();
  });
});
