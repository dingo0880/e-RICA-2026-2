(function (scope) {
  'use strict';
  const KEY = 'erica.reaction.records.v1';
  const ROUNDS = 3;
  // User-provided approximate references for a playful comparison, not a common measurement protocol.
  const ANIMALS = [
    { emoji: '🪰', name: '파리', ms: 20, range: '15~30 ms', messages: ['와! 파리의 대표 반응속도와 비슷해요! 손끝에 날개가 달렸나요?', '파리급 반속 등장! 파리채도 한 수 배우러 오겠어요.', '앵? 벌써 눌렀어요? 파리도 놀랄 손끝이네요!'] },
    { emoji: '🦟', name: '모기', ms: 30, range: '20~40 ms', messages: ['와! 모기처럼 잽싼 반응속도예요! 소리보다 터치가 먼저네요.', '모기급 회피 본능! 오늘은 손바닥을 피하는 쪽인가요?', '윙 하고 등장해서 톡! 모기처럼 빈틈을 놓치지 않네요.'] },
    { emoji: '🪳', name: '바퀴벌레', ms: 40, range: '30~60 ms', messages: ['와! 바퀴벌레처럼 빠른 반응속도예요! 생존 본능 만렙이네요.', '불 켜면 샥! 바퀴벌레급 순발력이 손끝에 들어왔어요.', '캐릭터는 조금 놀랍지만 반속은 인정! 생존왕의 손끝이에요.'] },
    { emoji: '🐟', name: '작은 물고기', ms: 50, range: '30~70 ms', messages: ['와! 작은 물고기처럼 재빠른 반응속도예요! 손끝이 물 만났네요.', '물고기처럼 휙! 초록색 사이로 날렵하게 들어왔어요.', '낚싯바늘도 피해 갈 손끝! 작은 물고기급 순발력이에요.'] },
    { emoji: '🐸', name: '개구리', ms: 60, range: '40~80 ms', messages: ['와! 개구리처럼 날렵한 반응속도예요! 초록불을 낚아챘네요.', '개굴! 초록색을 보자마자 폴짝 뛰어든 손끝이에요.', '개구리급 타이밍! 오늘의 먹잇감은 초록불인가요?'] },
    { emoji: '🦎', name: '도마뱀', ms: 70, range: '50~100 ms', messages: ['와! 도마뱀처럼 잽싼 반응속도예요! 기회를 놓치지 않네요.', '도마뱀급 순발력! 가만히 있다가 한순간에 톡!', '햇볕 아래 쉬는 줄 알았는데! 도마뱀처럼 기습 터치에 성공했어요.'] },
    { emoji: '🐱', name: '고양이', ms: 80, range: '60~100 ms', messages: ['와! 고양이처럼 재빠른 반응속도예요! 손끝에 냥냥펀치 장착!', '초록불을 잡았다냥! 고양이급 사냥 본능이 깨어났어요.', '집사인 줄 알았는데 고양이였네요! 냥냥펀치 같은 터치예요.'] },
    { emoji: '🐍', name: '뱀', ms: 90, range: '60~120 ms', messages: ['와! 뱀처럼 날카로운 반응속도예요! 기회를 보자마자 톡!', '조용히 기다리다 번개처럼! 뱀급 기습 터치에 성공했어요.', '뱀처럼 타이밍을 낚아챘어요! 손끝의 매복 작전 성공!'] },
    { emoji: '🐕', name: '개', ms: 100, range: '80~150 ms', messages: ['와! 강아지처럼 재빠른 반응속도예요! 간식 봉지 소리라도 났나요?', '공 던지기 전에 출발! 강아지급 준비성이네요.', '산책 갈까? 그 말에 돌아보는 강아지처럼 빠른 손끝이에요!'] },
    { emoji: '🐒', name: '원숭이', ms: 150, range: '120~200 ms', messages: ['와! 원숭이처럼 날렵한 반응속도예요! 손끝으로 정글을 누비네요.', '바나나를 낚아채듯 톡! 원숭이급 순발력이에요.', '나뭇가지 사이를 휙휙! 원숭이처럼 타이밍을 잘 잡았어요.'] },
    { emoji: '👤', name: '사람', ms: 220, range: '180~250 ms', messages: ['와! 사람의 대표 반응속도와 비슷해요! 인간 대표로 출전하시죠.', '휴먼 모드 정상 작동! 다음 판엔 원숭이 기록에 도전해볼까요?', '역시 손맛을 아는 사람! 침착하게 초록불을 잡았어요.'] },
    { emoji: '🐘', name: '코끼리', ms: 250, range: '200~300+ ms', messages: ['와! 코끼리의 대표 반응속도와 비슷해요! 존재감만큼 확실한 터치!', '코끼리처럼 묵직하게 톡! 오늘의 손끝에는 품격이 있네요.', '코끼리급 침착함! 초록불을 확인하고 당당하게 눌렀어요.'] },
  ];
  function describeResult(averageMs, random = Math.random) {
    if (!Number.isFinite(averageMs) || averageMs < 0) throw new Error('유효한 평균 기록이 필요합니다.');
    const animal = ANIMALS.reduce((closest, candidate) => Math.abs(candidate.ms - averageMs) < Math.abs(closest.ms - averageMs) ? candidate : closest);
    const outside = averageMs < 15 || averageMs > 300;
    const messages = averageMs < 15
      ? ['파리 기준보다도 짧은 기록! 손끝이 순간이동했나요?', '눈 깜짝할 틈도 없네요! 이번 기록은 파리 참고값보다 빨라요.', '초록불과 거의 동시에 톡! 파리도 깜짝 놀랄 기록이에요.']
      : averageMs > 300
        ? ['코끼리보다 더 여유로운 한 판! 초록불과 잠깐 눈인사했나요?', '이번엔 코끼리보다 느긋하게! 다음 판엔 손끝의 터보를 켜볼까요?', '초록불 감상은 여기까지! 다음 판엔 코끼리 기록을 추월해봐요.']
        : animal.messages;
    const index = Math.min(messages.length - 1, Math.max(0, Math.floor(random() * messages.length)));
    return { animal, message: messages[index], outside };
  }
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
  const api = { KEY, ROUNDS, ANIMALS, describeResult, roundMs, summarize, validRecord, readRecords, saveRecord, rankRecords, randomDelay };
  if (typeof module !== 'undefined') module.exports = api;
  else scope.ReactionCore = api;
})(typeof window === 'undefined' ? globalThis : window);
