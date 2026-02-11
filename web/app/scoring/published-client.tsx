'use client';

import { useMemo, useState } from 'react';

import type { Game, ScoringDocumentV1, SubEvent } from '../../lib/scoring-model';
import { emptyGameResult } from '../../lib/scoring-rules';

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

function GameTable(props: { participants: ScoringDocumentV1['participants']; game: Game; showAttempts?: boolean }) {
  const { participants, game, showAttempts } = props;

  return (
    <div className="card" style={{ marginTop: 10 }}>
      <h4 style={{ margin: '0 0 8px' }}>{game.label}</h4>
      <table className="table">
        <thead>
          <tr>
            <th>Competitor</th>
            {showAttempts && <th style={{ width: 110 }}>Attempt 1</th>}
            {showAttempts && <th style={{ width: 110 }}>Attempt 2</th>}
            {showAttempts && <th style={{ width: 110 }}>Tiebreaker</th>}
            <th style={{ width: 110 }}>Raw</th>
            <th style={{ width: 110 }}>Place</th>
            <th style={{ width: 110 }}>Points</th>
          </tr>
        </thead>
        <tbody>
          {participants.map((p) => {
            const r = game.results[p.personId] ?? emptyGameResult();
            const attempts = r.attempts ?? [0, 0, 0];
            return (
              <tr key={p.personId}>
                <td>{p.displayName}</td>
                {showAttempts && <td>{attempts[0] || '-'}</td>}
                {showAttempts && <td>{attempts[1] || '-'}</td>}
                {showAttempts && <td>{attempts[2] || '-'}</td>}
                <td>{r.raw ?? '-'}</td>
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

function SubEventSection(props: { subEvent: SubEvent; participants: ScoringDocumentV1['participants'] }) {
  const { subEvent, participants } = props;

  return (
    <section style={{ marginTop: 18 }}>
      <h3 style={{ marginBottom: 0 }}>{subEvent.label}</h3>
      {subEvent.games.map((g) => (
        <GameTable key={g.gameId} participants={participants} game={g} showAttempts={subEvent.subEventId === 'pool' && g.gameId === 'pool-3'} />
      ))}
    </section>
  );
}

export default function PublishedScoringClient() {
  const [eventId, setEventId] = useState('triathlon-2026');
  const publishedKey = useMemo(() => `${LS_PUBLISHED_PREFIX}${eventId}`, [eventId]);

  const [doc, setDoc] = useState<ScoringDocumentV1 | null>(null);
  const [error, setError] = useState<string | null>(null);

  function onLoad() {
    const loaded = loadPublishedDoc(publishedKey);
    if (!loaded) {
      setDoc(null);
      setError('No published doc found in localStorage for this Triathlon Name.');
      return;
    }
    setError(null);
    setDoc(loaded);
  }

  return (
    <div style={{ padding: 16 }}>
      <h1 className="panelTitle" style={{ marginBottom: 4 }}>
        Published Results (Local Mock)
      </h1>
      <p className="kicker" style={{ marginTop: 0 }}>
        Loads the published scoring document from localStorage.
      </p>

      <div className="card" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <label>
          Triathlon Name{' '}
          <input value={eventId} onChange={(e) => setEventId(e.target.value)} style={{ marginLeft: 8 }} />
        </label>
        <button onClick={onLoad}>Load Published</button>
        <div style={{ fontSize: 12, opacity: 0.85 }}>
          Key: <code>{publishedKey}</code>
        </div>
      </div>

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
                  <th>Competitor</th>
                  <th style={{ width: 90 }}>Bowling</th>
                  <th style={{ width: 90 }}>Pool</th>
                  <th style={{ width: 90 }}>Darts</th>
                  <th style={{ width: 110 }}>Triathlon</th>
                </tr>
              </thead>
              <tbody>
                {[...doc.participants]
                  .map((p) => ({ p, t: doc.totals.byPerson[p.personId] }))
                  .sort((a, b) => (b.t?.triathlon ?? 0) - (a.t?.triathlon ?? 0))
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
            <SubEventSection key={se.subEventId} subEvent={se} participants={doc.participants} />
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
