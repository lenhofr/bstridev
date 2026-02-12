'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { apiGetActiveTriathlon, apiGetPublished } from '../../lib/scoring-api';
import { hasBackendConfig, runtimeConfig } from '../../lib/runtime-config';
import type { Game, ScoringDocumentV1, SubEvent } from '../../lib/scoring-model';
import { emptyGameResult } from '../../lib/scoring-rules';
import { getLocalActiveEventId } from '../../lib/active-triathlon';
import { listLocalStorageTriathlonDocs, type TriathlonDocSummary } from '../../lib/triathlon-docs';

const LS_PUBLISHED_PREFIX = 'bstri:scoring:published:';

function renderPlace(place: number | null) {
  if (place == null) return '-';
  return place >= 1 && place <= 5 ? <b>{place}</b> : place;
}

function loadPublishedDoc(key: string): ScoringDocumentV1 | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as ScoringDocumentV1;
  } catch {
    return null;
  }
}

type SortDir = 'asc' | 'desc';

type SortSpec = { key: string; dir: SortDir };

function nextSort(prev: SortSpec | undefined, key: string, initialDir: SortDir): SortSpec {
  if (prev?.key !== key) return { key, dir: initialDir };
  return { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' };
}

function sortMark(active: boolean, dir: SortDir) {
  if (!active) return null;
  return (
    <span aria-hidden style={{ opacity: 0.7, marginLeft: 6 }}>
      {dir === 'asc' ? '▲' : '▼'}
    </span>
  );
}

function cmpNum(a: number | null, b: number | null, dir: SortDir): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  return dir === 'asc' ? a - b : b - a;
}

function cmpStr(a: string, b: string, dir: SortDir): number {
  const res = a.localeCompare(b);
  return dir === 'asc' ? res : -res;
}

type TableKind = 'bowling' | 'pool' | 'darts' | 'run';

function GameTable(props: {
  participants: ScoringDocumentV1['participants'];
  game: Game;
  kind: TableKind;
  sort: SortSpec;
  setSort: (next: SortSpec) => void;
}) {
  const { participants, game, kind, sort, setSort } = props;

  const showAttempts = kind === 'run';
  const showRaw = kind !== 'darts';
  const rawLabel = kind === 'bowling' ? 'Pins' : kind === 'pool' ? 'Wins' : kind === 'run' ? 'BestRun' : 'Raw';

  const sorted = participants
    .map((p, idx) => ({ p, idx, r: game.results[p.personId] ?? emptyGameResult() }))
    .map((row, stableIdx) => ({ ...row, stableIdx }))
    .sort((a, b) => {
      const attemptsA = a.r.attempts ?? [0, 0, 0];
      const attemptsB = b.r.attempts ?? [0, 0, 0];

      const a1A = attemptsA[0] > 0 ? attemptsA[0] : null;
      const a1B = attemptsB[0] > 0 ? attemptsB[0] : null;
      const a2A = attemptsA[1] > 0 ? attemptsA[1] : null;
      const a2B = attemptsB[1] > 0 ? attemptsB[1] : null;
      const tbA = attemptsA[2] > 0 ? attemptsA[2] : null;
      const tbB = attemptsB[2] > 0 ? attemptsB[2] : null;

      const rawA = typeof a.r.raw === 'number' ? a.r.raw : null;
      const rawB = typeof b.r.raw === 'number' ? b.r.raw : null;
      const placeA = typeof a.r.place === 'number' ? a.r.place : null;
      const placeB = typeof b.r.place === 'number' ? b.r.place : null;
      const pointsA = typeof a.r.points === 'number' ? a.r.points : null;
      const pointsB = typeof b.r.points === 'number' ? b.r.points : null;

      if (sort.key === 'order') return cmpNum(a.idx, b.idx, sort.dir) || a.stableIdx - b.stableIdx;
      if (sort.key === 'competitor') return cmpStr(a.p.displayName, b.p.displayName, sort.dir) || a.stableIdx - b.stableIdx;
      if (sort.key === 'a1') return cmpNum(a1A, a1B, sort.dir) || a.stableIdx - b.stableIdx;
      if (sort.key === 'a2') return cmpNum(a2A, a2B, sort.dir) || a.stableIdx - b.stableIdx;
      if (sort.key === 'tb') return cmpNum(tbA, tbB, sort.dir) || a.stableIdx - b.stableIdx;
      if (sort.key === 'raw') return cmpNum(rawA, rawB, sort.dir) || a.stableIdx - b.stableIdx;
      if (sort.key === 'place') return cmpNum(placeA, placeB, sort.dir) || a.stableIdx - b.stableIdx;
      if (sort.key === 'points') return cmpNum(pointsA, pointsB, sort.dir) || a.stableIdx - b.stableIdx;
      return a.stableIdx - b.stableIdx;
    });

  return (
    <div className="card" style={{ marginTop: 10 }}>
      <h4 style={{ margin: '0 0 8px' }}>{game.label}</h4>
      <table className="table">
        <thead>
          <tr>
            <th style={{ cursor: 'pointer' }} onClick={() => setSort(nextSort(sort, 'competitor', 'asc'))}>
              Competitor{sortMark(sort.key === 'competitor', sort.dir)}
            </th>
            {showAttempts && (
              <th style={{ width: 110, cursor: 'pointer' }} onClick={() => setSort(nextSort(sort, 'a1', 'desc'))}>
                Attempt 1{sortMark(sort.key === 'a1', sort.dir)}
              </th>
            )}
            {showAttempts && (
              <th style={{ width: 110, cursor: 'pointer' }} onClick={() => setSort(nextSort(sort, 'a2', 'desc'))}>
                Attempt 2{sortMark(sort.key === 'a2', sort.dir)}
              </th>
            )}
            {showAttempts && (
              <th style={{ width: 110, cursor: 'pointer' }} onClick={() => setSort(nextSort(sort, 'tb', 'desc'))}>
                Tiebreaker{sortMark(sort.key === 'tb', sort.dir)}
              </th>
            )}
            {showRaw && (
              <th style={{ width: 110, cursor: 'pointer' }} onClick={() => setSort(nextSort(sort, 'raw', 'desc'))}>
                {rawLabel}{sortMark(sort.key === 'raw', sort.dir)}
              </th>
            )}
            <th style={{ width: 110, cursor: 'pointer' }} onClick={() => setSort(nextSort(sort, 'place', 'asc'))}>
              Place{sortMark(sort.key === 'place', sort.dir)}
            </th>
            <th style={{ width: 110, cursor: 'pointer' }} onClick={() => setSort(nextSort(sort, 'points', 'desc'))}>
              Points{sortMark(sort.key === 'points', sort.dir)}
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map(({ p, r }) => {
            const attempts = r.attempts ?? [0, 0, 0];
            return (
              <tr key={p.personId}>
                <td>{p.displayName}</td>
                {showAttempts && <td>{attempts[0] || '-'}</td>}
                {showAttempts && <td>{attempts[1] || '-'}</td>}
                {showAttempts && <td>{attempts[2] || '-'}</td>}
                {showRaw && <td>{r.raw ?? '-'}</td>}
                <td>{renderPlace(r.place)}</td>
                <td>{r.points ?? '-'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function SubEventSection(props: {
  subEvent: SubEvent;
  participants: ScoringDocumentV1['participants'];
  sortByGame: Record<string, SortSpec>;
  setSortByGame: React.Dispatch<React.SetStateAction<Record<string, SortSpec>>>;
}) {
  const { subEvent, participants, sortByGame, setSortByGame } = props;

  return (
    <section style={{ marginTop: 18 }}>
      <h3 style={{ marginBottom: 0 }}>{subEvent.label}</h3>
      {subEvent.games.map((g) => {
        const kind: TableKind =
          subEvent.subEventId === 'pool' ? (g.gameId === 'pool-3' ? 'run' : 'pool') : subEvent.subEventId;

        const sort = sortByGame[g.gameId] ?? { key: 'order', dir: 'asc' };

        return (
          <GameTable
            key={g.gameId}
            participants={participants}
            game={g}
            kind={kind}
            sort={sort}
            setSort={(next) => setSortByGame((p) => ({ ...p, [g.gameId]: next }))}
          />
        );
      })}
    </section>
  );
}

export default function PublishedScoringClient() {
  const [eventId, setEventId] = useState('');
  const publishedKey = useMemo(() => `${LS_PUBLISHED_PREFIX}${eventId}`, [eventId]);

  const [doc, setDoc] = useState<ScoringDocumentV1 | null>(null);

  const orderedParticipants = useMemo(() => {
    if (!doc) return [];
    const participants = doc.participants;
    const baseOrder = doc.eventMeta?.competitorOrder?.length ? doc.eventMeta.competitorOrder : participants.map((p) => p.personId);
    const competitorOrder = [...baseOrder, ...participants.map((p) => p.personId).filter((pid) => !baseOrder.includes(pid))];
    const participantsById = new Map(participants.map((p) => [p.personId, p] as const));
    return competitorOrder.map((pid) => participantsById.get(pid)).filter((p): p is (typeof participants)[number] => Boolean(p));
  }, [doc]);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [availableDocs, setAvailableDocs] = useState<TriathlonDocSummary[]>([]);
  const [docsYearFilter, setDocsYearFilter] = useState<number | null>(null);
  const [docSearch, setDocSearch] = useState('');
  const [selectedDocKey, setSelectedDocKey] = useState('');

  const filteredDocs = useMemo(() => {
    const q = docSearch.trim().toLowerCase();
    const docs = availableDocs.filter((d) => d.kind === 'published');
    const filtered = docsYearFilter == null ? docs : docs.filter((d) => d.year == docsYearFilter);
    if (!q) return filtered;
    return filtered.filter((d) => d.eventId.toLowerCase().includes(q));
  }, [availableDocs, docSearch, docsYearFilter]);

  const selectedDoc = useMemo(
    () => filteredDocs.find((d) => `${d.kind}:${d.eventId}` === selectedDocKey),
    [filteredDocs, selectedDocKey]
  );

  function refreshDocs() {
    setAvailableDocs(listLocalStorageTriathlonDocs({}));
  }

  function openPicker() {
    refreshDocs();
    dialogRef.current?.showModal();
  }

  function closePicker() {
    dialogRef.current?.close();
  }

  async function onUseSelected() {
    if (!selectedDoc) return;
    setEventId(selectedDoc.eventId);
    setSelectedDocKey('');
    closePicker();
    await onLoad(selectedDoc.eventId);
  }

  const [sortByGame, setSortByGame] = useState<Record<string, SortSpec>>({});
  const [totalsSort, setTotalsSort] = useState<SortSpec>({ key: 'triathlon', dir: 'desc' });

  useEffect(() => {
    (async () => {
      try {
        const activeEventId = hasBackendConfig()
          ? (await apiGetActiveTriathlon({ apiBaseUrl: runtimeConfig.scoringApiBaseUrl! })).activeEventId
          : getLocalActiveEventId();
        if (!activeEventId) return;
        setEventId(activeEventId);
        await onLoad(activeEventId);
      } catch {
        // If active triathlon isn't configured yet, do nothing.
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onLoad(nextEventId?: string) {
    const id = (nextEventId ?? eventId).trim();
    if (!id) return;
    try {
      if (hasBackendConfig()) {
        const loaded = await apiGetPublished({ apiBaseUrl: runtimeConfig.scoringApiBaseUrl!, eventId: id });
        setError(null);
        setDoc(loaded);
        return;
      }

      const loaded = loadPublishedDoc(`${LS_PUBLISHED_PREFIX}${id}`);
      if (!loaded) {
        setDoc(null);
        setError('No published doc found in localStorage for this Triathlon Name.');
        return;
      }
      setError(null);
      setDoc(loaded);
    } catch (e) {
      setDoc(null);
      setError((e as Error)?.message ?? String(e));
    }
  }

  return (
    <div style={{ padding: 16 }}>
      <h1 className="panelTitle" style={{ marginBottom: 4 }}>
        Published Results
      </h1>
      <p className="kicker" style={{ marginTop: 0 }}>
        Running results...
      </p>

      <div className="card" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ fontSize: 12, opacity: 0.85 }}>Triathlon</div>
        <div>
          <code>{eventId}</code>
        </div>
        <button onClick={openPicker}>Select…</button>
        <button onClick={() => void onLoad()}>Load Published</button>
        <div style={{ marginLeft: 'auto', fontSize: 12, opacity: 0.85 }}>
          Key: <code>{publishedKey}</code>
        </div>
      </div>

      <dialog ref={dialogRef} className="bstDialog">
        <div className="bstDialogHeader">
          <b>Select triathlon</b>
          <button style={{ marginLeft: 'auto' }} onClick={closePicker}>
            Close
          </button>
        </div>
        <div className="bstDialogBody">
          <div className="card" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
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
            <button onClick={refreshDocs}>Refresh</button>
            <div style={{ fontSize: 12, opacity: 0.85 }}>Found: {filteredDocs.length}</div>
          </div>

          {filteredDocs.length === 0 ? (
            <div className="card" style={{ fontSize: 12, opacity: 0.9 }}>
              No published triathlons found in localStorage yet. If you’re using the AWS backend, you can still load by typing the eventId in the URL/API for now.
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <select
                value={selectedDocKey}
                onChange={(e) => setSelectedDocKey(e.target.value)}
                style={{ minWidth: 360, maxWidth: '100%' }}
              >
                <option value="">— Select —</option>
                {filteredDocs.map((d) => (
                  <option key={`${d.kind}:${d.eventId}`} value={`${d.kind}:${d.eventId}`}>
                    {d.eventId} ({d.year}) • {d.updatedAt ?? '-'}
                  </option>
                ))}
              </select>
              <button disabled={!selectedDoc} onClick={() => void onUseSelected()}>
                Use
              </button>
            </div>
          )}
        </div>
      </dialog>

      {error && (
        <div className="card" style={{ marginTop: 10, color: '#b00020' }}>
          {error}
        </div>
      )}

      {!doc ? null : (
        <div style={{ marginTop: 12 }}>
          <div className="card">
            <div style={{ fontSize: 12, opacity: 0.9 }}>
              Status: <b>{doc.status}</b>
              {doc.publishedAt ? (
                <>
                  {' '}
                  • Published at: <code>{doc.publishedAt}</code>
                </>
              ) : null}
            </div>
          </div>

          <h2 style={{ marginTop: 18 }}>Triathlon Totals</h2>
          <div className="card">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ cursor: 'pointer' }} onClick={() => setTotalsSort(nextSort(totalsSort, 'competitor', 'asc'))}>
                    Competitor{sortMark(totalsSort.key === 'competitor', totalsSort.dir)}
                  </th>
                  <th style={{ width: 90, cursor: 'pointer' }} onClick={() => setTotalsSort(nextSort(totalsSort, 'bowling', 'desc'))}>
                    Bowling{sortMark(totalsSort.key === 'bowling', totalsSort.dir)}
                  </th>
                  <th style={{ width: 90, cursor: 'pointer' }} onClick={() => setTotalsSort(nextSort(totalsSort, 'pool', 'desc'))}>
                    Pool{sortMark(totalsSort.key === 'pool', totalsSort.dir)}
                  </th>
                  <th style={{ width: 90, cursor: 'pointer' }} onClick={() => setTotalsSort(nextSort(totalsSort, 'darts', 'desc'))}>
                    Darts{sortMark(totalsSort.key === 'darts', totalsSort.dir)}
                  </th>
                  <th style={{ width: 110, cursor: 'pointer' }} onClick={() => setTotalsSort(nextSort(totalsSort, 'triathlon', 'desc'))}>
                    Triathlon{sortMark(totalsSort.key === 'triathlon', totalsSort.dir)}
                  </th>
                </tr>
              </thead>
              <tbody>
                {[...orderedParticipants]
                  .map((p, idx) => ({
                    p,
                    idx,
                    t: doc.totals.byPerson[p.personId]
                  }))
                  .map((row, stableIdx) => ({ ...row, stableIdx }))
                  .sort((a, b) => {
                    const bowlingA = a.t?.bySubEvent.bowling ?? 0;
                    const bowlingB = b.t?.bySubEvent.bowling ?? 0;
                    const poolA = a.t?.bySubEvent.pool ?? 0;
                    const poolB = b.t?.bySubEvent.pool ?? 0;
                    const dartsA = a.t?.bySubEvent.darts ?? 0;
                    const dartsB = b.t?.bySubEvent.darts ?? 0;
                    const triA = a.t?.triathlon ?? 0;
                    const triB = b.t?.triathlon ?? 0;

                    if (totalsSort.key === 'competitor')
                      return cmpStr(a.p.displayName, b.p.displayName, totalsSort.dir) || a.stableIdx - b.stableIdx;
                    if (totalsSort.key === 'bowling')
                      return cmpNum(bowlingA, bowlingB, totalsSort.dir) || a.stableIdx - b.stableIdx;
                    if (totalsSort.key === 'pool') return cmpNum(poolA, poolB, totalsSort.dir) || a.stableIdx - b.stableIdx;
                    if (totalsSort.key === 'darts')
                      return cmpNum(dartsA, dartsB, totalsSort.dir) || a.stableIdx - b.stableIdx;
                    if (totalsSort.key === 'triathlon')
                      return cmpNum(triA, triB, totalsSort.dir) || a.stableIdx - b.stableIdx;
                    return a.stableIdx - b.stableIdx;
                  })
                  .map(({ p, t }) => (
                    <tr key={p.personId}>
                      <td>{p.displayName}</td>
                      <td>{t?.bySubEvent.bowling ?? 0}</td>
                      <td>{t?.bySubEvent.pool ?? 0}</td>
                      <td>{t?.bySubEvent.darts ?? 0}</td>
                      <td>
                        <b>{t?.triathlon ?? 0}</b>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {doc.subEvents.map((se) => (
            <SubEventSection
              key={se.subEventId}
              subEvent={se}
              participants={orderedParticipants}
              sortByGame={sortByGame}
              setSortByGame={setSortByGame}
            />
          ))}

          <details style={{ marginTop: 18 }}>
            <summary>Raw JSON (published doc)</summary>
            <div className="card" style={{ overflowX: 'auto', marginTop: 8 }}>
              <pre suppressHydrationWarning style={{ margin: 0, fontSize: 12 }}>
                {JSON.stringify(doc, null, 2)}
              </pre>
            </div>
          </details>
        </div>
      )}
    </div>
  );
}
