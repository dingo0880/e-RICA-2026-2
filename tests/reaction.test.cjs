const { test } = require('node:test');
const assert = require('node:assert/strict');
const R = require('../reaction-core.js');
const Q = require('../quiz-core.js');
const record = (id = 'one', attempts = [210.1, 250.2, 290.3]) => ({ id, name: '홍*동', department: '컴퓨터공학과', attempts, ...R.summarize(attempts), date: '2026-09-09T00:00:00Z' });
const storage = () => { const data = new Map(); return { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) }; };
test('best and average are computed from exactly three successful attempts', () => {
  assert.deepEqual(R.summarize([201.1, 301.2, 251.3]), { bestMs: 201.1, averageMs: 251.2 });
  for (const values of [[], [200, 300], [100, 200, 300, 400], [100, -1, 200], [100, NaN, 200], [100, Infinity, 200]]) assert.throws(() => R.summarize(values));
});
test('signal delay stays in the 2–10 second range', () => {
  assert.equal(R.randomDelay(() => 0), 2000);
  assert.equal(R.randomDelay(() => 0.5), 6000);
  assert.equal(R.randomDelay(() => 1), 10000);
});
test('ranking uses average, shares ties, and leaves source data unchanged', () => {
  const rows = [record('slow', [100, 400, 400]), record('tie-a', [200, 250, 300]), record('fast', [200, 200, 200]), record('tie-b', [250, 250, 250])];
  assert.deepEqual(R.rankRecords(rows).map(r => [r.id, r.rank]), [['fast', 1], ['tie-a', 2], ['tie-b', 2], ['slow', 4]]);
  assert.equal(rows[0].id, 'slow');
});
test('storage persists masked name and times independently of quiz records; retry is idempotent', () => {
  const s = storage(); s.setItem(Q.KEY, 'existing quiz data');
  const r = record(); R.saveRecord(s, r); R.saveRecord(s, r);
  assert.deepEqual(R.readRecords(s), [r]);
  assert.equal(s.getItem(Q.KEY), 'existing quiz data');
});
test('corrupt records and storage failures are surfaced without overwriting data', () => {
  const s = storage();
  for (const raw of ['invalid json', '{}', JSON.stringify([{ ...record(), averageMs: 1 }])]) {
    s.setItem(R.KEY, raw); assert.throws(() => R.readRecords(s)); assert.throws(() => R.saveRecord(s, record())); assert.equal(s.getItem(R.KEY), raw);
  }
  assert.throws(() => R.saveRecord({ getItem: () => null, setItem: () => { throw new Error('Quota'); } }, record()));
});
