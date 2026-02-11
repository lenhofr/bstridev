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

export default function PoolScoringClient() {
  const { doc, setEventMeta, setPoolMatches, upsertPoolMatch, removePoolMatch, setPlace, setAttempts } = useScoring();
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
            {r.bye && (
              <p className="kicker" style={{ marginTop: 0 }}>
                Bye: <b>{displayName(r.bye)}</b> (counts as a win for both 8-ball and 9-ball)
              </p>
            )}
            <div className="card">
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: 90 }}>Table</th>
                    <th>Match</th>
                    <th style={{ width: 220 }}>8-ball winner</th>
                    <th style={{ width: 220 }}>9-ball winner</th>
                    <th style={{ width: 120 }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {r.matches.map((m) => {
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
                </tbody>
              </table>
            </div>
          </section>
        ))
      )}

      <h3 style={{ marginTop: 18 }}>Standings (derived from match wins)</h3>
      {game8 && (
        <div className="card" style={{ marginTop: 8 }}>
          <h4 style={{ margin: '0 0 8px' }}>8-ball</h4>
          <table className="table">
            <thead>
              <tr>
                <th>Competitor</th>
                <th style={{ width: 90 }}>Wins</th>
                <th style={{ width: 140 }}>Place</th>
                <th style={{ width: 90 }}>Points</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const rawCounts = new Map<number, number>();
                for (const p of participants) {
                  const raw = (game8.results[p.personId] ?? emptyGameResult()).raw;
                  if (typeof raw !== 'number') continue;
                  rawCounts.set(raw, (rawCounts.get(raw) ?? 0) + 1);
                }

                return participants.map((p) => {
                  const r = game8.results[p.personId] ?? emptyGameResult();
                  const isTie = typeof r.raw === 'number' && (rawCounts.get(r.raw) ?? 0) > 1;
                  return (
                    <tr key={p.personId}>
                      <td>{p.displayName}</td>
                      <td>{r.raw ?? 0}</td>
                      <td>
                        {isTie ? (
                          <input
                            type="number"
                            value={r.place ?? ''}
                            onChange={(e) =>
                              setPlace(game8.gameId, p.personId, e.target.value === '' ? null : Number(e.target.value))
                            }
                          />
                        ) : (
                          r.place ?? '-'
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
          <h4 style={{ margin: '0 0 8px' }}>9-ball</h4>
          <table className="table">
            <thead>
              <tr>
                <th>Competitor</th>
                <th style={{ width: 90 }}>Wins</th>
                <th style={{ width: 140 }}>Place</th>
                <th style={{ width: 90 }}>Points</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const rawCounts = new Map<number, number>();
                for (const p of participants) {
                  const raw = (game9.results[p.personId] ?? emptyGameResult()).raw;
                  if (typeof raw !== 'number') continue;
                  rawCounts.set(raw, (rawCounts.get(raw) ?? 0) + 1);
                }

                return participants.map((p) => {
                  const r = game9.results[p.personId] ?? emptyGameResult();
                  const isTie = typeof r.raw === 'number' && (rawCounts.get(r.raw) ?? 0) > 1;
                  return (
                    <tr key={p.personId}>
                      <td>{p.displayName}</td>
                      <td>{r.raw ?? 0}</td>
                      <td>
                        {isTie ? (
                          <input
                            type="number"
                            value={r.place ?? ''}
                            onChange={(e) =>
                              setPlace(game9.gameId, p.personId, e.target.value === '' ? null : Number(e.target.value))
                            }
                          />
                        ) : (
                          r.place ?? '-'
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
          <h3>Run</h3>
          <p className="kicker" style={{ marginTop: 6 }}>
            Enter two attempts (and optionally a tiebreaker run). Official score is the max of Attempt 1/2.
          </p>
          <div className="card">
            <table className="table">
              <thead>
                <tr>
                  <th>Competitor</th>
                  <th style={{ width: 120 }}>Attempt 1</th>
                  <th style={{ width: 120 }}>Attempt 2</th>
                  <th style={{ width: 120 }}>Tiebreaker</th>
                  <th style={{ width: 90 }}>Raw</th>
                  <th style={{ width: 140 }}>Place</th>
                  <th style={{ width: 90 }}>Points</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const rawCounts = new Map<number, number>();
                  for (const p of participants) {
                    const raw = (gameRun.results[p.personId] ?? emptyGameResult()).raw;
                    if (typeof raw !== 'number') continue;
                    rawCounts.set(raw, (rawCounts.get(raw) ?? 0) + 1);
                  }

                  function updateAttempt(personId: string, idx: number, val: number | null) {
                    const r = gameRun.results[personId] ?? emptyGameResult();
                    const prev = r.attempts ?? [0, 0, 0];
                    const next = [prev[0] ?? 0, prev[1] ?? 0, prev[2] ?? 0];
                    next[idx] = val == null ? 0 : val;

                    const any = next.some((n) => typeof n === 'number' && n > 0);
                    setAttempts(gameRun.gameId, personId, any ? next : null);
                  }

                  return participants.map((p) => {
                    const r = gameRun.results[p.personId] ?? emptyGameResult();
                    const attempts = r.attempts ?? [0, 0, 0];
                    const raw = r.raw;
                    const isTie = typeof raw === 'number' && (rawCounts.get(raw) ?? 0) > 1;

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
                          {isTie && r.points == null ? (
                            <input
                              type="number"
                              value={r.place ?? ''}
                              onChange={(e) =>
                                setPlace(gameRun.gameId, p.personId, e.target.value === '' ? null : Number(e.target.value))
                              }
                            />
                          ) : (
                            r.place ?? '-'
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
