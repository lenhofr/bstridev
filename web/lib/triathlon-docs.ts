export type TriathlonDocKind = 'draft' | 'published';

export type TriathlonDocSummary = {
  eventId: string;
  year: number;
  kind: TriathlonDocKind;
  updatedAt: string | null;
};

const LS_DRAFT_PREFIX = 'bstri:scoring:draft:';
const LS_PUBLISHED_PREFIX = 'bstri:scoring:published:';

export function summarizeStoredTriathlonDoc(params: {
  key: string;
  raw: string;
}): TriathlonDocSummary | null {
  const kind: TriathlonDocKind | null = params.key.startsWith(LS_DRAFT_PREFIX)
    ? 'draft'
    : params.key.startsWith(LS_PUBLISHED_PREFIX)
      ? 'published'
      : null;
  if (!kind) return null;

  const eventId = params.key.slice(kind === 'draft' ? LS_DRAFT_PREFIX.length : LS_PUBLISHED_PREFIX.length);
  if (!eventId) return null;

  let doc: any;
  try {
    doc = JSON.parse(params.raw);
  } catch {
    return null;
  }

  const year = doc?.year;
  if (typeof year !== 'number') return null;

  const updatedAt = typeof doc?.updatedAt === 'string' ? doc.updatedAt : null;

  return { eventId, year, kind, updatedAt };
}

export function listStoredTriathlonDocs(params: {
  entries: Array<{ key: string; raw: string }>;
  year?: number | null;
}): TriathlonDocSummary[] {
  const out: TriathlonDocSummary[] = [];
  for (const e of params.entries) {
    const s = summarizeStoredTriathlonDoc(e);
    if (!s) continue;
    if (params.year != null && s.year !== params.year) continue;
    out.push(s);
  }

  out.sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    const au = a.updatedAt ?? '';
    const bu = b.updatedAt ?? '';
    if (au !== bu) return bu.localeCompare(au);
    if (a.eventId !== b.eventId) return a.eventId.localeCompare(b.eventId);
    return a.kind.localeCompare(b.kind);
  });

  return out;
}

export function listLocalStorageTriathlonDocs(params: { year?: number | null } = {}): TriathlonDocSummary[] {
  const entries: Array<{ key: string; raw: string }> = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;
    if (!key.startsWith(LS_DRAFT_PREFIX) && !key.startsWith(LS_PUBLISHED_PREFIX)) continue;
    const raw = localStorage.getItem(key);
    if (!raw) continue;
    entries.push({ key, raw });
  }

  return listStoredTriathlonDocs({ entries, year: params.year ?? null });
}
