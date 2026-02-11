import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type { ScoringDocumentV1 } from '../lib/scoring-model';
import { OPTIONAL_4TH_5TH_POINTS, emptyGameResult, recomputeDocumentDerivedFields } from '../lib/scoring-rules';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FIXTURES_DIR = path.resolve(__dirname, '../public/fixtures/scoring');
const POINTS_SCHEDULE = { ...OPTIONAL_4TH_5TH_POINTS, first: 3, second: 2, third: 1 };

async function loadFixture(name: string): Promise<ScoringDocumentV1> {
  const p = path.join(FIXTURES_DIR, name);
  const raw = await fs.readFile(p, 'utf8');
  return JSON.parse(raw) as ScoringDocumentV1;
}

function getGame(doc: ScoringDocumentV1, gameId: string) {
  for (const se of doc.subEvents) {
    for (const g of se.games) {
      if (g.gameId === gameId) return g;
    }
  }
  throw new Error(`game not found: ${gameId}`);
}

test('fixture: pool run tiebreaker-only cannot outrank higher official raw', async () => {
  const doc = await loadFixture('pool-run-tiebreaker-only.json');
  const next = recomputeDocumentDerivedFields({ doc, pointsSchedule: POINTS_SCHEDULE });

  const run = getGame(next, 'pool-3');
  assert.equal(run.results.a.raw, 10);
  assert.equal(run.results.b.raw, 9);
  assert.equal(run.results.c.raw, 9);

  assert.equal(run.results.a.place, 1);
  assert.equal(run.results.b.place, 2);
  assert.equal(run.results.c.place, 3);

  assert.equal(run.results.a.points, 3);
  assert.equal(run.results.b.points, 2);
  assert.equal(run.results.c.points, 1);
});

test('fixture: pool head-to-head incomplete stays manual (no guesses)', async () => {
  const doc = await loadFixture('pool-h2h-incomplete.json');
  const next = recomputeDocumentDerivedFields({ doc, pointsSchedule: POINTS_SCHEDULE });

  const game8 = getGame(next, 'pool-1');

  for (const pid of ['a', 'b', 'c', 'd'] as const) {
    assert.equal(game8.results[pid].place, null);
    assert.equal(game8.results[pid].points, null);
  }
});

test('fixture: pool head-to-head resolves 2-way ties when all matches exist', async () => {
  const doc = await loadFixture('pool-h2h-resolves.json');
  const next = recomputeDocumentDerivedFields({ doc, pointsSchedule: POINTS_SCHEDULE });

  const game8 = getGame(next, 'pool-1');

  assert.equal(game8.results.a.raw, 2);
  assert.equal(game8.results.b.raw, 2);
  assert.equal(game8.results.c.raw, 1);
  assert.equal(game8.results.d.raw, 1);

  assert.equal(game8.results.a.place, 1);
  assert.equal(game8.results.b.place, 2);
  assert.equal(game8.results.c.place, 3);
  assert.equal(game8.results.d.place, 4);
});

test('pool: when schedule exists but not all matches are entered, do not award places/points yet', async () => {
  const { createEmptyScoringDocumentV1 } = await import('../lib/scoring-model');
  const { generateRoundRobinSchedule } = await import('../lib/pool-schedule');

  const doc = createEmptyScoringDocumentV1({
    eventId: 'fixture-pool-in-progress',
    year: 2026,
    status: 'draft',
    participants: [
      { personId: 'a', displayName: 'Alpha' },
      { personId: 'b', displayName: 'Bravo' },
      { personId: 'c', displayName: 'Charlie' }
    ],
    eventMeta: {
      competitorOrder: ['a', 'b', 'c'],
      poolTables: [1],
      poolSchedule: generateRoundRobinSchedule({ competitorOrder: ['a', 'b', 'c'], poolTables: [1] })
    }
  });

  // Only one match entered (others still pending)
  doc.poolMatches = [
    { round: 1, a: 'b', b: 'c', table: 1, winner8Ball: 'b', winner9Ball: 'b' }
  ];

  const next = recomputeDocumentDerivedFields({ doc, pointsSchedule: POINTS_SCHEDULE });
  const game8 = getGame(next, 'pool-1');

  // Bye counts as a win, so b has: 1 bye + 1 recorded win.
  assert.equal(game8.results.b.raw, 2);
  // c has: 1 bye + 0 recorded wins.
  assert.equal(game8.results.c.raw, 1);

  for (const pid of ['a', 'b', 'c'] as const) {
    assert.equal(game8.results[pid].place, null);
    assert.equal(game8.results[pid].points, null);
  }
});

test('pool: byes count as wins (but still no places/points until all scheduled matches are entered)', async () => {
  const { createEmptyScoringDocumentV1 } = await import('../lib/scoring-model');
  const { generateRoundRobinSchedule } = await import('../lib/pool-schedule');

  const doc = createEmptyScoringDocumentV1({
    eventId: 'fixture-bye-wins',
    year: 2026,
    status: 'draft',
    participants: [
      { personId: 'a', displayName: 'Alpha' },
      { personId: 'b', displayName: 'Bravo' },
      { personId: 'c', displayName: 'Charlie' }
    ],
    eventMeta: {
      competitorOrder: ['a', 'b', 'c'],
      poolTables: [1],
      poolSchedule: generateRoundRobinSchedule({ competitorOrder: ['a', 'b', 'c'], poolTables: [1] })
    }
  });

  const next = recomputeDocumentDerivedFields({ doc, pointsSchedule: POINTS_SCHEDULE });
  const game8 = getGame(next, 'pool-1');
  const game9 = getGame(next, 'pool-2');

  // Each competitor should have exactly one bye in a 3-person round robin.
  for (const pid of ['a', 'b', 'c'] as const) {
    assert.equal(game8.results[pid].raw, 1);
    assert.equal(game9.results[pid].raw, 1);

    // No actual matches have winners yet => pool is "in progress" => no places/points.
    assert.equal(game8.results[pid].place, null);
    assert.equal(game8.results[pid].points, null);
    assert.equal(game9.results[pid].place, null);
    assert.equal(game9.results[pid].points, null);
  }
});

test('finalize: points are only awarded once a game is marked complete', async () => {
  const { createEmptyScoringDocumentV1 } = await import('../lib/scoring-model');

  const doc = createEmptyScoringDocumentV1({
    eventId: 'fixture-finalize',
    year: 2026,
    status: 'draft',
    participants: [
      { personId: 'a', displayName: 'Alpha' },
      { personId: 'b', displayName: 'Bravo' },
      { personId: 'c', displayName: 'Charlie' }
    ]
  });

  // Enter bowling raw scores
  const bowling = doc.subEvents.find((x) => x.subEventId === 'bowling')!;
  const g1 = bowling.games.find((g) => g.gameId === 'bowling-1')!;
  g1.results = {
    a: { ...emptyGameResult(), raw: 200 },
    b: { ...emptyGameResult(), raw: 150 },
    c: { ...emptyGameResult(), raw: 100 }
  };

  const next1 = recomputeDocumentDerivedFields({ doc, pointsSchedule: POINTS_SCHEDULE });
  const b1 = getGame(next1, 'bowling-1');

  assert.equal(b1.results.a.place, 1);
  assert.equal(b1.results.b.place, 2);
  assert.equal(b1.results.c.place, 3);

  // Not finalized => no points yet
  assert.equal(b1.results.a.points, null);
  assert.equal(b1.results.b.points, null);
  assert.equal(b1.results.c.points, null);

  const next2 = recomputeDocumentDerivedFields({
    doc: { ...doc, finalizedGames: { 'bowling-1': true } },
    pointsSchedule: POINTS_SCHEDULE
  });
  const b1f = getGame(next2, 'bowling-1');

  assert.equal(b1f.results.a.points, 3);
  assert.equal(b1f.results.b.points, 2);
  assert.equal(b1f.results.c.points, 1);
});

test('fixture: duplicate places in darts yield null points for duplicated entries', async () => {
  const doc = await loadFixture('duplicate-places.json');
  const next = recomputeDocumentDerivedFields({ doc, pointsSchedule: POINTS_SCHEDULE });

  const darts1 = getGame(next, 'darts-1');
  assert.equal(darts1.results.josh.place, 1);
  assert.equal(darts1.results.josh.points, 3);

  assert.equal(darts1.results.rob.place, 2);
  assert.equal(darts1.results.joe.place, 2);
  assert.equal(darts1.results.rob.points, null);
  assert.equal(darts1.results.joe.points, null);
});
