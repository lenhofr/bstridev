import test from 'node:test';
import assert from 'node:assert/strict';

import { getLocalActiveEventId, parseYearFromEventId, setLocalActiveEventId } from '../lib/active-triathlon';

test('active triathlon: parseYearFromEventId', () => {
  assert.equal(parseYearFromEventId('triathlon-2026'), 2026);
  assert.equal(parseYearFromEventId(' triathlon-1999 '), 1999);
  assert.equal(parseYearFromEventId('triathlon-26'), null);
  assert.equal(parseYearFromEventId('other-2026'), null);
});

test('active triathlon: localStorage set/get', () => {
  const store = new Map<string, string>();
  // minimal localStorage mock
  (globalThis as any).localStorage = {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => void store.set(k, String(v)),
    removeItem: (k: string) => void store.delete(k)
  };

  assert.equal(getLocalActiveEventId(), null);
  setLocalActiveEventId('triathlon-2026');
  assert.equal(getLocalActiveEventId(), 'triathlon-2026');
  setLocalActiveEventId('');
  assert.equal(getLocalActiveEventId(), null);
  setLocalActiveEventId(null);
  assert.equal(getLocalActiveEventId(), null);
});
