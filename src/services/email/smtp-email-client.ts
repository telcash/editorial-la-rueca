import 'server-only';

import nodemailer from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';

import { getSmtpEmailConfig, type SmtpEmailConfig } from './smtp-email-config';

export interface EmailMessage {
  from: string;
  to: string;
  replyTo?: string;
  subject: string;
  html: string;
  text: string;
}

export interface EmailClient {
  send(message: EmailMessage): Promise<void>;
}

export class SmtpEmailDeliveryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SmtpEmailDeliveryError';
  }
}

function createTransportOptions(config: SmtpEmailConfig): SMTPTransport.Options {
  return {
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.password,
    },
    connectionTimeout: config.connectionTimeoutMs,
    greetingTimeout: config.greetingTimeoutMs,
    socketTimeout: config.socketTimeoutMs,
  };
}

export function createSmtpEmailClient(config: SmtpEmailConfig = getSmtpEmailConfig()): EmailClient {
  return {
    async send(message) {
      const transporter = nodemailer.createTransport(createTransportOptions(config));

      try {
        await transporter.sendMail(message);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'SMTP delivery failed.';

        throw new SmtpEmailDeliveryError(message);
      } finally {
        transporter.close();
      }
    },
  };
}
