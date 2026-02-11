'use client';

import { useMemo, useState } from 'react';

import type { Participant, ScoringDocumentV1 } from '../../../lib/scoring-model';
import { createEmptyScoringDocumentV1 } from '../../../lib/scoring-model';
import { emptyGameResult, OPTIONAL_4TH_5TH_POINTS, recomputeDocumentDerivedFields } from '../../../lib/scoring-rules';

const LS_DRAFT_PREFIX = 'bstri:scoring:draft:';
const LS_PUBLISHED_PREFIX = 'bstri:scoring:published:';

function slugify(s: string) {
  return s
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function makeNewDoc(params: { eventId: string; year: number; participants: Participant[] }): ScoringDocumentV1 {
  const base = createEmptyScoringDocumentV1({
    eventId: params.eventId,
    year: params.year,
    status: 'draft',
    participants: params.participants
  });

  // Default: enable optional 4th/5th points (can be made configurable later).
  return recomputeDocumentDerivedFields({
    doc: base,
    pointsSchedule: { ...OPTIONAL_4TH_5TH_POINTS, first: 3, second: 2, third: 1 }
  });
}

function loadDoc(key: string): ScoringDocumentV1 | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as ScoringDocumentV1;
  } catch {
    return null;
  }
}

function saveDoc(key: string, doc: ScoringDocumentV1) {
  localStorage.setItem(key, JSON.stringify(doc, null, 2));
}

export default function AdminScoringClient() {
  const [eventId, setEventId] = useState('triathlon-2026');
  const [year, setYear] = useState(2026);
  const [participantName, setParticipantName] = useState('');
  const [doc, setDoc] = useState<ScoringDocumentV1>(() => makeNewDoc({ eventId: 'triathlon-2026', year: 2026, participants: [] }));

  const draftKey = useMemo(() => `${LS_DRAFT_PREFIX}${eventId}`, [eventId]);
  const publishedKey = useMemo(() => `${LS_PUBLISHED_PREFIX}${eventId}`, [eventId]);

  function onNewDoc() {
    setDoc(makeNewDoc({ eventId, year, participants: [] }));
  }

  function onLoadDraft() {
    const loaded = loadDoc(draftKey);
    if (loaded) setDoc(loaded);
  }

  function onSaveDraft() {
    const next = { ...doc, status: 'draft' as const, updatedAt: new Date().toISOString() };
    saveDoc(draftKey, next);
    setDoc(next);
  }

  function onPublish() {
    const now = new Date().toISOString();
    const published: ScoringDocumentV1 = {
      ...doc,
      status: 'published',
      updatedAt: now,
      publishedAt: now
    };
    saveDoc(publishedKey, published);
    setDoc(published);
  }

  function addParticipant() {
    const displayName = participantName.trim();
    if (!displayName) return;

    const personId = slugify(displayName);
    const participants = [...doc.participants, { personId, displayName }];

    const next = recomputeDocumentDerivedFields({
      doc: { ...doc, participants },
      pointsSchedule: { ...OPTIONAL_4TH_5TH_POINTS, first: 3, second: 2, third: 1 }
    });

    setDoc(next);
    setParticipantName('');
  }

  function setRaw(gameId: string, personId: string, raw: number | null) {
    const subEvents = doc.subEvents.map((se) => {
      const games = se.games.map((g) => {
        if (g.gameId !== gameId) return g;
        const prev = g.results[personId] ?? emptyGameResult();
        return {
          ...g,
          results: {
            ...g.results,
            [personId]: { ...prev, raw }
          }
        };
      }) as typeof se.games;
      return { ...se, games };
    }) as ScoringDocumentV1['subEvents'];

    const next = recomputeDocumentDerivedFields({
      doc: { ...doc, subEvents },
      pointsSchedule: { ...OPTIONAL_4TH_5TH_POINTS, first: 3, second: 2, third: 1 }
    });

    setDoc(next);
  }

  function setPlace(gameId: string, personId: string, place: number | null) {
    const subEvents = doc.subEvents.map((se) => {
      const games = se.games.map((g) => {
        if (g.gameId !== gameId) return g;
        const prev = g.results[personId] ?? emptyGameResult();
        return {
          ...g,
          results: {
            ...g.results,
            [personId]: { ...prev, place }
          }
        };
      }) as typeof se.games;
      return { ...se, games };
    }) as ScoringDocumentV1['subEvents'];

    const next = recomputeDocumentDerivedFields({
      doc: { ...doc, subEvents },
      pointsSchedule: { ...OPTIONAL_4TH_5TH_POINTS, first: 3, second: 2, third: 1 }
    });

    setDoc(next);
  }

  const participants = doc.participants;

  return (
    <div style={{ padding: 16 }}>
      <h1 className="panelTitle">Admin Scoring (Local Mock)</h1>
      <p className="kicker">This page currently stores draft/published docs in localStorage (no auth/AWS yet).</p>

      <div className="card" style={{ display: 'grid', gap: 10 }}>
        <label>
          Event ID{' '}
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

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={onNewDoc}>New draft</button>
          <button onClick={onLoadDraft}>Load draft</button>
          <button onClick={onSaveDraft}>Save draft</button>
          <button onClick={onPublish}>Publish</button>
        </div>

        <div style={{ fontSize: 12, opacity: 0.85 }}>
          <div>Draft key: <code>{draftKey}</code></div>
          <div>Published key: <code>{publishedKey}</code></div>
        </div>
      </div>

      <h2 style={{ marginTop: 18 }}>Participants</h2>
      <div className="card" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          placeholder="Add participant name"
          value={participantName}
          onChange={(e) => setParticipantName(e.target.value)}
        />
        <button onClick={addParticipant}>Add</button>
        <div style={{ marginLeft: 'auto', fontSize: 12, opacity: 0.85 }}>Count: {participants.length}</div>
      </div>

      <h2 style={{ marginTop: 18 }}>Bowling (raw score → place/points)</h2>
      {doc.subEvents
        .find((x) => x.subEventId === 'bowling')
        ?.games.map((g) => (
          <section key={g.gameId} style={{ marginTop: 12 }}>
            <h3 style={{ margin: '0 0 8px' }}>{g.label}</h3>
            <div className="card">
              <table className="table">
                <thead>
                  <tr>
                    <th>Participant</th>
                    <th style={{ width: 140 }}>Raw</th>
                    <th style={{ width: 90 }}>Place</th>
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
                            value={r.raw ?? ''}
                            onChange={(e) => setRaw(g.gameId, p.personId, e.target.value === '' ? null : Number(e.target.value))}
                          />
                        </td>
                        <td>{r.place ?? '-'}</td>
                        <td>{r.points ?? '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        ))}

      <h2 style={{ marginTop: 18 }}>Darts (enter place → points)</h2>
      {doc.subEvents
        .find((x) => x.subEventId === 'darts')
        ?.games.map((g) => (
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
                            onChange={(e) =>
                              setPlace(g.gameId, p.personId, e.target.value === '' ? null : Number(e.target.value))
                            }
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

      <h2 style={{ marginTop: 18 }}>Totals Preview</h2>
      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Participant</th>
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

      <h2 style={{ marginTop: 18 }}>Raw JSON (current doc)</h2>
      <div className="card" style={{ overflowX: 'auto' }}>
        <pre style={{ margin: 0, fontSize: 12 }}>{JSON.stringify(doc, null, 2)}</pre>
      </div>
    </div>
  );
}
