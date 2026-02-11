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

      {darts?.games.map((g) => (
        <section key={g.gameId} style={{ marginTop: 12 }}>
          <h3 style={{ margin: '0 0 8px' }}>{g.label}</h3>
          <div className="card">
            <table className="table">
              <thead>
                <tr>
                  <th>Participant</th>
                  <th style={{ width: 140 }}>Place</th>
                  <th style={{ width: 90 }}>Points</th>
                </tr>
              </thead>
              <tbody>
                {participants.map((p) => {
                  const r = g.results[p.personId] ?? emptyGameResult();
                  return (
                    <tr key={p.personId}>
                      <td>{p.displayName}</td>
                      <td>
                        <input
                          type="number"
                          value={r.place ?? ''}
                          onChange={(e) => setPlace(g.gameId, p.personId, e.target.value === '' ? null : Number(e.target.value))}
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
      ))}
    </div>
  );
}
