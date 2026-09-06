const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const C = require('../quiz-core.js');
const sandbox = { window: {} };
vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname, '../quiz-data.js'), 'utf8'), sandbox);
const games = JSON.parse(JSON.stringify(sandbox.window.QUIZ_DATA));
test('all 200 question folders have valid playable or pending data', () => {
  assert.equal(games.length, 8);
  const questions = games.flatMap(g => g.levels.flat());
  assert.equal(questions.length, 200);
  assert.ok(questions.filter(q => q.pending).every(q => q.pendingReasons.length > 0));
  for (const q of questions.filter(q => !q.pending)) {
    assert.equal(q.options.length, 4, q.id);
    assert.ok(q.options.every((o, i) => (o || q.optionImages[i]) && !o.includes('정답:') && !o.includes('**')), q.id);
    assert.ok(q.answer >= 0 && q.answer <= 3, q.id);
    if (q.optionImages.some(Boolean)) assert.equal(q.optionImages.filter(Boolean).length, 4, q.id);
  }
});
test('each game draws one ready question per level, or an unfinished fallback when all need images', () => {
  for (const game of games) {
    for (let i = 0; i < 100; i++) {
      const questions = C.pickQuestions(game);
      assert.deepEqual(questions.map(q => q.level), [1, 2, 3, 4, 5]);
      assert.ok(questions.every(q => !q.pending || !game.levels[q.level - 1].some(candidate => !candidate.pending)));
    }
    const firstLevelPool = game.levels[0].filter(q => !q.pending);
    const candidates = firstLevelPool.length ? firstLevelPool : game.levels[0];
    assert.equal(C.pickQuestions(game, () => 0)[0].id, candidates[0].id);
    const last = candidates.at(-1);
    assert.equal(C.pickQuestions(game, () => .99999)[0].id, last.id);
  }
  assert.equal(C.pickQuestions({ levels: [[{ pending: true, id: 'blank' }]] })[0].id, 'blank');
  assert.throws(() => C.pickQuestions({ levels: [[]] }), /문항 없음/);
});
test('record mode returns all 25 questions in level order', () => {
  for (const game of games) {
    const questions = C.allQuestions(game);
    assert.equal(questions.length, 25);
    assert.deepEqual(questions.map(q => q.level), [1,1,1,1,1,2,2,2,2,2,3,3,3,3,3,4,4,4,4,4,5,5,5,5,5]);
  }
});
test('grading supports zero, mixed and perfect scores', () => {
  const questions = C.pickQuestions(games[1]);
  const correct = questions.map(q => q.answer);
  assert.equal(C.score(questions, correct), 5);
  assert.equal(C.score(questions, correct.map(a => (a + 1) % 4)), 0);
  assert.equal(C.score(questions, correct.map((a, i) => i < 3 ? a : (a + 1) % 4)), 3);
});
test('names are masked including short and Unicode names', () => {
  assert.equal(C.maskName(' 홍길동 '), '홍*동');
  assert.equal(C.maskName('이름'), '이*');
  assert.equal(C.maskName('김'), '*');
  assert.equal(C.maskName('남궁민수'), '남**수');
  assert.equal(C.maskName('😀가나'), '😀*나');
});
const record = (id, correct = 3) => ({ id, name: '홍*동', department: '컴퓨터공학과', gameId: 'valorant', correct, elapsed: 24, date: '2026-09-06T03:00:00.000Z' });
test('records survive a reload and saving one result twice does not duplicate it', () => {
  const map = new Map();
  const storage = { getItem: k => map.get(k) ?? null, setItem: (k, v) => map.set(k, v) };
  assert.deepEqual(C.readRecords(storage), []);
  C.saveRecord(storage, record('one'));
  C.saveRecord(storage, record('one'));
  C.saveRecord(storage, record('two', 5));
  assert.equal(C.readRecords(storage).length, 2);
  assert.equal(C.readRecords(storage)[0].name, '홍*동');
  assert.equal(C.rankRecords(C.readRecords(storage))[0].id, 'two');
});
test('quick and 25-question record results validate separately', () => {
  assert.equal(C.validRecord(record('legacy')), true);
  assert.equal(C.validRecord({ ...record('record', 21), mode: 'record', total: 25 }), true);
  assert.equal(C.validRecord({ ...record('bad', 6), mode: 'quick', total: 5 }), false);
  assert.equal(C.validRecord({ ...record('bad-total', 5), mode: 'record', total: 5 }), false);
});
test('tied scores share a competition rank', () => {
  const rows = C.rankRecords([record('a', 3), record('b', 5), record('c', 5), record('d', 1)]);
  assert.deepEqual(rows.map(r => r.rank), [1, 1, 3, 4]);
});
test('storage errors surface without overwriting previous data', () => {
  const corrupted = { getItem: () => '{broken', setItem: () => assert.fail('must not overwrite') };
  assert.throws(() => C.saveRecord(corrupted, record('x')));
  assert.throws(() => C.readRecords({ getItem: () => '[{}]' }));
  assert.throws(() => C.saveRecord({ getItem: () => null, setItem: () => { throw new Error('QuotaExceededError'); } }, record('x')));
});
test('CSV fields quote embedded commas and neutralize formula cells', () => {
  assert.equal(C.csvCell('컴퓨터,공학'), '"컴퓨터,공학"');
  assert.equal(C.csvCell('a"b'), '"a""b"');
  assert.equal(C.csvCell('=1+1'), '"\'=1+1"');
  assert.equal(C.csvCell(' @SUM(1)'), '"\' @SUM(1)"');
});
