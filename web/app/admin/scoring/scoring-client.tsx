'use client';

import { useState } from 'react';

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
    onNewDoc,
    onLoadDraft,
    onSaveDraft,
    onPublish,
    addParticipant,
    updateParticipantDisplayName,
    deleteParticipant
  } = useScoring();

  const [newPersonId, setNewPersonId] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [flash, setFlash] = useState<string | null>(null);

  const participants = doc.participants;

  function onAddCompetitor() {
    const personId = newPersonId.trim();
    const displayName = newDisplayName.trim() || personId;
    if (!personId) return;

    addParticipant({ personId, displayName });
    setNewPersonId('');
    setNewDisplayName('');
  }

  return (
    <div>
      <h2>Setup</h2>

      <div className="card" style={{ display: 'grid', gap: 10 }}>
        <label>
          Triathlon Name{' '}
          <input value={eventId} onChange={(e) => setEventId(e.target.value)} style={{ marginLeft: 8 }} />
        </label>
        <label>
          Year{' '}
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            style={{ marginLeft: 8 }}
          />
        </label>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <button onClick={onNewDoc}>New TRI</button>
          <button onClick={onLoadDraft}>Load TRI</button>
          <button
            onClick={() => {
              onSaveDraft();
              setFlash('Saved');
              setTimeout(() => setFlash(null), 2500);
            }}
          >
            Save TRI
          </button>
          <button
            onClick={() => {
              onPublish();
              setFlash('Published');
              setTimeout(() => setFlash(null), 2500);
            }}
          >
            Publish
          </button>
          {flash && <span style={{ fontSize: 12, color: '#1b5e20' }}>{flash}</span>}
        </div>

        <div style={{ fontSize: 12, opacity: 0.85 }}>
          <div>
            Draft key: <code>{draftKey}</code>
          </div>
          <div>
            Published key: <code>{publishedKey}</code>
          </div>
        </div>
      </div>

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
                <th style={{ width: 110 }} />
              </tr>
            </thead>
            <tbody>
              {participants.map((p, idx) => (
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
                    <button
                      onClick={() => {
                        if (confirm(`Delete competitor ${p.displayName} (${p.personId})?`)) deleteParticipant(p.personId);
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
            {participants.map((p) => {
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
        <summary>Raw JSON (current doc)</summary>
        <div className="card" style={{ overflowX: 'auto', marginTop: 8 }}>
          <pre suppressHydrationWarning style={{ margin: 0, fontSize: 12 }}>
            {JSON.stringify(doc, null, 2)}
          </pre>
        </div>
      </details>
    </div>
  );
}
