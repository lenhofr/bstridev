import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type { ScoringDocumentV1 } from '../lib/scoring-model';
import { OPTIONAL_4TH_5TH_POINTS, recomputeDocumentDerivedFields } from '../lib/scoring-rules';

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
