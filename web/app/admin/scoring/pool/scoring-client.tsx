'use client';

import { useMemo, useState } from 'react';

import { generateRoundRobinSchedule } from '../../../../lib/pool-schedule';
import { emptyGameResult } from '../../../../lib/scoring-rules';
import { useScoring } from '../scoring-context';

function parseTables(s: string): number[] {
  const tables = s
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)
    .map((x) => Number(x))
    .filter((n) => Number.isFinite(n) && n > 0);
  return [...new Set(tables)];
}

function matchKey(params: { round: number; a: string; b: string }) {
  return `${params.round}:${params.a}:${params.b}`;
}

function placeStyle(place: number | null) {
  return typeof place === 'number' && place >= 1 && place <= 5 ? { fontWeight: 700 } : undefined;
}

function renderPlace(place: number | null) {
  if (place == null) return '-';
  return place >= 1 && place <= 5 ? <b>{place}</b> : place;
}

type SortDir = 'asc' | 'desc';

function nextSort<T extends string>(
  prev: { key: T; dir: SortDir } | undefined,
  key: T,
  initialDir: SortDir
): { key: T; dir: SortDir } {
  if (prev?.key !== key) return { key, dir: initialDir };
  return { key, dir: (prev.dir === 'asc' ? 'desc' : 'asc') as SortDir };
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

function sortMark(active: boolean, dir: SortDir) {
  if (!active) return null;
  return (
    <span aria-hidden style={{ opacity: 0.7, marginLeft: 6 }}>
      {dir === 'asc' ? '▲' : '▼'}
    </span>
  );
}

export default function PoolScoringClient() {
  const { doc, setEventMeta, setPoolMatches, upsertPoolMatch, removePoolMatch, setPlace, setAttempts, setGameFinalized } = useScoring();
  const participants = doc.participants;

  const pool = doc.subEvents.find((x) => x.subEventId === 'pool');
  const game8 = pool?.games.find((g) => g.gameId === 'pool-1');
  const game9 = pool?.games.find((g) => g.gameId === 'pool-2');
  const gameRun = pool?.games.find((g) => g.gameId === 'pool-3');

  const competitorOrder = useMemo(() => {
    const fromMeta = doc.eventMeta?.competitorOrder;
    if (fromMeta && fromMeta.length > 0) return fromMeta;
    return participants.map((p) => p.personId);
  }, [doc.eventMeta?.competitorOrder, participants]);

  const [tablesText, setTablesText] = useState(() => (doc.eventMeta?.poolTables?.length ? doc.eventMeta.poolTables.join(',') : '1,2'));
  const [partial, setPartial] = useState<Record<string, { w8: string | null; w9: string | null }>>({});

  const [matchSort, setMatchSort] = useState<{ key: 'table' | 'match' | 'status'; dir: SortDir }>({
    key: 'table',
    dir: 'asc'
  });
  const [sort8, setSort8] = useState<{ key: 'order' | 'competitor' | 'wins' | 'place' | 'points'; dir: SortDir }>({
    key: 'order',
    dir: 'asc'
  });
  const [sort9, setSort9] = useState<{ key: 'order' | 'competitor' | 'wins' | 'place' | 'points'; dir: SortDir }>({
    key: 'order',
    dir: 'asc'
  });
  const [sortRun, setSortRun] = useState<{ key: 'order' | 'competitor' | 'a1' | 'a2' | 'tb' | 'raw' | 'place' | 'points'; dir: SortDir }>(
    {
      key: 'order',
      dir: 'asc'
    }
  );

  function displayName(personId: string) {
    return participants.find((p) => p.personId === personId)?.displayName ?? personId;
  }

  function ensureMetaBase() {
    return (
      doc.eventMeta ?? {
        competitorOrder: participants.map((p) => p.personId),
        poolTables: parseTables(tablesText),
        poolSchedule: { rounds: [] }
      }
    );
  }

  function setOrder(nextOrder: string[]) {
    const base = ensureMetaBase();
    setEventMeta({ ...base, competitorOrder: nextOrder });
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

  function onGenerateSchedule() {
    const tables = parseTables(tablesText);
    const schedule = generateRoundRobinSchedule({ competitorOrder, poolTables: tables });
    setEventMeta({ competitorOrder, poolTables: tables, poolSchedule: schedule });
    setPoolMatches([]);
    setPartial({});
  }

  function setWinner(params: { round: number; a: string; b: string; table: number; which: 'w8' | 'w9'; winner: string | null }) {
    const key = matchKey(params);
    const existing = doc.poolMatches.find((m) => m.round === params.round && m.a === params.a && m.b === params.b);
    const base = partial[key] ?? { w8: existing?.winner8Ball ?? null, w9: existing?.winner9Ball ?? null };

    const next = { ...base, [params.which]: params.winner };
    setPartial((prev) => ({ ...prev, [key]: next }));

    if (next.w8 && next.w9) {
      upsertPoolMatch({
        round: params.round,
        a: params.a,
        b: params.b,
        table: params.table,
        winner8Ball: next.w8,
        winner9Ball: next.w9
      });
    } else {
      removePoolMatch({ round: params.round, a: params.a, b: params.b });
    }
  }

  const rounds = doc.eventMeta?.poolSchedule?.rounds ?? [];

  return (
    <div>
      <h2>Pool</h2>

      <h3 style={{ marginTop: 12 }}>Schedule Setup</h3>
      <div className="card" style={{ display: 'grid', gap: 10 }}>
        <div>
          <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 6 }}>Competitor order (drives round-robin pairings)</div>
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 60 }}>#</th>
                <th>Competitor</th>
                <th style={{ width: 140 }} />
              </tr>
            </thead>
            <tbody>
              {competitorOrder.map((pid, idx) => (
                <tr key={pid}>
                  <td>{idx + 1}</td>
                  <td>{displayName(pid)}</td>
                  <td>
                    <button onClick={() => moveInOrder(pid, -1)} disabled={idx === 0}>
                      Up
                    </button>{' '}
                    <button onClick={() => moveInOrder(pid, 1)} disabled={idx === competitorOrder.length - 1}>
                      Down
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <label>
          Pool table numbers (comma-separated){' '}
          <input value={tablesText} onChange={(e) => setTablesText(e.target.value)} style={{ marginLeft: 8 }} />
        </label>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={onGenerateSchedule} disabled={participants.length < 2}>
            Generate pool schedule
          </button>
          <div style={{ fontSize: 12, opacity: 0.85 }}>
            Matches entered: {doc.poolMatches.length}
          </div>
        </div>
      </div>

      <h3 style={{ marginTop: 18 }}>8-ball / 9-ball Matchups</h3>
      {rounds.length === 0 ? (
        <div className="card">Generate the schedule to start entering match winners.</div>
      ) : (
        rounds.map((r) => (
          <section key={r.round} style={{ marginTop: 12 }}>
            <h4 style={{ margin: '0 0 6px' }}>Round {r.round}</h4>
            <div className="card">
              <table className="table">
                <thead>
                  <tr>
                    <th
                      style={{ width: 90, cursor: 'pointer' }}
                      onClick={() => setMatchSort((p) => nextSort(p, 'table', 'asc'))}
                    >
                      Table{sortMark(matchSort.key === 'table', matchSort.dir)}
                    </th>
                    <th style={{ cursor: 'pointer' }} onClick={() => setMatchSort((p) => nextSort(p, 'match', 'asc'))}>
                      Match{sortMark(matchSort.key === 'match', matchSort.dir)}
                    </th>
                    <th style={{ width: 220 }}>8-ball winner</th>
                    <th style={{ width: 220 }}>9-ball winner</th>
                    <th
                      style={{ width: 120, cursor: 'pointer' }}
                      onClick={() => setMatchSort((p) => nextSort(p, 'status', 'asc'))}
                    >
                      Status{sortMark(matchSort.key === 'status', matchSort.dir)}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const sortedMatches = r.matches
                      .map((m, idx) => ({ m, idx }))
                      .sort((a, b) => {
                        const keyA = matchKey({ round: r.round, a: a.m.a, b: a.m.b });
                        const keyB = matchKey({ round: r.round, a: b.m.a, b: b.m.b });
                        const existingA = doc.poolMatches.find((x) => x.round === r.round && x.a === a.m.a && x.b === a.m.b);
                        const existingB = doc.poolMatches.find((x) => x.round === r.round && x.a === b.m.a && x.b === b.m.b);
                        const curA = partial[keyA] ?? { w8: existingA?.winner8Ball ?? null, w9: existingA?.winner9Ball ?? null };
                        const curB = partial[keyB] ?? { w8: existingB?.winner8Ball ?? null, w9: existingB?.winner9Ball ?? null };
                        const doneA = curA.w8 && curA.w9 ? 1 : 0;
                        const doneB = curB.w8 && curB.w9 ? 1 : 0;

                        if (matchSort.key === 'table') return cmpNum(a.m.table, b.m.table, matchSort.dir) || a.idx - b.idx;
                        if (matchSort.key === 'status') return cmpNum(doneA, doneB, matchSort.dir) || a.idx - b.idx;

                        const labelA = `${displayName(a.m.a)} vs ${displayName(a.m.b)}`;
                        const labelB = `${displayName(b.m.a)} vs ${displayName(b.m.b)}`;
                        return cmpStr(labelA, labelB, matchSort.dir) || a.idx - b.idx;
                      });

                    return (
                      <>
                        {sortedMatches.map(({ m }) => {
                          const key = matchKey({ round: r.round, a: m.a, b: m.b });
                          const existing = doc.poolMatches.find((x) => x.round === r.round && x.a === m.a && x.b === m.b);
                          const cur = partial[key] ?? { w8: existing?.winner8Ball ?? null, w9: existing?.winner9Ball ?? null };
                          const done = !!(cur.w8 && cur.w9);

                          return (
                            <tr key={key}>
                              <td>{m.table}</td>
                              <td>
                                {displayName(m.a)} vs {displayName(m.b)}
                              </td>
                              <td>
                                <select
                                  value={cur.w8 ?? ''}
                                  onChange={(e) =>
                                    setWinner({
                                      round: r.round,
                                      a: m.a,
                                      b: m.b,
                                      table: m.table,
                                      which: 'w8',
                                      winner: e.target.value === '' ? null : e.target.value
                                    })
                                  }
                                >
                                  <option value="">—</option>
                                  <option value={m.a}>{displayName(m.a)}</option>
                                  <option value={m.b}>{displayName(m.b)}</option>
                                </select>
                              </td>
                              <td>
                                <select
                                  value={cur.w9 ?? ''}
                                  onChange={(e) =>
                                    setWinner({
                                      round: r.round,
                                      a: m.a,
                                      b: m.b,
                                      table: m.table,
                                      which: 'w9',
                                      winner: e.target.value === '' ? null : e.target.value
                                    })
                                  }
                                >
                                  <option value="">—</option>
                                  <option value={m.a}>{displayName(m.a)}</option>
                                  <option value={m.b}>{displayName(m.b)}</option>
                                </select>
                              </td>
                              <td>{done ? 'Complete' : 'Incomplete'}</td>
                            </tr>
                          );
                        })}

                        {r.bye && (
                          <tr key={`bye:${r.round}:${r.bye}`}>
                            <td>Bye</td>
                            <td>{displayName(r.bye)} (bye)</td>
                            <td>
                              <select value={r.bye} disabled>
                                <option value={r.bye}>{displayName(r.bye)}</option>
                              </select>
                            </td>
                            <td>
                              <select value={r.bye} disabled>
                                <option value={r.bye}>{displayName(r.bye)}</option>
                              </select>
                            </td>
                            <td>Complete</td>
                          </tr>
                        )}
                      </>
                    );
                  })()}
                </tbody>
              </table>
            </div>
          </section>
        ))
      )}

      <h3 style={{ marginTop: 18 }}>Standings (derived from match wins)</h3>
      {game8 && (
        <div className="card" style={{ marginTop: 8 }}>
          {(() => {
            const finalized = Object.prototype.hasOwnProperty.call(doc, 'finalizedGames') ? Boolean(doc.finalizedGames?.[game8.gameId]) : true;
            return (
              <h4 style={{ margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <span>
                  8-ball <span style={{ fontSize: 12, opacity: 0.8 }}>({finalized ? 'complete' : 'not complete'})</span>
                </span>
                <button
                  title={finalized ? 'Mark game incomplete' : 'Mark game complete'}
                  onClick={() => setGameFinalized(game8.gameId, !finalized)}
                  style={{ marginLeft: 'auto' }}
                >
                  {finalized ? 'Reopen' : 'Complete'}
                </button>
              </h4>
            );
          })()}
          {(() => {
            const placeCounts = new Map<number, number>();
            for (const p of participants) {
              const r = game8.results[p.personId] ?? emptyGameResult();
              if (typeof r.place !== 'number') continue;
              placeCounts.set(r.place, (placeCounts.get(r.place) ?? 0) + 1);
            }
            const dupPlaces = [...placeCounts.entries()]
              .filter(([, n]) => n > 1)
              .map(([pl]) => pl)
              .sort((a, b) => a - b);
            return dupPlaces.length > 0 ? (
              <p className="kicker" style={{ marginTop: 0, color: '#b00020' }}>
                Duplicate place(s): {dupPlaces.join(', ')}. Resolve and assign unique places.
              </p>
            ) : null;
          })()}
          <table className="table">
            <thead>
              <tr>
                <th style={{ cursor: 'pointer' }} onClick={() => setSort8((p) => nextSort(p, 'competitor', 'asc'))}>
                  Competitor{sortMark(sort8.key === 'competitor', sort8.dir)}
                </th>
                <th style={{ width: 90, cursor: 'pointer' }} onClick={() => setSort8((p) => nextSort(p, 'wins', 'desc'))}>
                  Wins{sortMark(sort8.key === 'wins', sort8.dir)}
                </th>
                <th style={{ width: 140, cursor: 'pointer' }} onClick={() => setSort8((p) => nextSort(p, 'place', 'asc'))}>
                  Place{sortMark(sort8.key === 'place', sort8.dir)}
                </th>
                <th style={{ width: 90, cursor: 'pointer' }} onClick={() => setSort8((p) => nextSort(p, 'points', 'desc'))}>
                  Points{sortMark(sort8.key === 'points', sort8.dir)}
                </th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const base = competitorOrder.flatMap((personId, idx) => {
                  const p = participants.find((x) => x.personId === personId);
                  if (!p) return [];
                  const r = game8.results[p.personId] ?? emptyGameResult();
                  return [{ idx, p, r }];
                });

                const rawCounts = new Map<number, number>();
                const placeCounts = new Map<number, number>();
                for (const { r } of base) {
                  const raw = r.raw;
                  if (typeof raw === 'number') rawCounts.set(raw, (rawCounts.get(raw) ?? 0) + 1);
                  if (typeof r.place === 'number') placeCounts.set(r.place, (placeCounts.get(r.place) ?? 0) + 1);
                }

                const sorted = base
                  .map((row, stableIdx) => ({ ...row, stableIdx }))
                  .sort((a, b) => {
                    const winsA = typeof a.r.raw === 'number' ? a.r.raw : null;
                    const winsB = typeof b.r.raw === 'number' ? b.r.raw : null;
                    const placeA = typeof a.r.place === 'number' ? a.r.place : null;
                    const placeB = typeof b.r.place === 'number' ? b.r.place : null;
                    const pointsA = typeof a.r.points === 'number' ? a.r.points : null;
                    const pointsB = typeof b.r.points === 'number' ? b.r.points : null;

                    if (sort8.key === 'order') return cmpNum(a.idx, b.idx, sort8.dir) || a.stableIdx - b.stableIdx;
                    if (sort8.key === 'competitor')
                      return cmpStr(a.p.displayName, b.p.displayName, sort8.dir) || a.stableIdx - b.stableIdx;
                    if (sort8.key === 'wins') return cmpNum(winsA, winsB, sort8.dir) || a.stableIdx - b.stableIdx;
                    if (sort8.key === 'place') return cmpNum(placeA, placeB, sort8.dir) || a.stableIdx - b.stableIdx;
                    return cmpNum(pointsA, pointsB, sort8.dir) || a.stableIdx - b.stableIdx;
                  });

                return sorted.map(({ p, r }) => {
                  const isTie = typeof r.raw === 'number' && (rawCounts.get(r.raw) ?? 0) > 1;
                  const isDup = typeof r.place === 'number' && (placeCounts.get(r.place) ?? 0) > 1;
                  return (
                    <tr key={p.personId}>
                      <td>{p.displayName}</td>
                      <td>{r.raw ?? 0}</td>
                      <td>
                        {(isTie || isDup) && r.points == null ? (
                          <input
                            type="number"
                            value={r.place ?? ''}
                            style={{ ...placeStyle(r.place), ...(isDup ? { border: '2px solid #b00020' } : {}) }}
                            onChange={(e) =>
                              setPlace(game8.gameId, p.personId, e.target.value === '' ? null : Number(e.target.value))
                            }
                          />
                        ) : (
                          renderPlace(r.place)
                        )}
                      </td>
                      <td>{r.points ?? '-'}</td>
                    </tr>
                  );
                });
              })()}
            </tbody>
          </table>
        </div>
      )}

      {game9 && (
        <div className="card" style={{ marginTop: 12 }}>
          {(() => {
            const finalized = Object.prototype.hasOwnProperty.call(doc, 'finalizedGames') ? Boolean(doc.finalizedGames?.[game9.gameId]) : true;
            return (
              <h4 style={{ margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <span>
                  9-ball <span style={{ fontSize: 12, opacity: 0.8 }}>({finalized ? 'complete' : 'not complete'})</span>
                </span>
                <button
                  title={finalized ? 'Mark game incomplete' : 'Mark game complete'}
                  onClick={() => setGameFinalized(game9.gameId, !finalized)}
                  style={{ marginLeft: 'auto' }}
                >
                  {finalized ? 'Reopen' : 'Complete'}
                </button>
              </h4>
            );
          })()}
          {(() => {
            const placeCounts = new Map<number, number>();
            for (const p of participants) {
              const r = game9.results[p.personId] ?? emptyGameResult();
              if (typeof r.place !== 'number') continue;
              placeCounts.set(r.place, (placeCounts.get(r.place) ?? 0) + 1);
            }
            const dupPlaces = [...placeCounts.entries()]
              .filter(([, n]) => n > 1)
              .map(([pl]) => pl)
              .sort((a, b) => a - b);
            return dupPlaces.length > 0 ? (
              <p className="kicker" style={{ marginTop: 0, color: '#b00020' }}>
                Duplicate place(s): {dupPlaces.join(', ')}. Resolve and assign unique places.
              </p>
            ) : null;
          })()}
          <table className="table">
            <thead>
              <tr>
                <th style={{ cursor: 'pointer' }} onClick={() => setSort9((p) => nextSort(p, 'competitor', 'asc'))}>
                  Competitor{sortMark(sort9.key === 'competitor', sort9.dir)}
                </th>
                <th style={{ width: 90, cursor: 'pointer' }} onClick={() => setSort9((p) => nextSort(p, 'wins', 'desc'))}>
                  Wins{sortMark(sort9.key === 'wins', sort9.dir)}
                </th>
                <th style={{ width: 140, cursor: 'pointer' }} onClick={() => setSort9((p) => nextSort(p, 'place', 'asc'))}>
                  Place{sortMark(sort9.key === 'place', sort9.dir)}
                </th>
                <th style={{ width: 90, cursor: 'pointer' }} onClick={() => setSort9((p) => nextSort(p, 'points', 'desc'))}>
                  Points{sortMark(sort9.key === 'points', sort9.dir)}
                </th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const base = competitorOrder.flatMap((personId, idx) => {
                  const p = participants.find((x) => x.personId === personId);
                  if (!p) return [];
                  const r = game9.results[p.personId] ?? emptyGameResult();
                  return [{ idx, p, r }];
                });

                const rawCounts = new Map<number, number>();
                const placeCounts = new Map<number, number>();
                for (const { r } of base) {
                  const raw = r.raw;
                  if (typeof raw === 'number') rawCounts.set(raw, (rawCounts.get(raw) ?? 0) + 1);
                  if (typeof r.place === 'number') placeCounts.set(r.place, (placeCounts.get(r.place) ?? 0) + 1);
                }

                const sorted = base
                  .map((row, stableIdx) => ({ ...row, stableIdx }))
                  .sort((a, b) => {
                    const winsA = typeof a.r.raw === 'number' ? a.r.raw : null;
                    const winsB = typeof b.r.raw === 'number' ? b.r.raw : null;
                    const placeA = typeof a.r.place === 'number' ? a.r.place : null;
                    const placeB = typeof b.r.place === 'number' ? b.r.place : null;
                    const pointsA = typeof a.r.points === 'number' ? a.r.points : null;
                    const pointsB = typeof b.r.points === 'number' ? b.r.points : null;

                    if (sort9.key === 'order') return cmpNum(a.idx, b.idx, sort9.dir) || a.stableIdx - b.stableIdx;
                    if (sort9.key === 'competitor')
                      return cmpStr(a.p.displayName, b.p.displayName, sort9.dir) || a.stableIdx - b.stableIdx;
                    if (sort9.key === 'wins') return cmpNum(winsA, winsB, sort9.dir) || a.stableIdx - b.stableIdx;
                    if (sort9.key === 'place') return cmpNum(placeA, placeB, sort9.dir) || a.stableIdx - b.stableIdx;
                    return cmpNum(pointsA, pointsB, sort9.dir) || a.stableIdx - b.stableIdx;
                  });

                return sorted.map(({ p, r }) => {
                  const isTie = typeof r.raw === 'number' && (rawCounts.get(r.raw) ?? 0) > 1;
                  const isDup = typeof r.place === 'number' && (placeCounts.get(r.place) ?? 0) > 1;
                  return (
                    <tr key={p.personId}>
                      <td>{p.displayName}</td>
                      <td>{r.raw ?? 0}</td>
                      <td>
                        {(isTie || isDup) && r.points == null ? (
                          <input
                            type="number"
                            value={r.place ?? ''}
                            style={{ ...placeStyle(r.place), ...(isDup ? { border: '2px solid #b00020' } : {}) }}
                            onChange={(e) =>
                              setPlace(game9.gameId, p.personId, e.target.value === '' ? null : Number(e.target.value))
                            }
                          />
                        ) : (
                          renderPlace(r.place)
                        )}
                      </td>
                      <td>{r.points ?? '-'}</td>
                    </tr>
                  );
                });
              })()}
            </tbody>
          </table>
        </div>
      )}

      {gameRun && (
        <div style={{ marginTop: 18 }}>
          {(() => {
            const finalized = Object.prototype.hasOwnProperty.call(doc, 'finalizedGames') ? Boolean(doc.finalizedGames?.[gameRun.gameId]) : true;
            return (
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span>
                  Run <span style={{ fontSize: 12, opacity: 0.8 }}>({finalized ? 'complete' : 'not complete'})</span>
                </span>
                <button
                  title={finalized ? 'Mark game incomplete' : 'Mark game complete'}
                  onClick={() => setGameFinalized(gameRun.gameId, !finalized)}
                  style={{ marginLeft: 'auto' }}
                >
                  {finalized ? 'Reopen' : 'Complete'}
                </button>
              </h3>
            );
          })()}
          <p className="kicker" style={{ marginTop: 6 }}>
            Enter two attempts (and optionally a tiebreaker run). Official score is the max of Attempt 1/2.
          </p>
          <div className="card">
            {(() => {
              const placeCounts = new Map<number, number>();
              for (const p of participants) {
                const r = gameRun.results[p.personId] ?? emptyGameResult();
                if (typeof r.place !== 'number') continue;
                placeCounts.set(r.place, (placeCounts.get(r.place) ?? 0) + 1);
              }
              const dupPlaces = [...placeCounts.entries()]
                .filter(([, n]) => n > 1)
                .map(([pl]) => pl)
                .sort((a, b) => a - b);
              return dupPlaces.length > 0 ? (
                <p className="kicker" style={{ marginTop: 0, color: '#b00020' }}>
                  Duplicate place(s): {dupPlaces.join(', ')}. Resolve and assign unique places.
                </p>
              ) : null;
            })()}
            <table className="table">
              <thead>
                <tr>
                  <th style={{ cursor: 'pointer' }} onClick={() => setSortRun((p) => nextSort(p, 'competitor', 'asc'))}>
                    Competitor{sortMark(sortRun.key === 'competitor', sortRun.dir)}
                  </th>
                  <th style={{ width: 120, cursor: 'pointer' }} onClick={() => setSortRun((p) => nextSort(p, 'a1', 'desc'))}>
                    Attempt 1{sortMark(sortRun.key === 'a1', sortRun.dir)}
                  </th>
                  <th style={{ width: 120, cursor: 'pointer' }} onClick={() => setSortRun((p) => nextSort(p, 'a2', 'desc'))}>
                    Attempt 2{sortMark(sortRun.key === 'a2', sortRun.dir)}
                  </th>
                  <th style={{ width: 120, cursor: 'pointer' }} onClick={() => setSortRun((p) => nextSort(p, 'tb', 'desc'))}>
                    Tiebreaker{sortMark(sortRun.key === 'tb', sortRun.dir)}
                  </th>
                  <th style={{ width: 90, cursor: 'pointer' }} onClick={() => setSortRun((p) => nextSort(p, 'raw', 'desc'))}>
                    BestRun{sortMark(sortRun.key === 'raw', sortRun.dir)}
                  </th>
                  <th style={{ width: 140, cursor: 'pointer' }} onClick={() => setSortRun((p) => nextSort(p, 'place', 'asc'))}>
                    Place{sortMark(sortRun.key === 'place', sortRun.dir)}
                  </th>
                  <th style={{ width: 90, cursor: 'pointer' }} onClick={() => setSortRun((p) => nextSort(p, 'points', 'desc'))}>
                    Points{sortMark(sortRun.key === 'points', sortRun.dir)}
                  </th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const base = competitorOrder.flatMap((personId, idx) => {
                    const p = participants.find((x) => x.personId === personId);
                    if (!p) return [];
                    const r = gameRun.results[p.personId] ?? emptyGameResult();
                    return [{ idx, p, r }];
                  });

                  const rawCounts = new Map<number, number>();
                  const placeCounts = new Map<number, number>();
                  for (const { r } of base) {
                    const raw = r.raw;
                    if (typeof raw === 'number') rawCounts.set(raw, (rawCounts.get(raw) ?? 0) + 1);
                    if (typeof r.place === 'number') placeCounts.set(r.place, (placeCounts.get(r.place) ?? 0) + 1);
                  }

                  function updateAttempt(personId: string, idx: number, val: number | null) {
                    const r = gameRun.results[personId] ?? emptyGameResult();
                    const prev = r.attempts ?? [0, 0, 0];
                    const next = [prev[0] ?? 0, prev[1] ?? 0, prev[2] ?? 0];
                    next[idx] = val == null ? 0 : val;

                    const any = next.some((n) => typeof n === 'number' && n > 0);
                    setAttempts(gameRun.gameId, personId, any ? next : null);
                  }

                  const sorted = base
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

                      if (sortRun.key === 'order') return cmpNum(a.idx, b.idx, sortRun.dir) || a.stableIdx - b.stableIdx;
                      if (sortRun.key === 'competitor')
                        return cmpStr(a.p.displayName, b.p.displayName, sortRun.dir) || a.stableIdx - b.stableIdx;
                      if (sortRun.key === 'a1') return cmpNum(a1A, a1B, sortRun.dir) || a.stableIdx - b.stableIdx;
                      if (sortRun.key === 'a2') return cmpNum(a2A, a2B, sortRun.dir) || a.stableIdx - b.stableIdx;
                      if (sortRun.key === 'tb') return cmpNum(tbA, tbB, sortRun.dir) || a.stableIdx - b.stableIdx;
                      if (sortRun.key === 'raw') return cmpNum(rawA, rawB, sortRun.dir) || a.stableIdx - b.stableIdx;
                      if (sortRun.key === 'place') return cmpNum(placeA, placeB, sortRun.dir) || a.stableIdx - b.stableIdx;
                      return cmpNum(pointsA, pointsB, sortRun.dir) || a.stableIdx - b.stableIdx;
                    });

                  return sorted.map(({ p, r }) => {
                    const attempts = r.attempts ?? [0, 0, 0];
                    const raw = r.raw;
                    const isTie = typeof raw === 'number' && (rawCounts.get(raw) ?? 0) > 1;
                    const isDup = typeof r.place === 'number' && (placeCounts.get(r.place) ?? 0) > 1;

                    return (
                      <tr key={p.personId}>
                        <td>{p.displayName}</td>
                        <td>
                          <input
                            type="number"
                            value={attempts[0] ? attempts[0] : ''}
                            onChange={(e) => updateAttempt(p.personId, 0, e.target.value === '' ? null : Number(e.target.value))}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            value={attempts[1] ? attempts[1] : ''}
                            onChange={(e) => updateAttempt(p.personId, 1, e.target.value === '' ? null : Number(e.target.value))}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            value={attempts[2] ? attempts[2] : ''}
                            disabled={!isTie}
                            onChange={(e) => updateAttempt(p.personId, 2, e.target.value === '' ? null : Number(e.target.value))}
                          />
                        </td>
                        <td>{raw ?? '-'}</td>
                        <td>
                          {(isTie || isDup) && r.points == null ? (
                            <input
                              type="number"
                              value={r.place ?? ''}
                              style={{ ...placeStyle(r.place), ...(isDup ? { border: '2px solid #b00020' } : {}) }}
                              onChange={(e) =>
                                setPlace(gameRun.gameId, p.personId, e.target.value === '' ? null : Number(e.target.value))
                              }
                            />
                          ) : (
                            renderPlace(r.place)
                          )}
                        </td>
                        <td>{r.points ?? '-'}</td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
