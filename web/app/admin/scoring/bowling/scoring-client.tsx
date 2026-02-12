'use client';

import { useState } from 'react';

import { emptyGameResult } from '../../../../lib/scoring-rules';
import { useScoring } from '../scoring-context';

function placeStyle(place: number | null) {
  return typeof place === 'number' && place >= 1 && place <= 5 ? { fontWeight: 700 } : undefined;
}

function renderPlace(place: number | null) {
  if (place == null) return '-';
  return place >= 1 && place <= 5 ? <b>{place}</b> : place;
}

type SortDir = 'asc' | 'desc';
type SortKey = 'order' | 'competitor' | 'raw' | 'place' | 'points';

type SortSpec = { key: SortKey; dir: SortDir };

function initialDirForKey(key: SortKey): SortDir {
  if (key === 'raw' || key === 'points') return 'desc';
  return 'asc';
}

function nextSort(prev: SortSpec | undefined, key: SortKey): SortSpec {
  if (prev?.key !== key) return { key, dir: initialDirForKey(key) };
  return { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' };
}

function cmpNum(a: number | null, b: number | null, dir: SortDir): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  return dir === 'asc' ? a - b : b - a;
}

function sortMark(active: boolean, dir: SortDir) {
  if (!active) return null;
  return (
    <span aria-hidden style={{ opacity: 0.7, marginLeft: 6 }}>
      {dir === 'asc' ? '▲' : '▼'}
    </span>
  );
}

export default function BowlingScoringClient() {
  const { doc, setRaw, setPlace, setGameFinalized } = useScoring();
  const participants = doc.participants;
  const [sortByGame, setSortByGame] = useState<Record<string, SortSpec>>({});

  const baseOrder = doc.eventMeta?.competitorOrder?.length ? doc.eventMeta.competitorOrder : participants.map((p) => p.personId);
  const competitorOrder = [...baseOrder, ...participants.map((p) => p.personId).filter((pid) => !baseOrder.includes(pid))];
  const participantsById = new Map(participants.map((p) => [p.personId, p] as const));
  const orderedParticipants = competitorOrder.map((pid) => participantsById.get(pid)).filter((p): p is (typeof participants)[number] => Boolean(p));

  const bowling = doc.subEvents.find((x) => x.subEventId === 'bowling');

  return (
    <div>
      <h2>Bowling</h2>
      <p className="kicker" style={{ marginTop: 6 }}>
        Enter raw scores. If there’s a tie, resolve it via roll-off, then enter the resulting places for the tied players.
      </p>

      {bowling?.games.map((g) => {
        const rawCounts = new Map<number, number>();
        const placeCounts = new Map<number, number>();
        for (const p of orderedParticipants) {
          const r = g.results[p.personId] ?? emptyGameResult();
          if (typeof r.raw === 'number') rawCounts.set(r.raw, (rawCounts.get(r.raw) ?? 0) + 1);
          if (typeof r.place === 'number') placeCounts.set(r.place, (placeCounts.get(r.place) ?? 0) + 1);
        }

        const dupPlaces = [...placeCounts.entries()]
          .filter(([, n]) => n > 1)
          .map(([pl]) => pl)
          .sort((a, b) => a - b);

        const sort = sortByGame[g.gameId] ?? { key: 'order', dir: 'asc' as const };
        const sorted = orderedParticipants
          .map((p, idx) => ({ p, idx, r: g.results[p.personId] ?? emptyGameResult() }))
          .sort((a, b) => {
            if (sort.key === 'order') return a.idx - b.idx;
            if (sort.key === 'competitor') {
              const res = a.p.displayName.localeCompare(b.p.displayName);
              return sort.dir === 'asc' ? res : -res;
            }
            if (sort.key === 'raw') return cmpNum(a.r.raw, b.r.raw, sort.dir);
            if (sort.key === 'place') return cmpNum(a.r.place, b.r.place, sort.dir);
            return cmpNum(a.r.points, b.r.points, sort.dir);
          });

        const finalized = Object.prototype.hasOwnProperty.call(doc, 'finalizedGames') ? Boolean(doc.finalizedGames?.[g.gameId]) : true;

        return (
          <section key={g.gameId} style={{ marginTop: 12 }}>
            <h3 style={{ margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span>
                {g.label} <span style={{ fontSize: 12, opacity: 0.8 }}>({finalized ? 'complete' : 'not complete'})</span>
              </span>
              <button
                title={finalized ? 'Mark game incomplete' : 'Mark game complete'}
                onClick={() => setGameFinalized(g.gameId, !finalized)}
                style={{ marginLeft: 'auto' }}
              >
                {finalized ? 'Reopen' : 'Complete'}
              </button>
            </h3>
            {dupPlaces.length > 0 && (
              <p className="kicker" style={{ marginTop: 0, color: '#b00020' }}>
                Duplicate place(s): {dupPlaces.join(', ')}. Resolve and assign unique places.
              </p>
            )}
            <div className="card">
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ cursor: 'pointer' }} onClick={() => setSortByGame((p) => ({ ...p, [g.gameId]: nextSort(p[g.gameId], 'competitor') }))}>
                      Competitor{sortMark(sort.key === 'competitor', sort.dir)}
                    </th>
                    <th style={{ width: 140, cursor: 'pointer' }} onClick={() => setSortByGame((p) => ({ ...p, [g.gameId]: nextSort(p[g.gameId], 'raw') }))}>
                      Pins{sortMark(sort.key === 'raw', sort.dir)}
                    </th>
                    <th style={{ width: 140, cursor: 'pointer' }} onClick={() => setSortByGame((p) => ({ ...p, [g.gameId]: nextSort(p[g.gameId], 'place') }))}>
                      Place{sortMark(sort.key === 'place', sort.dir)}
                    </th>
                    <th style={{ width: 90, cursor: 'pointer' }} onClick={() => setSortByGame((p) => ({ ...p, [g.gameId]: nextSort(p[g.gameId], 'points') }))}>
                      Points{sortMark(sort.key === 'points', sort.dir)}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map(({ p, r }) => {
                    const isTie = typeof r.raw === 'number' && (rawCounts.get(r.raw) ?? 0) > 1;
                    const isDup = typeof r.place === 'number' && (placeCounts.get(r.place) ?? 0) > 1;
                    return (
                      <tr key={p.personId}>
                        <td>{p.displayName}</td>
                        <td>
                          <input
                            type="number"
                            value={r.raw ?? ''}
                            onChange={(e) => setRaw(g.gameId, p.personId, e.target.value === '' ? null : Number(e.target.value))}
                          />
                        </td>
                        <td>
                          {isTie ? (
                            <input
                              type="number"
                              value={r.place ?? ''}
                              onChange={(e) =>
                                setPlace(g.gameId, p.personId, e.target.value === '' ? null : Number(e.target.value))
                              }
                              style={{ ...placeStyle(r.place), ...(isDup ? { border: '2px solid #b00020' } : {}) }}
                            />
                          ) : (
                            renderPlace(r.place)
                          )}
                        </td>
                        <td>{r.points ?? '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
    </div>
  );
}
