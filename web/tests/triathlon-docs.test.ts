import test from 'node:test';
import assert from 'node:assert/strict';

import { listStoredTriathlonDocs, summarizeStoredTriathlonDoc } from '../lib/triathlon-docs';

test('triathlon docs: summarizeStoredTriathlonDoc parses draft entry', () => {
  const raw = JSON.stringify({ eventId: 'triathlon-2026', year: 2026, updatedAt: '2026-01-01T00:00:00.000Z' });
  const s = summarizeStoredTriathlonDoc({ key: 'bstri:scoring:draft:triathlon-2026', raw });
  assert.deepEqual(s, {
    eventId: 'triathlon-2026',
    year: 2026,
    kind: 'draft',
    updatedAt: '2026-01-01T00:00:00.000Z'
  });
});

test('triathlon docs: listStoredTriathlonDocs filters by year and skips invalid entries', () => {
  const entries = [
    {
      key: 'bstri:scoring:draft:triathlon-2026',
      raw: JSON.stringify({ year: 2026, updatedAt: '2026-01-01T00:00:00.000Z' })
    },
    {
      key: 'bstri:scoring:published:triathlon-2025',
      raw: JSON.stringify({ year: 2025, updatedAt: '2025-01-01T00:00:00.000Z' })
    },
    { key: 'bstri:scoring:draft:bad', raw: '{not json' },
    { key: 'unrelated:key', raw: '{}' }
  ];

  const res = listStoredTriathlonDocs({ entries, year: 2026 });
  assert.equal(res.length, 1);
  assert.equal(res[0].eventId, 'triathlon-2026');
  assert.equal(res[0].kind, 'draft');
});
