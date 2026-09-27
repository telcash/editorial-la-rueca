import 'server-only';

import { z } from 'zod';

import type { MetaLeadData } from './meta-lead-normalizer';

const metaLeadResponseSchema = z.object({
  id: z.string().min(1).max(128),
  form_id: z.string().min(1).max(128).optional(),
  field_data: z
    .array(
      z.object({
        name: z.string().min(1).max(500),
        values: z.array(z.string().max(10_000)).max(100).default([]),
      }),
    )
    .max(100),
});

export class MetaGraphApiError extends Error {
  constructor(readonly status: number | null) {
    super('Meta Graph API request failed.');
    this.name = 'MetaGraphApiError';
  }
}

function getMetaGraphConfig() {
  const accessToken = process.env.META_LEAD_ACCESS_TOKEN?.trim();
  const version = process.env.META_GRAPH_API_VERSION?.trim();

  if (!accessToken || !version || !/^v\d+\.\d+$/.test(version)) {
    throw new Error('Meta Graph API configuration is unavailable.');
  }

  return { accessToken, version };
}

export async function fetchMetaLead(leadId: string): Promise<MetaLeadData> {
  const { accessToken, version } = getMetaGraphConfig();
  const url = new URL(`https://graph.facebook.com/${version}/${encodeURIComponent(leadId)}`);
  url.searchParams.set('fields', 'id,form_id,field_data');

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new MetaGraphApiError(null);
  }

  if (!response.ok) {
    throw new MetaGraphApiError(response.status);
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new MetaGraphApiError(response.status);
  }

  const parsed = metaLeadResponseSchema.safeParse(body);
  if (!parsed.success) {
    throw new MetaGraphApiError(response.status);
  }

  return parsed.data;
}
