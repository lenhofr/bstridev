export const LS_ACTIVE_EVENT_ID_KEY = 'bstri:scoring:activeEventId';

export function parseYearFromEventId(eventId: string): number | null {
  const m = /^triathlon-(\d{4})$/.exec(eventId.trim());
  if (!m) return null;
  const y = Number(m[1]);
  return Number.isFinite(y) ? y : null;
}

export function getLocalActiveEventId(): string | null {
  try {
    const v = localStorage.getItem(LS_ACTIVE_EVENT_ID_KEY);
    return v && v.trim() ? v : null;
  } catch {
    return null;
  }
}

export function setLocalActiveEventId(eventId: string | null) {
  try {
    const v = eventId?.trim() ?? '';
    if (!v) localStorage.removeItem(LS_ACTIVE_EVENT_ID_KEY);
    else localStorage.setItem(LS_ACTIVE_EVENT_ID_KEY, v);
  } catch {
    // ignore
  }
}
