import type { ScoringDocumentV1 } from './scoring-model';

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
