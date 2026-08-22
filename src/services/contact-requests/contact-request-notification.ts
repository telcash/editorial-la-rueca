import 'server-only';

import type { ContactRequestAdminDetail } from './contact-request.types';
import { getSmtpEmailConfig, type SmtpEmailConfig } from '@/services/email/smtp-email-config';
import {
  createSmtpEmailClient,
  type EmailClient,
  type EmailMessage,
} from '@/services/email/smtp-email-client';

export interface ContactRequestNotificationResult {
  status: 'sent' | 'skipped';
  sentAt: Date | null;
}

interface ContactRequestNotificationOptions {
  force?: boolean;
}

const ERROR_MESSAGE_MAX_LENGTH = 500;

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function normalizePlainText(value: string): string {
  return value.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
}

function sanitizeHeaderValue(value: string): string {
  return value.replace(/[\r\n]+/g, ' ').trim();
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('es-ES', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Europe/Madrid',
  }).format(date);
}

function getFromHeader(config: SmtpEmailConfig): string {
  return `Editorial La Rueca <${sanitizeHeaderValue(config.notificationFrom)}>`;
}

export function buildContactRequestNotificationEmail(
  contactRequest: ContactRequestAdminDetail,
  config: SmtpEmailConfig = getSmtpEmailConfig(),
): EmailMessage {
  const serviceName = sanitizeHeaderValue(contactRequest.service.name);
  const subject = `Nueva solicitud web — ${serviceName}`;
  const formattedDate = formatDate(contactRequest.createdAt);
  const message = normalizePlainText(contactRequest.message);

  const rows = [
    ['Servicio', contactRequest.service.name],
    ['Nombre', contactRequest.name],
    ['Correo', contactRequest.email],
    ['Teléfono', contactRequest.phone],
    ['Provincia', contactRequest.province],
    ['Fecha', formattedDate],
    ['Origen', 'Website'],
  ] as const;

  const htmlRows = rows
    .map(
      ([label, value]) => `
        <tr>
          <th style="padding:10px 12px;text-align:left;width:140px;color:#555;font-size:13px;border-bottom:1px solid #eee;">${escapeHtml(label)}</th>
          <td style="padding:10px 12px;color:#111;font-size:14px;border-bottom:1px solid #eee;">${escapeHtml(value)}</td>
        </tr>`,
    )
    .join('');

  const html = `<!doctype html>
<html lang="es">
  <body style="margin:0;background:#ffffff;color:#111;font-family:Arial,Helvetica,sans-serif;">
    <div style="max-width:640px;margin:0 auto;padding:24px;">
      <p style="margin:0 0 14px;color:#E02B20;font-size:13px;font-weight:700;letter-spacing:.04em;">EDITORIAL LA RUECA</p>
      <h1 style="margin:0 0 20px;font-size:22px;line-height:1.25;color:#111;">Nueva solicitud web</h1>
      <table role="presentation" style="width:100%;border-collapse:collapse;border:1px solid #eee;border-radius:8px;overflow:hidden;">
        <tbody>${htmlRows}</tbody>
      </table>
      <h2 style="margin:24px 0 10px;font-size:16px;color:#111;">Mensaje</h2>
      <div style="white-space:pre-wrap;border:1px solid #eee;border-radius:8px;padding:14px;color:#111;font-size:14px;line-height:1.55;">${escapeHtml(message)}</div>
    </div>
  </body>
</html>`;

  const text = `NUEVA SOLICITUD WEB

Servicio:
${contactRequest.service.name}

Nombre:
${contactRequest.name}

Correo:
${contactRequest.email}

Teléfono:
${contactRequest.phone}

Provincia:
${contactRequest.province}

Mensaje:
${message}

Fecha:
${formattedDate}

Origen:
Website`;

  return {
    from: getFromHeader(config),
    to: sanitizeHeaderValue(config.notificationTo),
    replyTo: contactRequest.email,
    subject,
    html,
    text,
  };
}

export function getContactRequestNotificationErrorMessage(error: unknown): string {
  const rawMessage = error instanceof Error ? error.message : 'Contact request email failed.';
  const normalizedMessage = normalizePlainText(rawMessage)
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email]')
    .replace(/\s+/g, ' ');

  return normalizedMessage.slice(0, ERROR_MESSAGE_MAX_LENGTH);
}

export async function sendContactRequestNotification(
  contactRequest: ContactRequestAdminDetail,
  emailClient: EmailClient = createSmtpEmailClient(),
  config: SmtpEmailConfig = getSmtpEmailConfig(),
  options: ContactRequestNotificationOptions = {},
): Promise<ContactRequestNotificationResult> {
  if (contactRequest.emailSentAt && !options.force) {
    return {
      status: 'skipped',
      sentAt: contactRequest.emailSentAt,
    };
  }

  await emailClient.send(buildContactRequestNotificationEmail(contactRequest, config));

  return {
    status: 'sent',
    sentAt: new Date(),
  };
}
