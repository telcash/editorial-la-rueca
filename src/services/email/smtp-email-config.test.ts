import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { getSmtpEmailConfig, SmtpEmailConfigurationError } from './smtp-email-config';

const validEnv = {
  SMTP_HOST: 'smtp.example.com',
  SMTP_PORT: '465',
  SMTP_SECURE: 'true',
  SMTP_USER: 'smtp-user',
  SMTP_PASSWORD: 'smtp-password',
  CONTACT_NOTIFICATION_FROM: 'info@editoriallarueca.com',
  CONTACT_NOTIFICATION_TO: 'info@editoriallarueca.com',
};

describe('getSmtpEmailConfig', () => {
  it('parses SiteGround-compatible SMTP settings from env', () => {
    expect(getSmtpEmailConfig(validEnv)).toMatchObject({
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
    });
  });

  it('supports STARTTLS-style port configuration', () => {
    expect(
      getSmtpEmailConfig({
        ...validEnv,
        SMTP_PORT: '587',
        SMTP_SECURE: 'false',
      }),
    ).toMatchObject({
      port: 587,
      secure: false,
    });
  });

  it('throws a controlled error when required credentials are missing', () => {
    expect(() => getSmtpEmailConfig({ ...validEnv, SMTP_PASSWORD: '' })).toThrow(
      SmtpEmailConfigurationError,
    );
    expect(() => getSmtpEmailConfig({ ...validEnv, SMTP_PASSWORD: '' })).toThrow(
      'Missing SMTP configuration: SMTP_PASSWORD.',
    );
  });
});
