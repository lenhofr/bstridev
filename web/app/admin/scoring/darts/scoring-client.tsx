'use client';

import { emptyGameResult } from '../../../../lib/scoring-rules';
import { useScoring } from '../scoring-context';

export default function DartsScoringClient() {
  const { doc, setPlace } = useScoring();
  const participants = doc.participants;

  const darts = doc.subEvents.find((x) => x.subEventId === 'darts');

  return (
    <div>
      <h2>Darts</h2>
      <p className="kicker" style={{ marginTop: 6 }}>
        Enter place; points are derived from place.
      </p>

      {darts?.games.map((g) => {
        const placeCounts = new Map<number, number>();
        for (const p of participants) {
          const r = g.results[p.personId] ?? emptyGameResult();
          if (typeof r.place !== 'number') continue;
          placeCounts.set(r.place, (placeCounts.get(r.place) ?? 0) + 1);
        }
        const dupPlaces = [...placeCounts.entries()]
          .filter(([, n]) => n > 1)
          .map(([pl]) => pl)
          .sort((a, b) => a - b);

        return (
          <section key={g.gameId} style={{ marginTop: 12 }}>
            <h3 style={{ margin: '0 0 8px' }}>{g.label}</h3>
            {dupPlaces.length > 0 && (
              <p className="kicker" style={{ marginTop: 0, color: '#b00020' }}>
                Duplicate place(s): {dupPlaces.join(', ')}. Resolve via tie-break, then assign unique places.
              </p>
            )}
            <div className="card">
              <table className="table">
                <thead>
                  <tr>
                    <th>Competitor</th>
                    <th style={{ width: 140 }}>Place</th>
                    <th style={{ width: 90 }}>Points</th>
                  </tr>
                </thead>
                <tbody>
                  {participants.map((p) => {
                    const r = g.results[p.personId] ?? emptyGameResult();
                    const isDup = typeof r.place === 'number' && (placeCounts.get(r.place) ?? 0) > 1;
                    return (
                      <tr key={p.personId}>
                        <td>{p.displayName}</td>
                        <td>
                          <input
                            type="number"
                            value={r.place ?? ''}
                            onChange={(e) =>
                              setPlace(g.gameId, p.personId, e.target.value === '' ? null : Number(e.target.value))
                            }
                            style={isDup ? { border: '2px solid #b00020' } : undefined}
                          />
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
