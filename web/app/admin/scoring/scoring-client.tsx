'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { getAccessToken } from '../../../lib/cognito-auth';
import { hasBackendConfig, runtimeConfig } from '../../../lib/runtime-config';
import { apiGetDraft, apiGetPublished, apiListDocs } from '../../../lib/scoring-api';
import { listLocalStorageTriathlonDocs, type TriathlonDocSummary } from '../../../lib/triathlon-docs';

import { useScoring } from './scoring-context';

export default function AdminScoringClient() {
  const {
    eventId,
    year,
    doc,
    draftKey,
    publishedKey,
    setEventId,
    setYear,
    onNewDocFor,
    importDoc,
    addParticipant,
    updateParticipantDisplayName,
    deleteParticipant,
    setEventMeta,
    setPoolMatches,
    setFlash
  } = useScoring();

  const [newPersonId, setNewPersonId] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');

  const [availableDocs, setAvailableDocs] = useState<TriathlonDocSummary[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [docsYearFilter, setDocsYearFilter] = useState<number | null>(year);
  const [selectedDocKey, setSelectedDocKey] = useState<string>('');
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [dialogTab, setDialogTab] = useState<'open' | 'create'>('open');
  const [docSearch, setDocSearch] = useState('');
  const [createEventId, setCreateEventId] = useState(eventId);
  const [createYear, setCreateYear] = useState(year);

  const filteredDocs = useMemo(() => {
    const q = docSearch.trim().toLowerCase();
    if (!q) return availableDocs;
    return availableDocs.filter((d) => d.eventId.toLowerCase().includes(q));
  }, [availableDocs, docSearch]);

  const selectedDoc = useMemo(() => filteredDocs.find((d) => `${d.kind}:${d.eventId}` === selectedDocKey), [filteredDocs, selectedDocKey]);

  function openTriathlonDialog(nextTab: 'open' | 'create' = 'open') {
    setDialogTab(nextTab);
    setDocSearch('');
    setCreateEventId(eventId);
    setCreateYear(year);
    setDocsYearFilter(year);
    void refreshDocs(year);
    dialogRef.current?.showModal();
  }

  function closeTriathlonDialog() {
    dialogRef.current?.close();
  }

  async function onOpenSelectedFromDialog() {
    if (!selectedDoc) return;
    if (!confirm('Switching triathlons will replace your current in-memory draft. Save first if needed. Continue?')) return;
    try {
      setDocsYearFilter(selectedDoc.year);
      await onOpenDoc(selectedDoc);
      setSelectedDocKey('');
      closeTriathlonDialog();
    } catch (e) {
      setFlashMsg((e as Error)?.message ?? String(e), 'error');
    }
  }

  function onCreateNewFromDialog() {
    const nextEventId = createEventId.trim();
    if (!nextEventId) {
      setFlashMsg('Triathlon name is required', 'error');
      return;
    }
    if (!createYear || Number.isNaN(createYear)) {
      setFlashMsg('Year is required', 'error');
      return;
    }
    if (!confirm('Create a new triathlon draft? This will replace your current in-memory draft.')) return;
    onNewDocFor({ eventId: nextEventId, year: createYear });
    setDocsYearFilter(createYear);
    setSelectedDocKey('');
    setFlashMsg('Created new draft', 'success');
    closeTriathlonDialog();
  }


  const backend = useMemo(() => hasBackendConfig(), []);

  const participants = doc.participants;

  async function refreshDocs(nextYear: number | null = docsYearFilter) {
    setDocsLoading(true);
    try {
      if (backend) {
        const accessToken = getAccessToken();
        if (!accessToken) throw new Error('Not logged in (Cognito)');
        if (!runtimeConfig.scoringApiBaseUrl) throw new Error('Missing scoringApiBaseUrl');

        const res = await apiListDocs({ apiBaseUrl: runtimeConfig.scoringApiBaseUrl, accessToken, year: nextYear });
        setAvailableDocs(res);
      } else {
        setAvailableDocs(listLocalStorageTriathlonDocs({ year: nextYear }));
      }
    } catch (e) {
      setFlashMsg((e as Error)?.message ?? String(e), 'error');
    } finally {
      setDocsLoading(false);
    }
  }

  async function onOpenDoc(selected: TriathlonDocSummary) {
    if (!selected) return;

    try {
      const now = new Date().toISOString();

      if (backend) {
        if (!runtimeConfig.scoringApiBaseUrl) throw new Error('Missing scoringApiBaseUrl');

        if (selected.kind === 'draft') {
          const accessToken = getAccessToken();
          if (!accessToken) throw new Error('Not logged in (Cognito)');
          const loaded = await apiGetDraft({
            apiBaseUrl: runtimeConfig.scoringApiBaseUrl,
            eventId: selected.eventId,
            accessToken
          });
          importDoc({
            ...loaded,
            eventId: selected.eventId,
            year: loaded.year,
            status: 'draft',
            updatedAt: now,
            updatedBy: null,
            publishedAt: null,
            publishedBy: null
          });
          setFlashMsg('Loaded draft', 'success');
          return;
        }

        const loaded = await apiGetPublished({ apiBaseUrl: runtimeConfig.scoringApiBaseUrl, eventId: selected.eventId });
        importDoc({
          ...loaded,
          eventId: selected.eventId,
          year: loaded.year,
          status: 'draft',
          updatedAt: now,
          updatedBy: null,
          publishedAt: null,
          publishedBy: null
        });
        setFlashMsg('Loaded published → draft', 'success');
        return;
      }

      const key = `bstri:scoring:${selected.kind}:${selected.eventId}`;
      const raw = localStorage.getItem(key);
      if (!raw) throw new Error('No doc found in localStorage.');
      const loaded = JSON.parse(raw) as typeof doc;
      importDoc({
        ...loaded,
        eventId: selected.eventId,
        year: loaded.year,
        status: 'draft',
        updatedAt: now,
        updatedBy: null,
        publishedAt: null,
        publishedBy: null
      });
      setFlashMsg(selected.kind === 'draft' ? 'Loaded draft' : 'Loaded published → draft', 'success');
    } catch (e) {
      setFlashMsg((e as Error)?.message ?? String(e), 'error');
    }
  }


  useEffect(() => {
    refreshDocs(docsYearFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backend, docsYearFilter]);

  const baseOrder = doc.eventMeta?.competitorOrder?.length ? doc.eventMeta.competitorOrder : participants.map((p) => p.personId);
  const competitorOrder = [...baseOrder, ...participants.map((p) => p.personId).filter((pid) => !baseOrder.includes(pid))];

  const participantsById = new Map(participants.map((p) => [p.personId, p] as const));
  const orderedParticipants = competitorOrder.map((pid) => participantsById.get(pid)).filter(Boolean);

  function ensureMetaBase() {
    return (
      doc.eventMeta ?? {
        competitorOrder: participants.map((p) => p.personId),
        poolTables: [1, 2],
        poolSchedule: { rounds: [] }
      }
    );
  }

  function hasPoolData() {
    return (doc.eventMeta?.poolSchedule?.rounds?.length ?? 0) > 0 || doc.poolMatches.length > 0;
  }

  function setFlashMsg(msg: string, tone: 'success' | 'error' | 'info' = 'info') {
    setFlash({ message: msg, tone, at: Date.now() });
  }

  function onResetPoolSchedule() {
    if (!hasPoolData()) return;
    if (!confirm('Reset pool schedule and clear ALL pool match results?')) return;
    const base = ensureMetaBase();
    setPoolMatches([]);
    setEventMeta({ ...base, poolSchedule: { rounds: [] } });
    setFlashMsg('Reset pool schedule/matches', 'success');
  }

  function setOrder(nextOrder: string[]) {
    if (hasPoolData() && !confirm('Changing competitor order will clear the pool schedule and ALL pool match results. Continue?')) return;
    const base = ensureMetaBase();
    setPoolMatches([]);
    setEventMeta({ ...base, competitorOrder: nextOrder, poolSchedule: { rounds: [] } });
    setFlashMsg('Updated competitor order', 'success');
  }

  function moveInOrder(personId: string, dir: -1 | 1) {
    const i = competitorOrder.indexOf(personId);
    if (i < 0) return;
    const j = i + dir;
    if (j < 0 || j >= competitorOrder.length) return;
    const next = [...competitorOrder];
    [next[i], next[j]] = [next[j], next[i]];
    setOrder(next);
  }

  function onAddCompetitor() {
    const personId = newPersonId.trim();
    const displayName = newDisplayName.trim() || personId;
    if (!personId) return;
    const existing = participants.find((p) => p.personId.toLowerCase() === personId.toLowerCase());
    if (existing) {
      setFlashMsg(`Competitor already exists: ${existing.personId}`, 'error');
      return;
    }

    if (hasPoolData() && !confirm('Adding a competitor will clear the pool schedule and ALL pool match results. Continue?')) return;

    addParticipant({ personId, displayName });
    setNewPersonId('');
    setNewDisplayName('');
  }

  async function onLoadFixture(url: string, label: string) {
    const res = await fetch(url);
    if (!res.ok) return;
    const raw = (await res.json()) as typeof doc;
    const now = new Date().toISOString();
    importDoc({
      ...raw,
      eventId,
      year,
      status: 'draft',
      updatedAt: now,
      updatedBy: null,
      publishedAt: null,
      publishedBy: null
    });
    setFlashMsg(`Loaded fixture: ${label}`, 'success');
  }

  return (
    <div>
      <h2>Setup</h2>

      <div className="card" style={{ display: 'grid', gap: 10 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ fontSize: 12, opacity: 0.85 }}>Triathlon</div>
          <div>
            <code>{eventId}</code> <span style={{ opacity: 0.7 }}>({year})</span>
          </div>
          <button style={{ marginLeft: 'auto' }} onClick={() => openTriathlonDialog('open')}>
            Select / Create…
          </button>
        </div>
        <div style={{ fontSize: 12, opacity: 0.85 }}>Select an existing triathlon (draft/published) or create a new draft.</div>
      </div>

      <dialog ref={dialogRef} className="bstDialog">
        <div className="bstDialogHeader">
          <b>Select triathlon</b>
          <button style={{ marginLeft: 'auto' }} onClick={closeTriathlonDialog}>
            Close
          </button>
        </div>

        <div className="bstDialogBody">
          <div className="tabs">
            <button
              onClick={() => setDialogTab('open')}
              className="tab"
              data-active={dialogTab === 'open'}
            >
              Open existing
            </button>
            <button
              onClick={() => setDialogTab('create')}
              className="tab"
              data-active={dialogTab === 'create'}
            >
              Create new
            </button>
          </div>

          {dialogTab === 'open' ? (
            <div style={{ display: 'grid', gap: 10 }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  Year
                  <input
                    type="number"
                    value={docsYearFilter ?? ''}
                    onChange={(e) => setDocsYearFilter(e.target.value ? Number(e.target.value) : null)}
                    style={{ width: 90 }}
                  />
                </label>
                <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  Search
                  <input value={docSearch} onChange={(e) => setDocSearch(e.target.value)} placeholder="eventId contains…" />
                </label>
                <button disabled={docsLoading} onClick={() => refreshDocs(docsYearFilter)}>
                  {docsLoading ? 'Loading…' : 'Refresh'}
                </button>
                <div style={{ fontSize: 12, opacity: 0.85 }}>Found: {filteredDocs.length}</div>
              </div>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <select value={selectedDocKey} onChange={(e) => setSelectedDocKey(e.target.value)} style={{ minWidth: 360, maxWidth: '100%' }}>
                  <option value="">— Select —</option>
                  {filteredDocs.map((d) => (
                    <option key={`${d.kind}:${d.eventId}`} value={`${d.kind}:${d.eventId}`}>
                      {d.eventId} ({d.year}) • {d.kind} • {d.updatedAt ?? '-'}
                    </option>
                  ))}
                </select>
                <button disabled={!selectedDoc} onClick={() => void onOpenSelectedFromDialog()}>
                  Open
                </button>
              </div>

              <div style={{ fontSize: 12, opacity: 0.85 }}>Opening a published doc loads it into a new draft.</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
              <div className="card" style={{ display: 'grid', gap: 8 }}>
                <label>
                  Triathlon Name
                  <input value={createEventId} onChange={(e) => setCreateEventId(e.target.value)} style={{ marginLeft: 8 }} />
                </label>
                <label>
                  Year
                  <input
                    type="number"
                    value={createYear}
                    onChange={(e) => setCreateYear(Number(e.target.value))}
                    style={{ marginLeft: 8, width: 110 }}
                  />
                </label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  <button onClick={onCreateNewFromDialog}>Create draft</button>
                </div>
              </div>
              <div style={{ fontSize: 12, opacity: 0.85 }}>Tip: you can save/publish from the actions bar after creating.</div>
            </div>
          )}
        </div>
      </dialog>

      <h3 style={{ marginTop: 18 }}>Competitors</h3>
      <p className="kicker" style={{ marginTop: 6 }}>
        Enter a stable <code>personId</code> (used in the scoring document) and an optional display name.
      </p>

      <div className="card" style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <input placeholder="personId (e.g. rob)" value={newPersonId} onChange={(e) => setNewPersonId(e.target.value)} />
        <input
          placeholder="displayName (optional)"
          value={newDisplayName}
          onChange={(e) => setNewDisplayName(e.target.value)}
        />
        <button onClick={onAddCompetitor}>Add</button>
        <button onClick={onResetPoolSchedule} disabled={!hasPoolData()}>
          Reset pool
        </button>
        <div style={{ marginLeft: 'auto', fontSize: 12, opacity: 0.85 }}>Count: {participants.length}</div>
      </div>

      {participants.length > 0 && (
        <div className="card" style={{ marginTop: 10 }}>
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 60 }}>#</th>
                <th>personId</th>
                <th>displayName</th>
                <th style={{ width: 140 }}>Order</th>
                <th style={{ width: 110 }} />
              </tr>
            </thead>
            <tbody>
              {orderedParticipants.map((p, idx) => (
                <tr key={p.personId}>
                  <td>{idx + 1}</td>
                  <td>
                    <code>{p.personId}</code>
                  </td>
                  <td>
                    <input
                      value={p.displayName}
                      onChange={(e) => updateParticipantDisplayName(p.personId, e.target.value)}
                    />
                  </td>
                  <td>
                    <button onClick={() => moveInOrder(p.personId, -1)} disabled={idx === 0}>
                      Up
                    </button>{' '}
                    <button onClick={() => moveInOrder(p.personId, 1)} disabled={idx === competitorOrder.length - 1}>
                      Down
                    </button>
                  </td>
                  <td>
                    <button
                      onClick={() => {
                        if (
                          confirm(
                            `Delete competitor ${p.displayName} (${p.personId})? This will clear the pool schedule and ALL pool match results.`
                          )
                        ) {
                          deleteParticipant(p.personId);
                          setFlashMsg('Deleted competitor', 'success');
                        }
                      }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h3 style={{ marginTop: 18 }}>Totals Preview</h3>
      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Competitor</th>
              <th style={{ width: 90 }}>Bowling</th>
              <th style={{ width: 90 }}>Pool</th>
              <th style={{ width: 90 }}>Darts</th>
              <th style={{ width: 110 }}>Triathlon</th>
            </tr>
          </thead>
          <tbody>
            {orderedParticipants.map((p) => {
              const t = doc.totals.byPerson[p.personId];
              return (
                <tr key={p.personId}>
                  <td>{p.displayName}</td>
                  <td>{t?.bySubEvent.bowling ?? 0}</td>
                  <td>{t?.bySubEvent.pool ?? 0}</td>
                  <td>{t?.bySubEvent.darts ?? 0}</td>
                  <td>{t?.triathlon ?? 0}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <details style={{ marginTop: 18 }}>
        <summary>Advanced</summary>
        <div style={{ marginTop: 8, display: 'grid', gap: 12 }}>
          <div className="card" style={{ fontSize: 12, opacity: 0.9 }}>
            <div>
              Draft key: <code>{draftKey}</code>
            </div>
            <div>
              Published key: <code>{publishedKey}</code>
            </div>
          </div>

          <details>
            <summary>Fixtures (load sample TRI docs)</summary>
            <div className="card" style={{ marginTop: 8, display: 'grid', gap: 8 }}>
              <div style={{ fontSize: 12, opacity: 0.85 }}>
                Loads a sample scoring document (participants + scenarios). This overwrites the current draft.
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button onClick={() => void onLoadFixture('/fixtures/scoring/even-6-blank.json', 'Even (6) blank')}>Even (6) blank</button>
                <button onClick={() => void onLoadFixture('/fixtures/scoring/odd-5-blank.json', 'Odd (5) blank')}>Odd (5) blank</button>
                <button onClick={() => void onLoadFixture('/fixtures/scoring/pool-h2h-incomplete.json', 'Pool H2H incomplete')}>Pool H2H incomplete</button>
                <button onClick={() => void onLoadFixture('/fixtures/scoring/pool-h2h-resolves.json', 'Pool H2H resolves')}>Pool H2H resolves</button>
                <button onClick={() => void onLoadFixture('/fixtures/scoring/pool-run-tiebreaker-only.json', 'Pool Run tiebreaker')}>Pool Run tiebreaker</button>
                <button onClick={() => void onLoadFixture('/fixtures/scoring/duplicate-places.json', 'Duplicate places')}>Duplicate places</button>
              </div>
            </div>
          </details>

          <details>
            <summary>Raw JSON (current doc)</summary>
            <div className="card" style={{ overflowX: 'auto', marginTop: 8 }}>
              <pre suppressHydrationWarning style={{ margin: 0, fontSize: 12 }}>
                {JSON.stringify(doc, null, 2)}
              </pre>
            </div>
          </details>
        </div>
      </details>
    </div>
  );
}
