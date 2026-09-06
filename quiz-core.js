(function (scope) {
  const KEY = 'erica.quiz.records.v1';
  function maskName(name) {
    const chars = Array.from(name.trim());
    if (chars.length <= 1) return '*';
    if (chars.length === 2) return chars[0] + '*';
    return chars[0] + '*'.repeat(chars.length - 2) + chars.at(-1);
  }
  function pickQuestions(game, random = Math.random) {
    return game.levels.map((level, i) => {
      const pool = level.filter(q => !q.pending);
      const candidates = pool.length ? pool : level;
      if (!candidates.length) throw new Error(`난이도 ${i + 1} 문항 없음`);
      return candidates[Math.floor(random() * candidates.length)];
    });
  }
  function allQuestions(game) {
    return game.levels.flat();
  }
  function score(questions, answers) {
    return questions.reduce((total, q, i) => total + (q.answer === answers[i] ? 1 : 0), 0);
  }
  function validRecord(r) {
    const mode = r?.mode || 'quick';
    const total = r?.total || (mode === 'record' ? 25 : 5);
    return r && typeof r.id === 'string' && typeof r.name === 'string' && r.name.length <= 30 && typeof r.department === 'string' && r.department.length <= 60 && typeof r.gameId === 'string' && ['quick', 'record'].includes(mode) && Number.isInteger(total) && total === (mode === 'record' ? 25 : 5) && Number.isInteger(r.correct) && r.correct >= 0 && r.correct <= total && Number.isFinite(r.elapsed) && r.elapsed >= 0 && Number.isFinite(Date.parse(r.date));
  }
  function readRecords(storage) {
    const raw = storage.getItem(KEY);
    if (!raw) return [];
    const rows = JSON.parse(raw);
    if (!Array.isArray(rows) || !rows.every(validRecord)) throw new Error('저장된 기록을 읽을 수 없습니다.');
    return rows;
  }
  function saveRecord(storage, record) {
    if (!validRecord(record)) throw new Error('기록 형식 오류');
    const rows = readRecords(storage);
    if (!rows.some(r => r.id === record.id)) rows.push(record);
    storage.setItem(KEY, JSON.stringify(rows));
    return rows;
  }
  function rankRecords(rows) {
    const sorted = [...rows].sort((a, b) => b.correct - a.correct || Date.parse(a.date) - Date.parse(b.date));
    return sorted.map((r, i) => ({ ...r, rank: i && r.correct === sorted[i - 1].correct ? sorted.findIndex(x => x.correct === r.correct) + 1 : i + 1 }));
  }
  function csvCell(value) {
    let text = String(value);
    if (/^[\s]*[=+@\-\t\r]/.test(text)) text = "'" + text;
    return '"' + text.replace(/"/g, '""') + '"';
  }
  const api = { KEY, maskName, pickQuestions, allQuestions, score, validRecord, readRecords, saveRecord, rankRecords, csvCell };
  if (typeof module !== 'undefined') module.exports = api;
  else scope.QuizCore = api;
})(typeof window === 'undefined' ? globalThis : window);
