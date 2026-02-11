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
    importDoc,
    addParticipant,
    updateParticipantDisplayName,
    deleteParticipant,
    setEventMeta,
    setPoolMatches
  } = useScoring();

  const [newPersonId, setNewPersonId] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [flash, setFlash] = useState<string | null>(null);

  const participants = doc.participants;

  const baseOrder = doc.eventMeta?.competitorOrder?.length ? doc.eventMeta.competitorOrder : participants.map((p) => p.personId);
  const competitorOrder = [...baseOrder, ...participants.map((p) => p.personId).filter((pid) => !baseOrder.includes(pid))];

  const participantsById = new Map(participants.map((p) => [p.personId, p] as const));
  const orderedParticipants = competitorOrder.map((pid) => participantsById.get(pid)).filter(Boolean);

  function ensureMetaBase() {
    return (
      doc.eventMeta ?? {
        competitorOrder: participants.map((p) => p.personId),
        poolTables: [1, 2],
        poolSchedule: { rounds: [] }
      }
    );
  }

  function hasPoolData() {
    return (doc.eventMeta?.poolSchedule?.rounds?.length ?? 0) > 0 || doc.poolMatches.length > 0;
  }

  function setFlashMsg(msg: string) {
    setFlash(msg);
    setTimeout(() => setFlash(null), 2500);
  }

  function onResetPoolSchedule() {
    if (!hasPoolData()) return;
    if (!confirm('Reset pool schedule and clear ALL pool match results?')) return;
    const base = ensureMetaBase();
    setPoolMatches([]);
    setEventMeta({ ...base, poolSchedule: { rounds: [] } });
    setFlashMsg('Reset pool schedule/matches');
  }

  function setOrder(nextOrder: string[]) {
    if (hasPoolData() && !confirm('Changing competitor order will clear the pool schedule and ALL pool match results. Continue?')) return;
    const base = ensureMetaBase();
    setPoolMatches([]);
    setEventMeta({ ...base, competitorOrder: nextOrder, poolSchedule: { rounds: [] } });
    setFlashMsg('Updated competitor order');
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

  function onAddCompetitor() {
    const personId = newPersonId.trim();
    const displayName = newDisplayName.trim() || personId;
    if (!personId) return;
    const existing = participants.find((p) => p.personId.toLowerCase() === personId.toLowerCase());
    if (existing) {
      setFlashMsg(`Competitor already exists: ${existing.personId}`);
      return;
    }

    if (hasPoolData() && !confirm('Adding a competitor will clear the pool schedule and ALL pool match results. Continue?')) return;

    addParticipant({ personId, displayName });
    setNewPersonId('');
    setNewDisplayName('');
  }

  async function onLoadFixture(url: string, label: string) {
    const res = await fetch(url);
    if (!res.ok) return;
    const raw = (await res.json()) as typeof doc;
    const now = new Date().toISOString();
    importDoc({
      ...raw,
      eventId,
      year,
      status: 'draft',
      updatedAt: now,
      updatedBy: null,
      publishedAt: null,
      publishedBy: null
    });
    setFlash(`Loaded fixture: ${label}`);
    setTimeout(() => setFlash(null), 2500);
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
        <button onClick={onResetPoolSchedule} disabled={!hasPoolData()}>
          Reset pool
        </button>
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
                <th style={{ width: 140 }}>Order</th>
                <th style={{ width: 110 }} />
              </tr>
            </thead>
            <tbody>
              {orderedParticipants.map((p, idx) => (
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
                    <button onClick={() => moveInOrder(p.personId, -1)} disabled={idx === 0}>
                      Up
                    </button>{' '}
                    <button onClick={() => moveInOrder(p.personId, 1)} disabled={idx === competitorOrder.length - 1}>
                      Down
                    </button>
                  </td>
                  <td>
                    <button
                      onClick={() => {
                        if (
                          confirm(
                            `Delete competitor ${p.displayName} (${p.personId})? This will clear the pool schedule and ALL pool match results.`
                          )
                        ) {
                          deleteParticipant(p.personId);
                          setFlashMsg('Deleted competitor');
                        }
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
        <summary>Fixtures (load sample TRI docs)</summary>
        <div className="card" style={{ marginTop: 8, display: 'grid', gap: 8 }}>
          <div style={{ fontSize: 12, opacity: 0.85 }}>
            Loads a sample scoring document (participants + scenarios). This overwrites the current draft.
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={() => void onLoadFixture('/fixtures/scoring/even-6-blank.json', 'Even (6) blank')}>Even (6) blank</button>
            <button onClick={() => void onLoadFixture('/fixtures/scoring/odd-5-blank.json', 'Odd (5) blank')}>Odd (5) blank</button>
            <button onClick={() => void onLoadFixture('/fixtures/scoring/pool-h2h-incomplete.json', 'Pool H2H incomplete')}>Pool H2H incomplete</button>
            <button onClick={() => void onLoadFixture('/fixtures/scoring/pool-h2h-resolves.json', 'Pool H2H resolves')}>Pool H2H resolves</button>
            <button onClick={() => void onLoadFixture('/fixtures/scoring/pool-run-tiebreaker-only.json', 'Pool Run tiebreaker')}>Pool Run tiebreaker</button>
            <button onClick={() => void onLoadFixture('/fixtures/scoring/duplicate-places.json', 'Duplicate places')}>Duplicate places</button>
          </div>
        </div>
      </details>

      <details style={{ marginTop: 12 }}>
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
