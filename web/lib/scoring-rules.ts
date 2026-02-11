import type {
  Game,
  GameId,
  GameResult,
  ScoringDocumentV1,
  SubEventId,
  Totals,
  TieBreak,
  TieBreakType
} from './scoring-model';

export type PointsSchedule = {
  first: number;
  second: number;
  third: number;
  fourth?: number;
  fifth?: number;
};

export const DEFAULT_POINTS: PointsSchedule = {
  first: 3,
  second: 2,
  third: 1
};

export const OPTIONAL_4TH_5TH_POINTS: Pick<PointsSchedule, 'fourth' | 'fifth'> = {
  fourth: 0.5,
  fifth: 0.25
};

export function pointsForPlace(place: number, schedule: PointsSchedule): number {
  if (place === 1) return schedule.first;
  if (place === 2) return schedule.second;
  if (place === 3) return schedule.third;
  if (place === 4 && schedule.fourth != null) return schedule.fourth;
  if (place === 5 && schedule.fifth != null) return schedule.fifth;
  return 0;
}

export function computePlacesFromRawDescending(params: {
  byPerson: Record<string, { raw: number | null }>;
}): Record<string, number | null> {
  const entries = Object.entries(params.byPerson)
    .filter(([, v]) => typeof v.raw === 'number')
    .map(([personId, v]) => ({ personId, raw: v.raw as number }));

  entries.sort((a, b) => b.raw - a.raw);

  const places: Record<string, number | null> = Object.fromEntries(
    Object.keys(params.byPerson).map((pid) => [pid, null])
  );

  // NOTE: ties produce null placings; admin must resolve via tieBreak + explicit place.
  let place = 1;
  for (let i = 0; i < entries.length; ) {
    const score = entries[i].raw;
    const tied = [entries[i]];
    i++;
    while (i < entries.length && entries[i].raw === score) {
      tied.push(entries[i]);
      i++;
    }

    if (tied.length === 1) {
      places[tied[0].personId] = place;
    } else {
      for (const t of tied) places[t.personId] = null;
    }

    place += tied.length;
  }

  return places;
}

export function applyPlacesAndPointsToGame(params: {
  game: Game;
  places: Record<string, number | null>;
  pointsSchedule: PointsSchedule;
}): Game {
  const results: Game['results'] = { ...params.game.results };

  for (const [personId, prev] of Object.entries(results)) {
    const place = params.places[personId] ?? null;
    const points = place != null ? pointsForPlace(place, params.pointsSchedule) : null;
    results[personId] = { ...prev, place, points };
  }

  return { ...params.game, results };
}

export function computeBowlingGameFromRaw(params: {
  game: Game;
  pointsSchedule: PointsSchedule;
}): Game {
  const places = computePlacesFromRawDescending({
    byPerson: Object.fromEntries(Object.entries(params.game.results).map(([k, v]) => [k, { raw: v.raw }]))
  });

  return applyPlacesAndPointsToGame({ game: params.game, places, pointsSchedule: params.pointsSchedule });
}

export function computePoolRunOfficialRawFromAttempts(attempts: number[] | null): number | null {
  if (!attempts || attempts.length === 0) return null;
  return Math.max(...attempts);
}

export function ensurePoolRunRawFromAttempts(game: Game): Game {
  if (game.gameId !== 'pool-3') return game;

  const results: Game['results'] = { ...game.results };
  for (const [personId, r] of Object.entries(results)) {
    const raw = r.raw ?? computePoolRunOfficialRawFromAttempts(r.attempts);
    results[personId] = { ...r, raw };
  }

  return { ...game, results };
}

export function validateTieBreak(tb: TieBreak | null): string[] {
  if (!tb) return [];
  const errors: string[] = [];
  if (!tb.type) errors.push('tieBreak.type is required');
  if (!tb.winner) errors.push('tieBreak.winner is required');
  if (!Array.isArray(tb.participants) || tb.participants.length < 2) {
    errors.push('tieBreak.participants must include at least 2 participants');
  }
  return errors;
}

export function tieBreakTypeForGame(gameId: GameId): TieBreakType {
  if (gameId.startsWith('bowling-')) return 'BOWLING_ROLL_OFF';
  if (gameId.startsWith('darts-')) return 'DARTS_BULL_SHOOTOUT';
  if (gameId === 'pool-3') return 'POOL_RUN_REPEAT';
  return 'OTHER';
}

export function computeTotalsFromPoints(doc: ScoringDocumentV1): Totals {
  const byPerson: Totals['byPerson'] = Object.fromEntries(
    doc.participants.map((p) => [p.personId, { bySubEvent: { bowling: 0, pool: 0, darts: 0 }, triathlon: 0 }])
  );

  for (const subEvent of doc.subEvents) {
    for (const game of subEvent.games) {
      for (const [personId, r] of Object.entries(game.results)) {
        const pts = r.points;
        if (typeof pts !== 'number') continue;
        if (!byPerson[personId]) continue;
        byPerson[personId].bySubEvent[subEvent.subEventId] += pts;
      }
    }
  }

  for (const [personId, v] of Object.entries(byPerson)) {
    v.triathlon = v.bySubEvent.bowling + v.bySubEvent.pool + v.bySubEvent.darts;
    byPerson[personId] = v;
  }

  return { byPerson };
}

export function recomputeDocumentDerivedFields(params: {
  doc: ScoringDocumentV1;
  pointsSchedule?: PointsSchedule;
}): ScoringDocumentV1 {
  const pointsSchedule = params.pointsSchedule ?? DEFAULT_POINTS;

  const subEvents = params.doc.subEvents.map((se) => {
    const games = se.games.map((g) => {
      // Raw-based ranking games
      if (g.gameId.startsWith('bowling-') || g.gameId.startsWith('pool-')) {
        const withRaw = g.gameId === 'pool-3' ? ensurePoolRunRawFromAttempts(g) : g;

        const rawCounts = new Map<number, number>();
        for (const r of Object.values(withRaw.results)) {
          if (typeof r.raw !== 'number') continue;
          rawCounts.set(r.raw, (rawCounts.get(r.raw) ?? 0) + 1);
        }

        const places = computePlacesFromRawDescending({
          byPerson: Object.fromEntries(Object.entries(withRaw.results).map(([k, v]) => [k, { raw: v.raw }]))
        });

        const results: Game['results'] = { ...withRaw.results };
        for (const [personId, prev] of Object.entries(results)) {
          const raw = prev.raw;
          const isTie = typeof raw === 'number' && (rawCounts.get(raw) ?? 0) > 1;
          const computedPlace = places[personId] ?? null;

          const place = raw == null ? null : isTie ? (prev.place ?? null) : computedPlace;
          const points = place != null ? pointsForPlace(place, pointsSchedule) : null;
          results[personId] = { ...prev, place, points };
        }

        return { ...withRaw, results };
      }

      // Place-entered games (darts)
      const results: Game['results'] = { ...g.results };
      for (const [personId, r] of Object.entries(results)) {
        const points = r.place != null ? pointsForPlace(r.place, pointsSchedule) : null;
        results[personId] = { ...r, points };
      }
      return { ...g, results };
    }) as typeof se.games;

    return { ...se, games };
  }) as ScoringDocumentV1['subEvents'];

  const next: ScoringDocumentV1 = { ...params.doc, subEvents };
  return { ...next, totals: computeTotalsFromPoints(next) };
}

export function emptyGameResult(): GameResult {
  return { place: null, raw: null, points: null, attempts: null, tieBreak: null };
}
