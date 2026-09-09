(function (scope) {
  'use strict';
  const KEY = 'erica.reaction.records.v1';
  const ROUNDS = 3;
  const roundMs = value => Math.round(value * 10) / 10;
  function summarize(attempts) {
    if (!Array.isArray(attempts) || attempts.length !== ROUNDS || !attempts.every(n => Number.isFinite(n) && n >= 0)) throw new Error('3회의 유효한 측정이 필요합니다.');
    return { bestMs: roundMs(Math.min(...attempts)), averageMs: roundMs(attempts.reduce((a, b) => a + b, 0) / ROUNDS) };
  }
  function validRecord(r) {
    if (!r || typeof r.id !== 'string' || typeof r.name !== 'string' || !r.name.trim() || r.name.length > 30 || typeof r.department !== 'string' || !r.department.trim() || r.department.length > 60 || !Number.isFinite(Date.parse(r.date))) return false;
    try { const summary = summarize(r.attempts); return r.bestMs === summary.bestMs && r.averageMs === summary.averageMs; } catch { return false; }
  }
  function readRecords(storage) {
    const raw = storage.getItem(KEY);
    if (!raw) return [];
    const rows = JSON.parse(raw);
    if (!Array.isArray(rows) || !rows.every(validRecord)) throw new Error('반속 기록을 읽을 수 없습니다.');
    return rows;
  }
  function saveRecord(storage, record) {
    if (!validRecord(record)) throw new Error('반속 기록 형식 오류');
    const rows = readRecords(storage);
    if (!rows.some(r => r.id === record.id)) rows.push(record);
    storage.setItem(KEY, JSON.stringify(rows));
    return rows;
  }
  function rankRecords(rows) {
    const sorted = [...rows].sort((a, b) => a.averageMs - b.averageMs || Date.parse(a.date) - Date.parse(b.date));
    let rank = 0;
    return sorted.map((r, i) => { if (!i || r.averageMs !== sorted[i - 1].averageMs) rank = i + 1; return { ...r, rank }; });
  }
  // Each round waits between 2 and 10 seconds, with no visual countdown.
  function randomDelay(random = Math.random) { return 2000 + Math.min(1, Math.max(0, random())) * 8000; }
  const api = { KEY, ROUNDS, roundMs, summarize, validRecord, readRecords, saveRecord, rankRecords, randomDelay };
  if (typeof module !== 'undefined') module.exports = api;
  else scope.ReactionCore = api;
})(typeof window === 'undefined' ? globalThis : window);
