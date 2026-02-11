'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';

import type { EventMeta, Participant, PoolMatchResult, ScoringDocumentV1 } from '../../../lib/scoring-model';
import { createEmptyScoringDocumentV1 } from '../../../lib/scoring-model';
import { emptyGameResult, OPTIONAL_4TH_5TH_POINTS, recomputeDocumentDerivedFields } from '../../../lib/scoring-rules';

const LS_DRAFT_PREFIX = 'bstri:scoring:draft:';
const LS_PUBLISHED_PREFIX = 'bstri:scoring:published:';

const DEFAULT_POINTS_SCHEDULE = { ...OPTIONAL_4TH_5TH_POINTS, first: 3, second: 2, third: 1 };

function makeNewDoc(params: {
  eventId: string;
  year: number;
  participants: Participant[];
  updatedAt?: string;
}): ScoringDocumentV1 {
  const base = createEmptyScoringDocumentV1({
    eventId: params.eventId,
    year: params.year,
    status: 'draft',
    participants: params.participants,
    updatedAt: params.updatedAt
  });

  return recomputeDocumentDerivedFields({ doc: base, pointsSchedule: DEFAULT_POINTS_SCHEDULE });
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

type ScoringCtx = {
  eventId: string;
  year: number;
  doc: ScoringDocumentV1;
  draftKey: string;
  publishedKey: string;

  setEventId: (eventId: string) => void;
  setYear: (year: number) => void;

  onNewDoc: () => void;
  onLoadDraft: () => void;
  onSaveDraft: () => void;
  onPublish: () => void;
  importDoc: (doc: ScoringDocumentV1) => void;

  addParticipant: (p: Participant) => void;
  updateParticipantDisplayName: (personId: string, displayName: string) => void;
  deleteParticipant: (personId: string) => void;

  setEventMeta: (eventMeta: EventMeta | null) => void;
  setPoolMatches: (poolMatches: PoolMatchResult[]) => void;
  upsertPoolMatch: (match: PoolMatchResult) => void;
  removePoolMatch: (params: { round: number; a: string; b: string }) => void;

  setRaw: (gameId: string, personId: string, raw: number | null) => void;
  setPlace: (gameId: string, personId: string, place: number | null) => void;
  setAttempts: (gameId: string, personId: string, attempts: number[] | null) => void;
};

const Ctx = createContext<ScoringCtx | null>(null);

export function useScoring() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useScoring must be used within <ScoringProvider>');
  return v;
}

export function ScoringProvider(props: { children: React.ReactNode }) {
  const [eventId, setEventIdState] = useState('triathlon-2026');
  const [year, setYearState] = useState(2026);

  // Avoid hydration mismatches: deterministic initial doc during SSR.
  const [doc, setDoc] = useState<ScoringDocumentV1>(() =>
    makeNewDoc({ eventId: 'triathlon-2026', year: 2026, participants: [], updatedAt: '1970-01-01T00:00:00.000Z' })
  );

  const draftKey = useMemo(() => `${LS_DRAFT_PREFIX}${eventId}`, [eventId]);
  const publishedKey = useMemo(() => `${LS_PUBLISHED_PREFIX}${eventId}`, [eventId]);

  useEffect(() => {
    const loaded = loadDoc(draftKey);
    if (loaded) {
      const next = recomputeDocumentDerivedFields({ doc: loaded, pointsSchedule: DEFAULT_POINTS_SCHEDULE });
      setDoc(next);
      setYearState(next.year);
      return;
    }

    setDoc(makeNewDoc({ eventId, year, participants: [] }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKey]);

  function setEventId(next: string) {
    setEventIdState(next);
  }

  function setYear(next: number) {
    setYearState(next);
    setDoc((prev) => ({ ...prev, year: next }));
  }

  function onNewDoc() {
    setDoc(makeNewDoc({ eventId, year, participants: [] }));
  }

  function onLoadDraft() {
    const loaded = loadDoc(draftKey);
    if (loaded) setDoc(recomputeDocumentDerivedFields({ doc: loaded, pointsSchedule: DEFAULT_POINTS_SCHEDULE }));
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

  function addParticipant(p: Participant) {
    const participants = [...doc.participants, p];
    const next = recomputeDocumentDerivedFields({
      doc: { ...doc, participants },
      pointsSchedule: DEFAULT_POINTS_SCHEDULE
    });
    setDoc(next);
  }

  function updateParticipantDisplayName(personId: string, displayName: string) {
    const participants = doc.participants.map((p) => (p.personId === personId ? { ...p, displayName } : p));
    setDoc({ ...doc, participants });
  }

  function deleteParticipant(personId: string) {
    const participants = doc.participants.filter((p) => p.personId !== personId);

    const subEvents = doc.subEvents.map((se) => {
      const games = se.games.map((g) => {
        const { [personId]: _, ...rest } = g.results;
        return { ...g, results: rest };
      }) as typeof se.games;
      return { ...se, games };
    }) as ScoringDocumentV1['subEvents'];

    const poolMatches = doc.poolMatches.filter(
      (m) => m.a !== personId && m.b !== personId && m.winner8Ball !== personId && m.winner9Ball !== personId
    );

    const eventMeta =
      doc.eventMeta == null
        ? null
        : {
            ...doc.eventMeta,
            competitorOrder: doc.eventMeta.competitorOrder.filter((pid) => pid !== personId),
            poolSchedule: { rounds: [] }
          };

    const next = recomputeDocumentDerivedFields({
      doc: { ...doc, participants, subEvents, poolMatches, eventMeta },
      pointsSchedule: DEFAULT_POINTS_SCHEDULE
    });

    setDoc(next);
  }

  function setRaw(gameId: string, personId: string, raw: number | null) {
    const subEvents = doc.subEvents.map((se) => {
      const games = se.games.map((g) => {
        if (g.gameId !== gameId) return g;
        const prev = g.results[personId] ?? emptyGameResult();
        return { ...g, results: { ...g.results, [personId]: { ...prev, raw } } };
      }) as typeof se.games;
      return { ...se, games };
    }) as ScoringDocumentV1['subEvents'];

    const next = recomputeDocumentDerivedFields({
      doc: { ...doc, subEvents },
      pointsSchedule: DEFAULT_POINTS_SCHEDULE
    });

    setDoc(next);
  }

  function setEventMeta(eventMeta: EventMeta | null) {
    setDoc((prev) =>
      recomputeDocumentDerivedFields({
        doc: { ...prev, eventMeta },
        pointsSchedule: DEFAULT_POINTS_SCHEDULE
      })
    );
  }

  function setPoolMatches(poolMatches: PoolMatchResult[]) {
    setDoc((prev) =>
      recomputeDocumentDerivedFields({
        doc: { ...prev, poolMatches },
        pointsSchedule: DEFAULT_POINTS_SCHEDULE
      })
    );
  }

  function upsertPoolMatch(match: PoolMatchResult) {
    setDoc((prev) => {
      const poolMatches = [
        ...prev.poolMatches.filter((m) => !(m.round === match.round && m.a === match.a && m.b === match.b)),
        match
      ];

      return recomputeDocumentDerivedFields({
        doc: { ...prev, poolMatches },
        pointsSchedule: DEFAULT_POINTS_SCHEDULE
      });
    });
  }

  function removePoolMatch(params: { round: number; a: string; b: string }) {
    setDoc((prev) =>
      recomputeDocumentDerivedFields({
        doc: {
          ...prev,
          poolMatches: prev.poolMatches.filter((m) => !(m.round === params.round && m.a === params.a && m.b === params.b))
        },
        pointsSchedule: DEFAULT_POINTS_SCHEDULE
      })
    );
  }

  function setPlace(gameId: string, personId: string, place: number | null) {
    const subEvents = doc.subEvents.map((se) => {
      const games = se.games.map((g) => {
        if (g.gameId !== gameId) return g;
        const prev = g.results[personId] ?? emptyGameResult();
        return { ...g, results: { ...g.results, [personId]: { ...prev, place } } };
      }) as typeof se.games;
      return { ...se, games };
    }) as ScoringDocumentV1['subEvents'];

    const next = recomputeDocumentDerivedFields({
      doc: { ...doc, subEvents },
      pointsSchedule: DEFAULT_POINTS_SCHEDULE
    });

    setDoc(next);
  }

  function setAttempts(gameId: string, personId: string, attempts: number[] | null) {
    const subEvents = doc.subEvents.map((se) => {
      const games = se.games.map((g) => {
        if (g.gameId !== gameId) return g;
        const prev = g.results[personId] ?? emptyGameResult();
        return { ...g, results: { ...g.results, [personId]: { ...prev, attempts, raw: null } } };
      }) as typeof se.games;
      return { ...se, games };
    }) as ScoringDocumentV1['subEvents'];

    const next = recomputeDocumentDerivedFields({
      doc: { ...doc, subEvents },
      pointsSchedule: DEFAULT_POINTS_SCHEDULE
    });

    setDoc(next);
  }

  function importDoc(nextDoc: ScoringDocumentV1) {
    const nextDraftKey = `${LS_DRAFT_PREFIX}${nextDoc.eventId}`;
    const next = recomputeDocumentDerivedFields({ doc: nextDoc, pointsSchedule: DEFAULT_POINTS_SCHEDULE });
    saveDoc(nextDraftKey, next);
    setEventIdState(next.eventId);
    setYearState(next.year);
    setDoc(next);
  }

  return (
    <Ctx.Provider
      value={{
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
        setPoolMatches,
        upsertPoolMatch,
        removePoolMatch,
        setRaw,
        setPlace,
        setAttempts
      }}
    >
      {props.children}
    </Ctx.Provider>
  );
}
