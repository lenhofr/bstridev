import type {
  Game,
  GameId,
  GameResult,
  PersonId,
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
  const a1 = attempts[0] ?? 0;
  const a2 = attempts[1] ?? 0;
  const mx = Math.max(a1, a2);
  return mx > 0 ? mx : null;
}

function computePoolRunTieBreakRawFromAttempts(attempts: number[] | null): number | null {
  if (!attempts || attempts.length < 3) return null;
  const v = attempts[2] ?? 0;
  return v > 0 ? v : null;
}

function computePoolRunPlacesFromAttempts(game: Game): {
  places: Record<PersonId, number | null>;
  needsManual: Set<PersonId>;
} {
  const people = Object.entries(game.results)
    .map(([personId, r]) => {
      const raw = r.raw;
      const tieBreakRaw = computePoolRunTieBreakRawFromAttempts(r.attempts);
      return { personId, raw, tieBreakRaw };
    })
    .filter((x) => typeof x.raw === 'number') as Array<{ personId: PersonId; raw: number; tieBreakRaw: number | null }>;

  const groups = new Map<number, Array<{ personId: PersonId; tieBreakRaw: number | null }>>();
  for (const p of people) {
    groups.set(p.raw, [...(groups.get(p.raw) ?? []), { personId: p.personId, tieBreakRaw: p.tieBreakRaw }]);
  }

  const places: Record<PersonId, number | null> = {};
  const needsManual = new Set<PersonId>();

  const rawVals = [...groups.keys()].sort((a, b) => b - a);
  let nextPlace = 1;

  for (const raw of rawVals) {
    const group = groups.get(raw) ?? [];

    if (group.length === 1) {
      places[group[0]!.personId] = nextPlace;
      nextPlace += 1;
      continue;
    }

    // Tiebreaker runs only break ties *within* the tied group. They cannot surpass higher base raw.
    const anyMissingExtra = group.some((x) => x.tieBreakRaw == null);
    if (anyMissingExtra) {
      for (const x of group) {
        places[x.personId] = null;
        needsManual.add(x.personId);
      }
      nextPlace += group.length;
      continue;
    }

    const byExtra = new Map<number, PersonId[]>();
    for (const x of group) {
      const v = x.tieBreakRaw as number;
      byExtra.set(v, [...(byExtra.get(v) ?? []), x.personId]);
    }

    const extraVals = [...byExtra.keys()].sort((a, b) => b - a);
    for (const extra of extraVals) {
      const sub = byExtra.get(extra) ?? [];
      if (sub.length === 1) {
        places[sub[0]!] = nextPlace;
      } else {
        for (const pid of sub) {
          places[pid] = null;
          needsManual.add(pid);
        }
      }
      nextPlace += sub.length;
    }
  }

  return { places, needsManual };
}

export function ensurePoolRunRawFromAttempts(game: Game): Game {
  if (game.gameId !== 'pool-3') return game;

  const results: Game['results'] = { ...game.results };
  for (const [personId, r] of Object.entries(results)) {
    const computed = computePoolRunOfficialRawFromAttempts(r.attempts);
    const raw = computed ?? r.raw;
    results[personId] = { ...r, raw };
  }

  return { ...game, results };
}

function ensurePoolMatchWinsRaw(params: {
  doc: ScoringDocumentV1;
  game: Game;
  winnerKey: 'winner8Ball' | 'winner9Ball';
}): Game {
  const wins: Record<string, number> = Object.fromEntries(params.doc.participants.map((p) => [p.personId, 0]));

  for (const m of params.doc.poolMatches) {
    const winner = m[params.winnerKey];
    if (wins[winner] != null) wins[winner] += 1;
  }

  // Byes count as wins.
  for (const r of params.doc.eventMeta?.poolSchedule?.rounds ?? []) {
    if (r.bye && wins[r.bye] != null) wins[r.bye] += 1;
  }

  const results: Game['results'] = { ...params.game.results };
  for (const p of params.doc.participants) {
    const prev = results[p.personId] ?? emptyGameResult();
    results[p.personId] = { ...prev, raw: wins[p.personId] ?? 0 };
  }

  return { ...params.game, results };
}

function computePoolMatchWinPlacesFromHeadToHead(params: {
  doc: ScoringDocumentV1;
  game: Game;
  winnerKey: 'winner8Ball' | 'winner9Ball';
}): { places: Record<PersonId, number | null>; needsManual: Set<PersonId> } {
  const entries = Object.entries(params.game.results)
    .map(([personId, r]) => ({ personId: personId as PersonId, raw: r.raw }))
    .filter((x) => typeof x.raw === 'number') as Array<{ personId: PersonId; raw: number }>;

  entries.sort((a, b) => b.raw - a.raw);

  const places: Record<PersonId, number | null> = Object.fromEntries(
    Object.keys(params.game.results).map((pid) => [pid, null])
  ) as Record<PersonId, number | null>;

  const needsManual = new Set<PersonId>();

  let nextPlace = 1;
  for (let i = 0; i < entries.length; ) {
    const wins = entries[i]!.raw;
    const tied: PersonId[] = [entries[i]!.personId];
    i++;
    while (i < entries.length && entries[i]!.raw === wins) {
      tied.push(entries[i]!.personId);
      i++;
    }

    if (tied.length === 1) {
      places[tied[0]!] = nextPlace;
      nextPlace += 1;
      continue;
    }

    // Break ties within the tied group using head-to-head results (mini-league wins).
    const tiedSet = new Set(tied);

    const expectedMatches = (tied.length * (tied.length - 1)) / 2;
    const headToHeadMatches = params.doc.poolMatches.filter(
      (m) => tiedSet.has(m.a) && tiedSet.has(m.b) && m[params.winnerKey] != null
    );

    // If we don't have all head-to-head match results yet, don't guess.
    if (headToHeadMatches.length < expectedMatches) {
      for (const pid of tied) {
        places[pid] = null;
        needsManual.add(pid);
      }
      nextPlace += tied.length;
      continue;
    }

    const h2hWins: Record<PersonId, number> = Object.fromEntries(tied.map((pid) => [pid, 0])) as Record<PersonId, number>;
    for (const m of headToHeadMatches) {
      const winner = m[params.winnerKey];
      if (h2hWins[winner] != null) h2hWins[winner] += 1;
    }

    const ordered = tied
      .map((pid, stableIdx) => ({ pid, stableIdx, w: h2hWins[pid] ?? 0 }))
      .sort((a, b) => b.w - a.w || a.stableIdx - b.stableIdx);

    for (let j = 0; j < ordered.length; ) {
      const w = ordered[j]!.w;
      const group: PersonId[] = [ordered[j]!.pid];
      j++;
      while (j < ordered.length && ordered[j]!.w === w) {
        group.push(ordered[j]!.pid);
        j++;
      }

      if (group.length === 1) {
        places[group[0]!] = nextPlace;
      } else {
        for (const pid of group) {
          places[pid] = null;
          needsManual.add(pid);
        }
      }
      nextPlace += group.length;
    }
  }

  return { places, needsManual };
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

function isGameFinalized(doc: ScoringDocumentV1, gameId: GameId): boolean {
  // Legacy docs (no finalizedGames field) behave like today: all games are finalized.
  if (!Object.prototype.hasOwnProperty.call(doc, 'finalizedGames')) return true;
  return Boolean(doc.finalizedGames?.[gameId]);
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
        const withRaw =
          g.gameId === 'pool-3'
            ? ensurePoolRunRawFromAttempts(g)
            : g.gameId === 'pool-1'
              ? ensurePoolMatchWinsRaw({ doc: params.doc, game: g, winnerKey: 'winner8Ball' })
              : g.gameId === 'pool-2'
                ? ensurePoolMatchWinsRaw({ doc: params.doc, game: g, winnerKey: 'winner9Ball' })
                : g;

        const rawCounts = new Map<number, number>();
        for (const r of Object.values(withRaw.results)) {
          if (typeof r.raw !== 'number') continue;
          rawCounts.set(r.raw, (rawCounts.get(r.raw) ?? 0) + 1);
        }

        const poolRun = withRaw.gameId === 'pool-3' ? computePoolRunPlacesFromAttempts(withRaw) : null;
        const poolWins =
          withRaw.gameId === 'pool-1'
            ? computePoolMatchWinPlacesFromHeadToHead({ doc: params.doc, game: withRaw, winnerKey: 'winner8Ball' })
            : withRaw.gameId === 'pool-2'
              ? computePoolMatchWinPlacesFromHeadToHead({ doc: params.doc, game: withRaw, winnerKey: 'winner9Ball' })
              : null;

        const poolWinnerKey =
          withRaw.gameId === 'pool-1' ? ('winner8Ball' as const) : withRaw.gameId === 'pool-2' ? ('winner9Ball' as const) : null;
        const scheduledMatchCount = (params.doc.eventMeta?.poolSchedule?.rounds ?? []).reduce((sum, r) => sum + r.matches.length, 0);
        const recordedMatchCount = poolWinnerKey
          ? params.doc.poolMatches.filter((m) => m[poolWinnerKey] != null).length
          : 0;
        const poolInProgress =
          poolWinnerKey != null &&
          scheduledMatchCount > 0 &&
          recordedMatchCount < scheduledMatchCount;

        const places = poolInProgress
          ? (Object.fromEntries(Object.keys(withRaw.results).map((pid) => [pid, null])) as Record<PersonId, number | null>)
          : poolRun?.places ??
            poolWins?.places ??
            computePlacesFromRawDescending({
              byPerson: Object.fromEntries(Object.entries(withRaw.results).map(([k, v]) => [k, { raw: v.raw }]))
            });

        const results: Game['results'] = { ...withRaw.results };

        const nextPlaces: Record<string, number | null> = {};
        for (const [personId, prev] of Object.entries(results)) {
          const raw = prev.raw;
          const manualFromRuns =
            poolRun?.needsManual.has(personId) ??
            poolWins?.needsManual.has(personId) ??
            false;
          const isGenericRawRank = poolRun == null && poolWins == null;
          const needsManual =
            poolInProgress ||
            manualFromRuns ||
            (isGenericRawRank && typeof raw === 'number' && (rawCounts.get(raw) ?? 0) > 1);
          const computedPlace = places[personId] ?? null;
          nextPlaces[personId] = raw == null ? null : needsManual ? (prev.place ?? null) : computedPlace;
        }

        const placeCounts = new Map<number, number>();
        for (const pl of Object.values(nextPlaces)) {
          if (typeof pl !== 'number') continue;
          placeCounts.set(pl, (placeCounts.get(pl) ?? 0) + 1);
        }

        for (const [personId, prev] of Object.entries(results)) {
          const place = nextPlaces[personId] ?? null;
          const isDup = typeof place === 'number' && (placeCounts.get(place) ?? 0) > 1;
          const points = !isDup && place != null ? pointsForPlace(place, pointsSchedule) : null;
          results[personId] = { ...prev, place, points };
        }

        if (!isGameFinalized(params.doc, g.gameId)) {
          for (const [personId, prev] of Object.entries(results)) {
            results[personId] = { ...prev, points: null };
          }
        }

        return { ...withRaw, results };
      }

      // Place-entered games (darts)
      const results: Game['results'] = { ...g.results };

      const placeCounts = new Map<number, number>();
      for (const r of Object.values(results)) {
        if (typeof r.place !== 'number') continue;
        placeCounts.set(r.place, (placeCounts.get(r.place) ?? 0) + 1);
      }

      for (const [personId, r] of Object.entries(results)) {
        const isDup = typeof r.place === 'number' && (placeCounts.get(r.place) ?? 0) > 1;
        const points = !isDup && r.place != null ? pointsForPlace(r.place, pointsSchedule) : null;
        results[personId] = { ...r, points };
      }

      if (!isGameFinalized(params.doc, g.gameId)) {
        for (const [personId, prev] of Object.entries(results)) {
          results[personId] = { ...prev, points: null };
        }
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
