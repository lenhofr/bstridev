import type { ScoringDocumentV1 } from './scoring-model';

export type ScoringDocSummary = {
  eventId: string;
  year: number;
  kind: 'draft' | 'published';
  updatedAt: string | null;
};

export type ActiveTriathlonConfig = {
  activeEventId: string | null;
};

export async function apiGetPublished(params: { apiBaseUrl: string; eventId: string }): Promise<ScoringDocumentV1> {
  const res = await fetch(`${params.apiBaseUrl}/events/${encodeURIComponent(params.eventId)}/scoring/published`);
  if (!res.ok) throw new Error(`Failed to load published doc (${res.status})`);
  return (await res.json()) as ScoringDocumentV1;
}

export async function apiGetDraft(params: {
  apiBaseUrl: string;
  eventId: string;
  accessToken: string;
}): Promise<ScoringDocumentV1> {
  const res = await fetch(`${params.apiBaseUrl}/events/${encodeURIComponent(params.eventId)}/scoring/draft`, {
    headers: { authorization: `Bearer ${params.accessToken}` }
  });
  if (!res.ok) throw new Error(`Failed to load draft doc (${res.status})`);
  return (await res.json()) as ScoringDocumentV1;
}

export async function apiPutDraft(params: {
  apiBaseUrl: string;
  eventId: string;
  accessToken: string;
  doc: ScoringDocumentV1;
}): Promise<{ ok: true; updatedAt: string }> {
  const res = await fetch(`${params.apiBaseUrl}/events/${encodeURIComponent(params.eventId)}/scoring/draft`, {
    method: 'PUT',
    headers: {
      authorization: `Bearer ${params.accessToken}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify(params.doc)
  });
  if (!res.ok) throw new Error(`Failed to save draft doc (${res.status})`);
  return (await res.json()) as { ok: true; updatedAt: string };
}

export async function apiPublish(params: {
  apiBaseUrl: string;
  eventId: string;
  accessToken: string;
}): Promise<{ ok: true; publishedAt: string }> {
  const res = await fetch(`${params.apiBaseUrl}/events/${encodeURIComponent(params.eventId)}/publish`, {
    method: 'POST',
    headers: { authorization: `Bearer ${params.accessToken}` }
  });
  if (!res.ok) throw new Error(`Failed to publish (${res.status})`);
  return (await res.json()) as { ok: true; publishedAt: string };
}

export async function apiListDocs(params: {
  apiBaseUrl: string;
  accessToken: string;
  year?: number | null;
}): Promise<ScoringDocSummary[]> {
  const qs = params.year != null ? `?year=${encodeURIComponent(String(params.year))}` : '';
  const res = await fetch(`${params.apiBaseUrl}/scoring/docs${qs}`, {
    headers: { authorization: `Bearer ${params.accessToken}` }
  });
  if (!res.ok) throw new Error(`Failed to list docs (${res.status})`);
  return (await res.json()) as ScoringDocSummary[];
}

export async function apiGetActiveTriathlon(params: { apiBaseUrl: string }): Promise<ActiveTriathlonConfig> {
  const res = await fetch(`${params.apiBaseUrl}/scoring/active`);
  if (!res.ok) throw new Error(`Failed to load active triathlon (${res.status})`);
  return (await res.json()) as ActiveTriathlonConfig;
}

export async function apiPutActiveTriathlon(params: {
  apiBaseUrl: string;
  accessToken: string;
  activeEventId: string | null;
}): Promise<{ ok: true }> {
  const res = await fetch(`${params.apiBaseUrl}/scoring/active`, {
    method: 'PUT',
    headers: {
      authorization: `Bearer ${params.accessToken}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify({ activeEventId: params.activeEventId })
  });
  if (!res.ok) throw new Error(`Failed to set active triathlon (${res.status})`);
  return (await res.json()) as { ok: true };
}
