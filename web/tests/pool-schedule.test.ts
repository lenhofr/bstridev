import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type { ScoringDocumentV1 } from '../lib/scoring-model';
import { generateRoundRobinSchedule } from '../lib/pool-schedule';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FIXTURES_DIR = path.resolve(__dirname, '../public/fixtures/scoring');

async function loadFixture(name: string): Promise<ScoringDocumentV1> {
  const raw = await fs.readFile(path.join(FIXTURES_DIR, name), 'utf8');
  return JSON.parse(raw) as ScoringDocumentV1;
}

test('pool schedule: even competitors (6) => 5 rounds, 3 matches each, no byes', async () => {
  const doc = await loadFixture('even-6-blank.json');
  const competitorOrder = doc.eventMeta?.competitorOrder ?? doc.participants.map((p) => p.personId);
  const schedule = generateRoundRobinSchedule({ competitorOrder, poolTables: [1, 2] });

  assert.equal(schedule.rounds.length, 5);
  for (const r of schedule.rounds) {
    assert.equal(r.bye, null);
    assert.equal(r.matches.length, 3);
  }
});

test('pool schedule: odd competitors (5) => 5 rounds, 2 matches each, exactly one bye per competitor', async () => {
  const doc = await loadFixture('odd-5-blank.json');
  const competitorOrder = doc.eventMeta?.competitorOrder ?? doc.participants.map((p) => p.personId);
  const schedule = generateRoundRobinSchedule({ competitorOrder, poolTables: [1, 2] });

  assert.equal(schedule.rounds.length, 5);
  for (const r of schedule.rounds) assert.equal(r.matches.length, 2);

  const byeCounts = new Map<string, number>();
  for (const r of schedule.rounds) {
    assert.ok(r.bye);
    byeCounts.set(r.bye, (byeCounts.get(r.bye) ?? 0) + 1);
  }

  for (const pid of competitorOrder) {
    assert.equal(byeCounts.get(pid), 1);
  }
});
