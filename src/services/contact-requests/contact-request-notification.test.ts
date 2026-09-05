import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import type { SmtpEmailConfig } from '@/services/email/smtp-email-config';
import {
  buildContactRequestNotificationEmail,
  getContactRequestNotificationErrorMessage,
  sendContactRequestNotification,
} from './contact-request-notification';
import type { ContactRequestAdminDetail } from './contact-request.types';

const smtpConfig: SmtpEmailConfig = {
  host: 'smtp.example.com',
  port: 465,
  secure: true,
  user: 'smtp-user',
  password: 'smtp-password',
  notificationFrom: 'info@editoriallarueca.com',
  notificationTo: 'info@editoriallarueca.com',
  connectionTimeoutMs: 10_000,
  greetingTimeoutMs: 10_000,
  socketTimeoutMs: 15_000,
};

const contactRequest: ContactRequestAdminDetail = {
  id: '45aa8657-bf26-4b62-bc01-8ba7570d7bbb',
  name: 'María <García>',
  email: 'maria@example.com',
  phone: '612 345 678',
  province: 'Madrid & alrededores',
  serviceId: 'f3f6a49f-c418-4522-b311-a70b88aab7f4',
  message: 'Tengo un manuscrito <script>alert("x")</script>\ny quiero orientación.',
  status: 'new',
  source: 'website',
  utmSource: null,
  utmMedium: null,
  utmCampaign: null,
  utmContent: null,
  utmTerm: null,
  emailSentAt: null,
  emailError: null,
  internalNotes: null,
  createdAt: new Date('2026-08-20T10:00:00.000Z'),
  updatedAt: new Date('2026-08-20T10:00:00.000Z'),
  service: {
    id: 'f3f6a49f-c418-4522-b311-a70b88aab7f4',
    name: 'Corrección de manuscrito',
    slug: 'correccion-de-manuscrito',
  },
};

describe('contact request notification email', () => {
  it('builds SMTP headers from corporate config and visitor Reply-To', () => {
    const email = buildContactRequestNotificationEmail(contactRequest, smtpConfig);

    expect(email.from).toBe('Editorial La Rueca <info@editoriallarueca.com>');
    expect(email.to).toBe('info@editoriallarueca.com');
    expect(email.replyTo).toBe('maria@example.com');
    expect(email.subject).toBe('Nueva solicitud web — Corrección de manuscrito');
  });

  it('escapes user and service content in HTML', () => {
    const email = buildContactRequestNotificationEmail(contactRequest, smtpConfig);

    expect(email.html).toContain('María &lt;García&gt;');
    expect(email.html).toContain('Madrid &amp; alrededores');
    expect(email.html).toContain('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;');
    expect(email.html).not.toContain('<script>alert');
  });

  it('generates a text/plain body with the expected lead data', () => {
    const email = buildContactRequestNotificationEmail(contactRequest, smtpConfig);

    expect(email.text).toContain('NUEVA SOLICITUD WEB');
    expect(email.text).toContain('Servicio:\nCorrección de manuscrito');
    expect(email.text).toContain('Correo:\nmaria@example.com');
    expect(email.text).toContain('Origen:\nWebsite');
    expect(email.text).not.toContain('Atribución:');
    expect(email.html).not.toContain('UTM source');
  });

  it('includes only the compact UTM attribution when it exists', () => {
    const email = buildContactRequestNotificationEmail(
      {
        ...contactRequest,
        utmSource: 'instagram & partners',
        utmMedium: 'social',
        utmCampaign: 'manuscrito <septiembre>',
        utmContent: 'reel-01',
        utmTerm: 'novela',
      },
      smtpConfig,
    );

    expect(email.html).toContain('UTM source');
    expect(email.html).toContain('instagram &amp; partners');
    expect(email.html).toContain('manuscrito &lt;septiembre&gt;');
    expect(email.text).toContain('Atribución:');
    expect(email.text).toContain('UTM medium: social');
    expect(email.html).not.toContain('reel-01');
    expect(email.text).not.toContain('reel-01');
    expect(email.html).not.toContain('novela');
    expect(email.text).not.toContain('novela');
  });

  it('sends once and returns sentAt when no previous notification exists', async () => {
    const emailClient = {
      send: vi.fn().mockResolvedValue(undefined),
    };

    const result = await sendContactRequestNotification(contactRequest, emailClient, smtpConfig);

    expect(result.status).toBe('sent');
    expect(result.sentAt).toBeInstanceOf(Date);
    expect(emailClient.send).toHaveBeenCalledOnce();
  });

  it('does not resend when emailSentAt is already present', async () => {
    const emailClient = {
      send: vi.fn().mockResolvedValue(undefined),
    };
    const emailSentAt = new Date('2026-08-20T11:00:00.000Z');

    const result = await sendContactRequestNotification(
      {
        ...contactRequest,
        emailSentAt,
      },
      emailClient,
      smtpConfig,
    );

    expect(result).toEqual({
      status: 'skipped',
      sentAt: emailSentAt,
    });
    expect(emailClient.send).not.toHaveBeenCalled();
  });

  it('resends an already notified contact request when force is explicit', async () => {
    const emailClient = {
      send: vi.fn().mockResolvedValue(undefined),
    };
    const emailSentAt = new Date('2026-08-20T11:00:00.000Z');

    const result = await sendContactRequestNotification(
      {
        ...contactRequest,
        emailSentAt,
      },
      emailClient,
      smtpConfig,
      { force: true },
    );

    expect(result.status).toBe('sent');
    expect(result.sentAt).toBeInstanceOf(Date);
    expect(emailClient.send).toHaveBeenCalledOnce();
  });

  it('sanitizes SMTP errors before storing or logging them', () => {
    expect(
      getContactRequestNotificationErrorMessage(
        new Error('Authentication failed for info@editoriallarueca.com\nstack trace'),
      ),
    ).toBe('Authentication failed for [email] stack trace');

    expect(
      getContactRequestNotificationErrorMessage(
        new Error(
          'SMTP_PASSWORD=super-secret smtp-user smtp.example.com\ncontact me at admin@example.com',
        ),
      ),
    ).toBe('[redacted] [redacted] contact me at [email]');
  });
});
