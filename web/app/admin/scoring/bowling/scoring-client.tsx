'use client';

import { emptyGameResult } from '../../../../lib/scoring-rules';
import { useScoring } from '../scoring-context';

export default function BowlingScoringClient() {
  const { doc, setRaw, setPlace } = useScoring();
  const participants = doc.participants;

  const bowling = doc.subEvents.find((x) => x.subEventId === 'bowling');

  return (
    <div>
      <h2>Bowling</h2>
      <p className="kicker" style={{ marginTop: 6 }}>
        Enter raw scores. If there’s a tie, resolve it via roll-off, then enter the resulting places for the tied players.
      </p>

      {bowling?.games.map((g) => {
        const rawCounts = new Map<number, number>();
        for (const p of participants) {
          const raw = (g.results[p.personId] ?? emptyGameResult()).raw;
          if (typeof raw !== 'number') continue;
          rawCounts.set(raw, (rawCounts.get(raw) ?? 0) + 1);
        }

        return (
          <section key={g.gameId} style={{ marginTop: 12 }}>
            <h3 style={{ margin: '0 0 8px' }}>{g.label}</h3>
            <div className="card">
              <table className="table">
                <thead>
                  <tr>
                    <th>Participant</th>
                    <th style={{ width: 140 }}>Raw</th>
                    <th style={{ width: 140 }}>Place</th>
                    <th style={{ width: 90 }}>Points</th>
                  </tr>
                </thead>
                <tbody>
                  {participants.map((p) => {
                    const r = g.results[p.personId] ?? emptyGameResult();
                    const isTie = typeof r.raw === 'number' && (rawCounts.get(r.raw) ?? 0) > 1;
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
                            />
                          ) : (
                            r.place ?? '-'
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
