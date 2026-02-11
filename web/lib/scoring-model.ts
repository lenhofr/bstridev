export type ScoringStatus = 'draft' | 'published';

export type SubEventId = 'bowling' | 'pool' | 'darts';

export type GameId =
  | 'bowling-1'
  | 'bowling-2'
  | 'bowling-3'
  | 'pool-1'
  | 'pool-2'
  | 'pool-3'
  | 'darts-1'
  | 'darts-2'
  | 'darts-3';

export const CANONICAL_SUB_EVENT_ORDER: SubEventId[] = ['bowling', 'pool', 'darts'];

export const CANONICAL_GAME_IDS: Record<SubEventId, [GameId, GameId, GameId]> = {
  bowling: ['bowling-1', 'bowling-2', 'bowling-3'],
  pool: ['pool-1', 'pool-2', 'pool-3'],
  darts: ['darts-1', 'darts-2', 'darts-3']
};

export type PersonId = string;

export type AdminIdentity = {
  userId: string;
  displayName: string | null;
};

export type TieBreakType = 'BOWLING_ROLL_OFF' | 'DARTS_BULL_SHOOTOUT' | 'POOL_RUN_REPEAT' | 'OTHER';

export type TieBreak = {
  type: TieBreakType;
  participants: PersonId[];
  winner: PersonId;
  notes: string | null;
};

export type GameResult = {
  place: number | null;
  raw: number | null;
  points: number | null;
  attempts: number[] | null;
  tieBreak: TieBreak | null;
};

export type Game = {
  gameId: GameId;
  label: string;
  results: Record<PersonId, GameResult>;
};

export type SubEvent = {
  subEventId: SubEventId;
  label: string;
  games: [Game, Game, Game];
};

export type Participant = {
  personId: PersonId;
  displayName: string;
};

export type PoolScheduledMatch = {
  a: PersonId;
  b: PersonId;
  table: number;
};

export type PoolScheduleRound = {
  round: number;
  bye: PersonId | null;
  matches: PoolScheduledMatch[];
};

export type PoolSchedule = {
  rounds: PoolScheduleRound[];
};

export type EventMeta = {
  competitorOrder: PersonId[];
  poolTables: number[];
  poolSchedule: PoolSchedule;
};

export type PoolMatchResult = {
  round: number;
  a: PersonId;
  b: PersonId;
  table: number;
  winner8Ball: PersonId;
  winner9Ball: PersonId;
};

export type Totals = {
  byPerson: Record<
    PersonId,
    {
      bySubEvent: Record<SubEventId, number>;
      triathlon: number;
    }
  >;
};

export type ScoringDocumentV1 = {
  schemaVersion: 1;
  eventId: string;
  year: number;
  status: ScoringStatus;
  updatedAt: string;
  updatedBy: AdminIdentity | null;
  publishedAt: string | null;
  publishedBy: AdminIdentity | null;
  eventMeta: EventMeta | null;
  participants: Participant[];
  poolMatches: PoolMatchResult[];
  subEvents: [SubEvent, SubEvent, SubEvent];
  totals: Totals;

  // If missing (legacy docs), all games are treated as finalized.
  finalizedGames?: Partial<Record<GameId, boolean>>;
};

export function createEmptyScoringDocumentV1(params: {
  eventId: string;
  year: number;
  status: ScoringStatus;
  participants: Participant[];
  eventMeta?: EventMeta | null;
  updatedAt?: string;
  updatedBy?: AdminIdentity | null;
}): ScoringDocumentV1 {
  const updatedAt = params.updatedAt ?? new Date().toISOString();

  const byPerson: Totals['byPerson'] = Object.fromEntries(
    params.participants.map((p) => [
      p.personId,
      { bySubEvent: { bowling: 0, pool: 0, darts: 0 }, triathlon: 0 }
    ])
  );

  return {
    schemaVersion: 1,
    eventId: params.eventId,
    year: params.year,
    status: params.status,
    updatedAt,
    updatedBy: params.updatedBy ?? null,
    publishedAt: params.status === 'published' ? updatedAt : null,
    publishedBy: params.status === 'published' ? (params.updatedBy ?? null) : null,
    eventMeta: params.eventMeta ?? null,
    participants: params.participants,
    poolMatches: [],
    subEvents: [
      {
        subEventId: 'bowling',
        label: 'Bowling',
        games: [
          { gameId: 'bowling-1', label: 'Bowling Game #1', results: {} },
          { gameId: 'bowling-2', label: 'Bowling Game #2', results: {} },
          { gameId: 'bowling-3', label: 'Bowling Game #3', results: {} }
        ]
      },
      {
        subEventId: 'pool',
        label: 'Pool',
        games: [
          { gameId: 'pool-1', label: '8 Ball', results: {} },
          { gameId: 'pool-2', label: '9 Ball', results: {} },
          { gameId: 'pool-3', label: 'Run', results: {} }
        ]
      },
      {
        subEventId: 'darts',
        label: 'Darts',
        games: [
          { gameId: 'darts-1', label: 'Cricket', results: {} },
          { gameId: 'darts-2', label: '401 Double Out', results: {} },
          { gameId: 'darts-3', label: '301 Double In/Out', results: {} }
        ]
      }
    ],
    totals: { byPerson },
    finalizedGames: {}
  };
}
