import { z } from 'zod';

import { createAndNotifyContactRequest } from '@/services/contact-requests/create-and-notify-contact-request';
import { fetchMetaLead, MetaGraphApiError } from '@/integrations/meta/meta-lead-graph-client';
import { normalizeMetaLead } from '@/integrations/meta/meta-lead-normalizer';
import {
  verifyMetaWebhookChallenge,
  verifyMetaWebhookSignature,
} from '@/integrations/meta/meta-webhook-security';

export const runtime = 'nodejs';

const MAX_WEBHOOK_BODY_BYTES = 1_000_000;

const webhookEnvelopeSchema = z.object({
  object: z.string().min(1),
  entry: z.array(
    z.object({
      changes: z
        .array(
          z.object({
            field: z.string(),
            value: z.unknown(),
          }),
        )
        .default([]),
    }),
  ),
});

const idSchema = z
  .union([z.string().min(1).max(128), z.number().int().positive()])
  .transform(String);

const leadChangeValueSchema = z.object({
  leadgen_id: idSchema,
  form_id: idSchema.optional(),
});

function textResponse(body: string, status: number): Response {
  return new Response(body, {
    status,
    headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' },
  });
}

async function readLimitedBody(request: Request): Promise<Buffer | null> {
  if (!request.body) {
    return Buffer.alloc(0);
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      size += value.byteLength;
      if (size > MAX_WEBHOOK_BODY_BYTES) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
  } catch {
    throw new Error('Webhook body could not be read.');
  }

  return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)));
}

export async function GET(request: Request): Promise<Response> {
  const expectedToken = process.env.META_WEBHOOK_VERIFY_TOKEN?.trim();
  if (!expectedToken) {
    return textResponse('Webhook verification is not configured.', 503);
  }

  const params = new URL(request.url).searchParams;
  const mode = params.get('hub.mode');
  const token = params.get('hub.verify_token');
  const challenge = params.get('hub.challenge');

  if (!verifyMetaWebhookChallenge(mode, token, expectedToken, challenge)) {
    return textResponse('Forbidden.', 403);
  }

  return textResponse(challenge, 200);
}

export async function POST(request: Request): Promise<Response> {
  const appSecret = process.env.META_APP_SECRET?.trim();
  if (!appSecret) {
    return textResponse('Webhook is not configured.', 503);
  }

  const declaredLength = Number(request.headers.get('content-length') ?? 0);
  if (declaredLength > MAX_WEBHOOK_BODY_BYTES) {
    return textResponse('Payload too large.', 413);
  }

  let rawBody: Buffer | null;
  try {
    rawBody = await readLimitedBody(request);
  } catch {
    return textResponse('Invalid request body.', 400);
  }

  if (rawBody === null) {
    return textResponse('Payload too large.', 413);
  }
  if (rawBody.byteLength === 0) {
    return textResponse('Invalid request body.', 400);
  }

  if (!verifyMetaWebhookSignature(rawBody, request.headers.get('x-hub-signature-256'), appSecret)) {
    return textResponse('Invalid signature.', 401);
  }

  let json: unknown;
  try {
    json = JSON.parse(rawBody.toString('utf8'));
  } catch {
    return textResponse('Invalid JSON.', 400);
  }

  const envelope = webhookEnvelopeSchema.safeParse(json);
  if (!envelope.success) {
    return textResponse('Invalid webhook payload.', 400);
  }

  if (envelope.data.object !== 'page') {
    return textResponse('EVENT_RECEIVED', 200);
  }

  const leadEvents: Array<{ leadId: string; formId: string | null }> = [];
  for (const entry of envelope.data.entry) {
    for (const change of entry.changes) {
      if (change.field !== 'leadgen') {
        continue;
      }

      const value = leadChangeValueSchema.safeParse(change.value);
      if (!value.success) {
        return textResponse('Invalid leadgen event.', 400);
      }

      leadEvents.push({
        leadId: value.data.leadgen_id,
        formId: value.data.form_id ?? null,
      });
    }
  }

  const processedIds = new Set<string>();
  let hadUnprocessableLead = false;
  let hadTransientFailure = false;
  for (const event of leadEvents) {
    if (processedIds.has(event.leadId)) {
      continue;
    }
    processedIds.add(event.leadId);

    try {
      const lead = await fetchMetaLead(event.leadId);
      if (lead.id !== event.leadId) {
        throw new Error('Meta lead identifier mismatch.');
      }

      const normalized = normalizeMetaLead(lead, event.formId);
      if (normalized.status === 'unprocessable') {
        console.error('[MetaLeadWebhook] Lead cannot be normalized', {
          leadId: event.leadId,
          formId: lead.form_id ?? event.formId,
          reason: normalized.reason,
        });
        hadUnprocessableLead = true;
        continue;
      }

      const result = await createAndNotifyContactRequest(normalized.input);
      console.info('[MetaLeadWebhook] Lead processed', {
        leadId: event.leadId,
        formId: lead.form_id ?? event.formId,
        result: result.status === 'created' ? 'CREATED' : 'DUPLICATE',
      });
    } catch (error) {
      console.error('[MetaLeadWebhook] Lead processing failed', {
        leadId: event.leadId,
        formId: event.formId,
        error:
          error instanceof MetaGraphApiError
            ? `graph_${error.status ?? 'network'}`
            : 'processing_error',
      });
      hadTransientFailure = true;
    }
  }

  if (hadTransientFailure) {
    return textResponse('Lead processing temporarily failed.', 503);
  }
  if (hadUnprocessableLead) {
    return textResponse('One or more leads could not be processed.', 422);
  }

  return textResponse('EVENT_RECEIVED', 200);
}
