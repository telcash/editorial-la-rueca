import 'server-only';

export interface SmtpEmailConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  notificationFrom: string;
  notificationTo: string;
  connectionTimeoutMs: number;
  greetingTimeoutMs: number;
  socketTimeoutMs: number;
}

export class SmtpEmailConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SmtpEmailConfigurationError';
  }
}

type SmtpEnv = Partial<Record<string, string | undefined>>;

type SmtpEnvKey =
  | 'SMTP_HOST'
  | 'SMTP_PORT'
  | 'SMTP_SECURE'
  | 'SMTP_USER'
  | 'SMTP_PASSWORD'
  | 'CONTACT_NOTIFICATION_FROM'
  | 'CONTACT_NOTIFICATION_TO';

function parseRequiredString(env: SmtpEnv, key: SmtpEnvKey): string {
  const value = env[key]?.trim();

  if (!value) {
    throw new SmtpEmailConfigurationError(`Missing SMTP configuration: ${key}.`);
  }

  return value;
}

function parsePort(value: string): number {
  const port = Number(value);

  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new SmtpEmailConfigurationError('Invalid SMTP configuration: SMTP_PORT.');
  }

  return port;
}

function parseSecure(value: string): boolean {
  if (value === 'true') {
    return true;
  }

  if (value === 'false') {
    return false;
  }

  throw new SmtpEmailConfigurationError('Invalid SMTP configuration: SMTP_SECURE.');
}

export function getSmtpEmailConfig(env: SmtpEnv = process.env): SmtpEmailConfig {
  const host = parseRequiredString(env, 'SMTP_HOST');
  const port = parsePort(parseRequiredString(env, 'SMTP_PORT'));
  const secure = parseSecure(parseRequiredString(env, 'SMTP_SECURE'));
  const user = parseRequiredString(env, 'SMTP_USER');
  const password = parseRequiredString(env, 'SMTP_PASSWORD');
  const notificationFrom = parseRequiredString(env, 'CONTACT_NOTIFICATION_FROM');
  const notificationTo = parseRequiredString(env, 'CONTACT_NOTIFICATION_TO');

  return {
    host,
    port,
    secure,
    user,
    password,
    notificationFrom,
    notificationTo,
    connectionTimeoutMs: 10_000,
    greetingTimeoutMs: 10_000,
    socketTimeoutMs: 15_000,
  };
}
