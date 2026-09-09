(() => {
  'use strict';
  const games = window.QUIZ_DATA;
  const C = window.QuizCore;
  const app = document.querySelector('#app');
  const levelNames = ['입문', '초급', '중급', '상급', '극악'];
  const state = { screen: 'home', mode: 'quick', recordMode: 'quick', participant: null, game: null, questions: [], answers: [], selected: null, index: 0, started: 0, record: null, saved: false, backedUp: false, timedOut: false, filter: 'all', order: 'rank', search: '', sound: true };
  let audioContext, toastTimeout;
  state.mediaReady = true;
  const esc = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pad = n => String(n).padStart(2, '0');
  const timeLabel = seconds => `${pad(Math.floor(seconds / 60))}:${pad(Math.floor(seconds % 60))}`;
  const configuredRecordLimit = Number(window.__QUIZ_RECORD_LIMIT_SECONDS__);
  const RECORD_LIMIT_SECONDS = Number.isFinite(configuredRecordLimit) && configuredRecordLimit > 0 ? configuredRecordLimit : 180;
  const elapsedSeconds = () => Math.max(0, (Date.now() - state.started) / 1000);
  const remainingRecordSeconds = () => Math.max(0, Math.ceil(RECORD_LIMIT_SECONDS - elapsedSeconds()));
  const timerSeconds = () => state.mode === 'record' ? remainingRecordSeconds() : elapsedSeconds();
  const gameById = id => games.find(g => g.id === id);
  const modeLabel = mode => mode === 'reaction' ? '반속테스트' : mode === 'record' ? '기록 모드' : '일반 모드';
  const questionTotal = () => state.questions.length;
  const pixel = (kind, cls = '') => {
    const paths = {
      controller: 'M4 6h16v2h2v12h-6v-4H8v4H2V8h2zM7 9v2H5v2h2v2h2v-2h2v-2H9V9zm9 1v3h3v-3z',
      trophy: 'M6 2h12v3h4v8h-5v3h-3v3h4v3H6v-3h4v-3H7v-3H2V5h4zm0 6H4v3h2zm12 0v3h2V8z',
      heart: 'M2 5h3V2h5v3h4V2h5v3h3v9h-3v3h-3v3h-4v3h-2v-3H6v-3H3v-3H2z',
      star: 'M10 1h4v7h8v5h-5v4h2v6h-5v-5h-4v5H5v-6h2v-4H2V8h8z',
      arrow: 'M12 3h4v4h4v4h4v3h-4v4h-4v4h-4v-4h4v-4H0v-3h16V7h-4z',
      user: 'M8 2h8v3h3v9h-3v3H8v-3H5V5h3zM5 19h14v3H5z',
      check: 'M2 11h4v4h4v-4h4V7h4V3h4v8h-4v4h-4v4h-4v4H6v-4H2z',
      bolt: 'M12 1h8l-6 8h7L8 23l3-10H4z',
      invader: 'M5 1h3v3h8V1h3v3h-3v3h5v3h3v9h-3v-3h-3v3h-5v-3h-2v3H6v-3H3v3H0v-9h3V7h5V4H5zM6 10v3h3v-3zm9 0v3h3v-3z',
    };
    return `<svg class="pixel-icon ${cls}" viewBox="0 0 24 24" fill="currentColor" fill-rule="evenodd" aria-hidden="true"><path d="${paths[kind] || paths.star}"/></svg>`;
  };
  function logo(game) {
    const icons = {
      lol: '<path d="M24 7h18v5h-8v39h18v-9h5v15H20v-5h4z"/><path d="M19 17a24 24 0 1 0 34 0" fill="none" stroke="currentColor" stroke-width="2"/>',
      valorant: '<path d="M7 14v18l22 24h14L7 14zm50 0L36 38h14l7-8z"/>',
      overwatch: '<path d="M15 17a25 25 0 1 0 34 0" fill="none" stroke="currentColor" stroke-width="7"/><path d="M18 10a27 27 0 0 1 28 0" fill="none" stroke="currentColor" stroke-width="7"/><path d="M29 24v15L13 51l4 5 15-11 15 11 4-5-16-12V24z"/>',
      pubg: '<path d="M8 18h48v29H8z" fill="none" stroke="currentColor" stroke-width="3"/><text x="32" y="39" text-anchor="middle" font-family="Impact, Arial Narrow, sans-serif" font-size="21" font-weight="bold" letter-spacing="-1">PUBG</text><path d="M13 51h38v3H13z"/>',
      tft: '<path d="M12 12h40v8H37v34H27V20H12z"/><path d="M7 5h50v4H7zm13 53h24v4H20z"/>',
      minecraft: '<path d="M7 7h50v50H7z"/><path d="M16 20h10v10H16zm22 0h10v10H38zM26 30h12v17h-6v-6h-6zm-6 7h6v13h-6zm18 0h6v13h-6z" fill="var(--logo-cutout, #f2f4e9)"/>',
      pokemon: '<circle cx="32" cy="32" r="24" fill="none" stroke="currentColor" stroke-width="6"/><path d="M8 30h48v5H8z"/><circle cx="32" cy="32" r="9" fill="var(--logo-cutout, #fcf6df)" stroke="currentColor" stroke-width="5"/>',
      lck: '<path d="M5 13l26 14L58 9 45 31 32 37 20 54l-2-17L5 25zm30 27 19-8-10 16-11 7z"/>',
    };
    return `<svg viewBox="0 0 64 64" class="game-symbol" aria-hidden="true">${icons[game.id]}</svg>`;
  }
  function toast(text) {
    const el = document.querySelector('#toast');
    el.textContent = text; el.classList.add('visible');
    clearTimeout(toastTimeout); toastTimeout = setTimeout(() => el.classList.remove('visible'), 3500);
  }
  function beep(type = 'click') {
    if (!state.sound) return;
    try {
      audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
      audioContext.resume();
      const notes = type === 'finish' ? [523, 659, 784, 1047] : [440, 660];
      notes.forEach((frequency, i) => {
        const oscillator = audioContext.createOscillator(), gain = audioContext.createGain();
        oscillator.type = 'square'; oscillator.frequency.value = frequency;
        const start = audioContext.currentTime + i * .08;
        gain.gain.setValueAtTime(.025, start); gain.gain.exponentialRampToValueAtTime(.001, start + .1);
        oscillator.connect(gain); gain.connect(audioContext.destination); oscillator.start(start); oscillator.stop(start + .11);
      });
    } catch { /* Audio is optional. */ }
  }
  function records() { try { return C.readRecords(localStorage); } catch { return null; } }
  function navigate(screen) {
    if (state.screen === 'reaction' && screen !== 'reaction') reaction.stopTimers();
    state.screen = screen;
    document.body.dataset.screen = screen;
    document.querySelectorAll('.nav-button').forEach(b => b.classList.toggle('active', b.dataset.action === (screen === 'records' ? 'records' : 'home')));
    app.innerHTML = ({ home: homeScreen, register: registerScreen, games: gamesScreen, quiz: quizScreen, result: resultScreen, records: recordsScreen, reaction: reaction.screen, reactionResult: reaction.resultScreen })[screen]();
    window.scrollTo({ top: 0, behavior: 'instant' });
    app.focus({ preventScroll: true });
    if (screen === 'records') updateRecordsTable();
    if (screen === 'quiz') watchQuizMedia();
  }
  const optionLabel = (q, i) => i >= 0 ? (q.options[i] || '') : '';
  function mediaMarkup(src, alt, className = '', zoom = false) {
    if (!src) return '';
    const body = `<img src="${esc(src)}" alt="${esc(alt)}" decoding="async" draggable="false" data-quiz-image><span class="media-fallback">이미지를 불러오지 못했어요</span>`;
    return zoom ? `<button class="image-shell ${className}" data-action="zoom-image" data-src="${esc(src)}" data-alt="${esc(alt)}" aria-label="${esc(alt)} 크게 보기">${body}<span class="image-expand" aria-hidden="true">⛶ 크게 보기</span></button>` : `<span class="image-shell ${className}">${body}</span>`;
  }
  function watchQuizMedia() {
    const images = [...app.querySelectorAll('.question-panel img[data-quiz-image]')];
    const update = () => {
      if (state.screen !== 'quiz' || images.some(img => !img.isConnected)) return;
      const failed = images.some(img => img.complete && !img.naturalWidth);
      state.mediaReady = images.every(img => img.complete && img.naturalWidth > 0);
      const status = document.querySelector('#media-status');
      status.hidden = state.mediaReady;
      status.innerHTML = failed ? '이미지를 불러오지 못했어요. 연결 상태를 확인해주세요. <button class="text-button" data-action="retry-media">다시 불러오기 ↻</button>' : '이미지를 불러오고 있어요…';
      document.querySelectorAll('.answer-option').forEach(button => { button.disabled = !state.mediaReady; });
      document.querySelector('#submit-answer').disabled = !state.mediaReady || state.selected === null;
    };
    images.forEach(img => { img.addEventListener('load', update, { once: true }); img.addEventListener('error', update, { once: true }); });
    update();
  }
  function homeScreen() {
    const rows = records() || [];
    const count = rows.length;
    return `<div class="home-page">
      <section class="hero">
        <div class="hero-copy"><span class="eyebrow hero-badge"><span class="tiny-square"></span> NEW PLAYER WANTED!</span>
          <h1><span class="hero-erica">E-RICA<span class="title-spark">✦</span></span><span class="hero-korean">가두모집<span class="title-exclamation">!</span></span></h1>
          <p class="hero-description">게임 좀 한다는 당신, <span>퀴즈도 자신 있나요?</span><br>취향에 맞는 게임을 고르고 실력을 보여주세요.</p>
          <div class="mode-start-buttons"><button class="button secondary reaction-mode-button" data-action="start" data-mode="reaction">${pixel('bolt')} 반속테스트 <small>3회 · 반응속도</small></button><button class="button primary start-button" data-action="start" data-mode="quick">${pixel('controller')} 일반 모드 <small>10문제</small> ${pixel('arrow')}</button><button class="button secondary record-mode-button" data-action="start" data-mode="record">${pixel('trophy')} 기록 모드 <small>25문제 · 3분</small></button></div>
          <p class="press-start"><span class="blinking-square"></span> 화면을 눌러주세요 <span class="press-english">PRESS START</span></p>
        </div>
        <div class="hero-art" aria-hidden="true"><span class="art-label">1 PLAYER · INFINITE FUN</span><img src="assets/arcade.svg" alt="" draggable="false"><span class="art-caption"><span class="green-dot"></span> READY WHEN YOU ARE.</span></div>
      </section>
      <section class="how-to" aria-label="참여 방법"><div class="section-kicker"><span>HOW TO PLAY</span><span class="section-line"></span><span>참여는 가볍게, 승부는 진지하게.</span></div>
        <div class="steps-grid"><div class="step-card"><span class="step-number">01</span><span class="step-icon mint">${pixel('user')}</span><div><h3>플레이어 등록</h3><p>이름과 학과를 입력해주세요.</p></div></div><div class="step-card"><span class="step-number">02</span><span class="step-icon lavender">${pixel('controller')}</span><div><h3>나의 게임 선택</h3><p>좋아하는 게임으로 도전하세요.</p></div></div><div class="step-card"><span class="step-number">03</span><span class="step-icon peach">${pixel('trophy')}</span><div><h3>10문제 또는 25문제 도전</h3><p>가볍게 즐기거나 기록에 도전하세요.</p></div></div></div>
      </section>
      <section class="home-bottom"><div class="game-lineup"><span class="eyebrow">CHOOSE YOUR WORLD</span><div>${games.map(g => `<span class="mini-game" title="${g.name}" style="color:${g.color}">${logo(g)}</span>`).join('')}</div><span class="lineup-note">8개의 게임, 당신의 주종목은?</span></div><button class="record-teaser" data-action="records">${pixel('trophy')}<span>명예의 전당<span>${count ? `일반 ${rows.filter(r => (r.mode || 'quick') === 'quick').length} · 기록 ${rows.filter(r => r.mode === 'record').length}` : '첫 번째 주인공이 되어보세요'}</span></span><span class="teaser-arrow">↗</span></button></section>
    </div>`;
  }
  const back = (action = 'home', label = '메인으로') => `<button class="text-button back-button" data-action="${action}">← ${label}</button>`;
  const stepBar = current => `<div class="flow-steps" aria-label="진행 단계">${(state.mode === 'reaction' ? ['플레이어 등록', '3회 측정', '기록 확인'] : ['플레이어 등록', '게임 선택', '퀴즈 도전']).map((s, i) => `<span class="${i === current ? 'current' : i < current ? 'done' : ''}"><b>${i < current ? '✓' : pad(i + 1)}</b>${s}</span>`).join('<i></i>')}</div>`;
  function registerScreen() {
    return `<section class="register-page">${back()}${stepBar(0)}<div class="page-heading centered"><span class="eyebrow">${state.mode === 'reaction' ? 'REACTION TEST · 3 ROUNDS' : state.mode === 'record' ? 'RECORD CHALLENGE · 25 QUESTIONS · 03:00' : 'QUICK PLAY · 10 QUESTIONS'}</span><h1>플레이어를 등록해주세요<span class="accent">.</span></h1><p>${modeLabel(state.mode)}에 참가할 이름과 학과를 입력해주세요.</p></div><div class="registration-card"><div class="player-card-art">${pixel('invader')}<span>PLAYER 01</span><small>${state.mode === 'record' ? '25문제를 3분 안에!' : '오늘의 주인공은 바로 당신!'}</small><div class="pixel-sparkles">+ &nbsp; · &nbsp; +</div></div><form id="registration-form"><label for="player-name">이름 <span>필수</span></label><input id="player-name" name="playerName" placeholder="예: 홍길동" required maxlength="20" autocomplete="off" value="${esc(state.participant?.name || '')}"><label for="player-department">학과 <span>필수</span></label><input id="player-department" name="department" placeholder="예: 컴퓨터공학과" required maxlength="40" autocomplete="off" value="${esc(state.participant?.department || '')}"><p class="privacy-note">${pixel('heart')} 기록에는 이름이 <b>홍*동</b>처럼 가려져요.<br><span>이 기기의 브라우저에 이름(가림)과 학과, ${state.mode === 'reaction' ? '반응속도' : '점수'}를 저장해요.</span></p><button class="button primary" type="submit">${state.mode === 'reaction' ? '반속테스트 시작하기' : '게임 선택하기'} ${pixel('arrow')}</button></form></div><p class="under-note">${state.mode === 'reaction' ? 'RED → GREEN → TAP!' : state.mode === 'record' ? 'ALL 25 QUESTIONS. ONE RECORD.' : 'NO PRESSURE. JUST PLAY.'} <span>${state.mode === 'reaction' ? '초록색으로 바뀌면 터치! 3회 최고·평균 기록을 저장해요.' : state.mode === 'record' ? '3분 안에 한 게임의 모든 문제를 풀어요.' : '잘 몰라도 괜찮아요, 즐기면 그만!'}</span></p></section>`;
  }
  function gamesScreen() {
    const description = state.mode === 'record' ? '3분 안에 한 게임의 25문제 전체를 풀고 기록 모드 순위에 도전해요.' : '난이도별 두 문제씩 무작위로, 총 10문제가 출제돼요.';
    return `<section class="games-page">${back('register', '플레이어 수정')}${stepBar(1)}<div class="page-heading"><div><span class="eyebrow">${state.mode === 'record' ? 'RECORD MODE · ALL 25 · 03:00' : 'QUICK MODE · RANDOM 10'}</span><h1>당신의 주종목은 무엇인가요<span class="accent">?</span></h1><p>${description}</p></div><span class="player-tag">${pixel('user')} ${esc(state.participant.name)} <small>${esc(state.participant.department)}</small></span></div><div class="games-grid">${games.map((g, i) => `<button class="game-card game-${g.id}" data-action="choose-game" data-game="${g.id}" style="--game-color:${g.color}" aria-label="${g.name} ${modeLabel(state.mode)} 시작"><div class="game-card-top"><span>0${i + 1}</span><span class="game-status">${state.mode === 'record' ? '25 Q · 03:00' : '10 Q ↗'}</span></div><div class="game-logo">${logo(g)}<strong class="wordmark wordmark-${g.id}">${esc(g.english)}</strong></div><div class="game-card-bottom"><strong>${g.name}</strong><span>${g.genre}</span></div></button>`).join('')}</div><div class="games-note"><span>${pixel('bolt')} 입문 → 초급 → 중급 → 상급 → 극악</span><span>${modeLabel(state.mode)} · ${state.mode === 'record' ? '전체 25문제 · 3분' : '랜덤 10문제'}</span></div></section>`;
  }
  function quizScreen() {
    const q = state.questions[state.index];
    const imageChoices = q.layout === 'image';
    const currentLevel = q.level;
    const total = questionTotal();
    const finalQuestion = state.index === total - 1;
    return `<section class="quiz-page ${imageChoices ? 'quiz-image-choices' : ''} ${q.image ? 'quiz-has-image' : ''}">
      ${back('home', '퀴즈 나가기')}
      <div class="quiz-top"><span class="quiz-game" style="color:${state.game.color}">${logo(state.game)}<b>${state.game.name}</b><small>${modeLabel(state.mode)}</small></span><span class="quiz-player">${esc(state.participant.name)} 님의 도전 <span class="timer ${state.mode === 'record' && remainingRecordSeconds() <= 30 ? 'timer-warning' : ''}" id="timer" data-countdown="${state.mode === 'record'}" aria-label="${state.mode === 'record' ? '남은 시간' : '소요 시간'}">${timeLabel(timerSeconds())}</span></span></div>
      <div class="level-track">${levelNames.map((name, i) => `<div class="level-node ${i + 1 === currentLevel ? 'current' : i + 1 < currentLevel ? 'complete' : ''}"><span>${i + 1 < currentLevel ? '✓' : i + 1}</span><small>${name}</small></div>`).join('')}</div>
      <div class="question-panel"><div class="question-meta"><span class="difficulty difficulty-${q.level}">LEVEL ${q.level} · ${levelNames[q.level - 1]}</span><span>QUESTION <b>${pad(state.index + 1)}</b> / ${pad(total)}</span></div>
        <div class="question-content ${q.image ? 'with-image' : ''}"><h1 class="question-title">${q.question ? esc(q.question) : '&nbsp;'}</h1>${mediaMarkup(q.image, q.imageAlt || '문제 이미지', 'question-image', true)}</div>
        <div class="answers ${imageChoices ? 'image-answers' : ''}" role="group" aria-label="정답 선택">${q.options.map((option, i) => `<button class="answer-option ${imageChoices ? 'image-answer' : ''}" data-action="answer" data-option="${i}" aria-label="${i + 1}번${option ? ` ${esc(option)}` : ''}" aria-pressed="false"><span class="answer-number">${pad(i + 1)}</span>${imageChoices ? (q.optionImages?.[i] ? mediaMarkup(q.optionImages[i], `${i + 1}번 이미지 보기`, 'answer-visual') : '<span class="answer-visual empty-answer-visual" aria-hidden="true"></span>') : ''}<span class="answer-label">${option ? esc(option) : '&nbsp;'}</span><span class="answer-mark" aria-hidden="true"></span></button>`).join('')}</div>
        <div class="media-status" id="media-status" role="status" hidden></div>
        <div class="question-bottom"><p id="answer-hint" aria-live="polite">가장 자신 있는 답을 하나 골라주세요.</p><button class="button primary" id="submit-answer" data-action="submit-answer" disabled>${finalQuestion ? '결과 확인하기' : '다음 문제'} ${pixel('arrow')}</button></div>
      </div><p class="under-note">${state.mode === 'record' ? 'LIMIT 03:00.' : 'TAKE YOUR TIME.'} <span>${state.mode === 'record' ? '기록 모드는 전체 제한시간 3분이에요.' : '시간제한은 없어요. 천천히 생각해보세요.'}</span></p></section>`;
  }
  function finish() {
    const elapsed = Math.floor(elapsedSeconds());
    state.record = { id: window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`, name: C.maskName(state.participant.name), department: state.participant.department, gameId: state.game.id, mode: state.mode, total: questionTotal(), correct: C.score(state.questions, state.answers), elapsed: state.mode === 'record' ? Math.min(RECORD_LIMIT_SECONDS, elapsed) : elapsed, timedOut: state.timedOut, date: new Date().toISOString() };
    saveResult(); beep('finish'); navigate('result');
  }
  function expireRecordMode() {
    if (state.screen !== 'quiz' || state.mode !== 'record' || state.timedOut || elapsedSeconds() < RECORD_LIMIT_SECONDS) return false;
    state.timedOut = true; state.selected = null;
    while (state.answers.length < questionTotal()) state.answers.push(null);
    state.recordMode = state.mode;
    document.querySelectorAll('dialog[open]').forEach(dialog => dialog.close());
    finish();
    return true;
  }
  function saveResult() { try { C.saveRecord(localStorage, state.record); state.saved = true; } catch { state.saved = false; } }
  function resultScreen() {
    const r = state.record;
    const ratio = r.correct / r.total;
    const title = ratio === 1 ? '인정합니다. 당신은 찐 고인물!' : ratio >= .8 ? '고수의 향기가 나요!' : ratio >= .6 ? '오, 제법 하는데요?' : ratio >= .4 ? '게임 센스가 보이는데요?' : ratio > 0 ? '첫 도전, 아주 좋아요!' : '도전하는 당신이 진짜 게이머!';
    return `<section class="result-page"><div class="result-banner"><span class="eyebrow">${state.mode === 'record' ? 'RECORD COMPLETE!' : 'QUEST COMPLETE!'}</span><div class="result-trophy">${pixel('trophy')}<span class="spark-one">✦</span><span class="spark-two">+</span></div><h1>${title}</h1><p>${esc(state.participant.name)} 님, <strong>${state.game.name} ${modeLabel(state.mode)}</strong>${state.timedOut ? '의 제한시간이 종료됐어요.' : '를 모두 풀었어요.'}</p>${state.timedOut ? '<p class="timeout-notice"><b>TIME OVER</b> 3분 안에 제출하지 못한 문제는 오답 처리됐어요.</p>' : ''}<div class="score-boxes"><div class="score-correct"><span>맞힌 문제</span><strong>${r.correct}<small>개</small></strong><span> ${pixel('check')} CORRECT</span></div><div class="score-wrong"><span>틀린 문제</span><strong>${r.total - r.correct}<small>개</small></strong><span>× &nbsp; INCORRECT</span></div><div class="score-total"><span>나의 점수</span><strong>${Math.round(r.correct / r.total * 100)}<small>점</small></strong><span>OUT OF 100</span></div></div><p class="save-status ${state.saved ? '' : 'save-error'}" role="status">${state.saved ? `✓ ${esc(r.name)} · ${esc(r.department)} 님의 ${modeLabel(state.mode)} 기록이 저장되었어요.` : '기록을 저장하지 못했어요. 아래에서 다시 시도하거나 CSV로 보관해주세요.'}</p>${state.saved ? '' : '<div class="save-retry"><button class="button secondary" data-action="retry-save">저장 다시 시도</button><button class="text-button" data-action="export-result">이 결과 CSV 저장 ↓</button></div>'}</div><div class="review-heading"><div><span class="eyebrow">ANSWER REVIEW</span><h2>정답과 해설 확인하기</h2></div><span>총 ${r.total}문제 · ${timeLabel(r.elapsed)}</span></div><div class="reviews">${state.questions.map((q, i) => {
      const gradable = q.answer >= 0;
      const selectedAnswer = state.answers[i];
      const answered = Number.isInteger(selectedAnswer);
      const correct = gradable && answered && q.answer === selectedAnswer;
      const chosenMarkup = answered ? `${mediaMarkup(q.optionImages?.[selectedAnswer], `${selectedAnswer + 1}번 보기`, 'review-image', true)}<b class="${correct ? 'green-text' : 'red-text'}">${optionLabel(q, selectedAnswer) ? esc(optionLabel(q, selectedAnswer)) : `${selectedAnswer + 1}번`}</b>` : '<b class="red-text">미응답</b>';
      return `<details class="review ${correct ? 'correct' : 'incorrect'}" ${correct ? '' : 'open'}><summary><span class="review-verdict">${correct ? '✓' : '×'}</span><span class="review-summary"><small>LEVEL ${q.level} · ${levelNames[q.level - 1]}</small><strong>${q.question ? esc(q.question) : '&nbsp;'}</strong></span><span class="review-state">${correct ? '정답' : gradable ? '오답' : '—'}</span><span class="review-chevron">⌄</span></summary><div class="review-body"><div class="review-answer"><span>내가 고른 답</span><div>${chosenMarkup}</div></div>${!correct && gradable ? `<div class="review-answer"><span>정답</span><div>${mediaMarkup(q.optionImages?.[q.answer], `정답 ${q.answer + 1}번 보기`, 'review-image', true)}<b class="green-text">${optionLabel(q, q.answer) ? esc(optionLabel(q, q.answer)) : `${q.answer + 1}번`}</b></div></div>` : ''}${q.explanation ? `<p>${esc(q.explanation)}</p>` : ''}${mediaMarkup(q.explanationImage, '해설 이미지', 'explanation-image', true)}</div></details>`;
    }).join('')}</div><div class="result-actions"><button class="button secondary" data-action="records">${pixel('trophy')} 기록보기</button><button class="button primary" data-action="home">메인으로 돌아가기 ${pixel('arrow')}</button></div></section>`;
  }
  function recordsScreen() {
    if (state.recordMode === 'reaction') return reaction.recordsScreen();
    const allRows = records();
    const modeRows = (allRows || []).filter(r => (r.mode || 'quick') === state.recordMode);
    const count = modeRows.length;
    const total = state.recordMode === 'record' ? 25 : 10;
    return `<section class="records-page">${back()}<div class="page-heading"><div><span class="eyebrow">THE HALL OF FAME</span><h1>우리 부스의 명예의 전당<span class="accent">.</span></h1><p>반속테스트, 일반 모드, 기록 모드의 순위를 따로 확인할 수 있어요.</p></div><div class="records-mascot">${pixel('trophy')}</div></div>${leaderboardTabs()}<div class="record-stats"><div><span>${modeLabel(state.recordMode)} 도전</span><strong>${count}<small>회</small></strong></div><div><span>만점 플레이어</span><strong>${modeRows.filter(r => r.correct === (r.total || total)).length}<small>명</small></strong></div><div><span>최고 기록</span><strong>${count ? Math.max(...modeRows.map(r => r.correct)) : '—'}<small>/ ${total}</small></strong></div><div class="stats-message">${pixel('invader')}<p>${state.recordMode === 'record' ? '25문제를 완주하고' : '가볍게 10문제로'}<br><b>순위에 도전하세요!</b></p></div></div><div class="records-toolbar"><div class="records-tabs"><button class="${state.order === 'rank' ? 'active' : ''}" data-action="sort" data-order="rank">순위순</button><button class="${state.order === 'latest' ? 'active' : ''}" data-action="sort" data-order="latest">최신순</button></div><div class="record-filters"><label class="sr-only" for="game-filter">게임 필터</label><select id="game-filter"><option value="all">모든 게임</option>${games.map(g => `<option value="${g.id}" ${state.filter === g.id ? 'selected' : ''}>${g.name}</option>`).join('')}</select><label class="sr-only" for="record-search">이름 또는 학과 검색</label><input id="record-search" placeholder="이름 · 학과 검색" maxlength="40" value="${esc(state.search)}"></div><button class="text-button csv-button" data-action="export" ${!count ? 'disabled' : ''}>현재 순위 CSV ↓</button></div><div class="table-wrap"><table class="records-table"><thead><tr><th scope="col">순위</th><th scope="col">플레이어</th><th scope="col">학과</th><th scope="col">게임</th><th scope="col">맞힌 개수</th><th scope="col">소요 시간</th><th scope="col">참여 일시</th></tr></thead><tbody id="records-body"></tbody></table><div id="records-empty"></div></div><div class="records-footnote"><span>같은 정답 수는 공동 순위로 표시해요.</span><span>${modeLabel(state.recordMode)} 기록만 표시 중 · 이 브라우저에 보관돼요.</span></div><div class="records-bottom"><span class="eyebrow">EVERY PLAYER HAS A STORY.</span><button class="button primary" data-action="start" data-mode="${state.recordMode}">${modeLabel(state.recordMode)} 도전하기 ${pixel('arrow')}</button></div></section>`;
  }
  function updateRecordsTable() {
    if (state.recordMode === 'reaction') return reaction.updateRecordsTable();
    const rows = records();
    const filtered = (rows || []).filter(r => (r.mode || 'quick') === state.recordMode && (state.filter === 'all' || r.gameId === state.filter));
    let ranked = C.rankRecords(filtered).filter(r => `${r.name} ${r.department}`.toLowerCase().includes(state.search.toLowerCase()));
    if (state.order === 'latest') ranked.sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
    document.querySelector('#records-body').innerHTML = ranked.map(r => { const total = r.total || ((r.mode || 'quick') === 'record' ? 25 : 5); return `<tr><td><span class="rank-number ${r.rank <= 3 ? 'top-rank rank-' + r.rank : ''}">${r.rank <= 3 ? pixel('trophy') : ''}${pad(r.rank)}</span></td><td><b>${esc(r.name)}</b></td><td>${esc(r.department)}</td><td><span class="table-game" style="--game-color:${gameById(r.gameId)?.color || '#888'}"><i></i>${esc(gameById(r.gameId)?.name || r.gameId)}</span></td><td><span class="record-score">${r.correct}<small> / ${total}</small>${r.correct === total ? '<span class="perfect-badge">PERFECT</span>' : ''}</span></td><td class="record-time">${timeLabel(r.elapsed)}</td><td class="record-date">${esc(new Intl.DateTimeFormat('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(r.date)))}</td></tr>`; }).join('');
    document.querySelector('#records-empty').innerHTML = ranked.length ? '' : `<div class="empty-state">${pixel(rows === null ? 'bolt' : 'trophy')}<h2>${rows === null ? '기록을 불러올 수 없어요' : state.search || state.filter !== 'all' ? '조건에 맞는 기록이 없어요' : `${modeLabel(state.recordMode)} 첫 기록을 기다리고 있어요`}</h2><p>${rows === null ? '브라우저의 저장소 사용 설정을 확인해주세요.' : state.recordMode === 'record' ? '25문제를 완주하고 첫 기록을 남겨보세요.' : '10문제 퀴즈에 도전해보세요.'}</p><button class="button secondary" data-action="start" data-mode="${state.recordMode}">첫 도전 시작하기 ↗</button></div>`;
  }
  function downloadCSV(rows) {
    const header = ['순위', '모드', '이름(가림)', '학과', '게임', '맞힌 개수', '전체 문제', '틀린 개수', '점수', '소요 시간(초)', '참여 일시'];
    const lines = C.rankRecords(rows).map(r => { const total = r.total || ((r.mode || 'quick') === 'record' ? 25 : 5); return [r.rank, modeLabel(r.mode || 'quick'), r.name, r.department, gameById(r.gameId)?.name || r.gameId, r.correct, total, total - r.correct, Math.round(r.correct / total * 100), r.elapsed, new Date(r.date).toLocaleString('ko-KR')]; });
    const blob = new Blob(['\uFEFF' + [header, ...lines].map(row => row.map(C.csvCell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob), anchor = document.createElement('a');
    anchor.href = url; anchor.download = `E-RICA_퀴즈기록_${new Date().toISOString().slice(0, 10)}.csv`; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function leaderboardTabs() {
    return '<div class="leaderboard-mode-tabs" role="tablist" aria-label="순위 모드">' + [
      ['reaction', 'bolt', '반속테스트', '3회 평균'],
      ['quick', 'controller', '일반 모드 순위', '랜덤 10문제'],
      ['record', 'trophy', '기록 모드 순위', '전체 25문제'],
    ].map(([mode, icon, label, note]) => '<button role="tab" aria-selected="' + (state.recordMode === mode) + '" class="' + (state.recordMode === mode ? 'active' : '') + '" data-action="records-mode" data-mode="' + mode + '">' + pixel(icon) + ' ' + label + '<small>' + note + '</small></button>').join('') + '</div>';
  }
  const reaction = window.createReactionUI({ app, state, navigate, esc, pixel, back, tabs: leaderboardTabs, toast });
  let exitDestination = 'home';
  function go(screen) {
    if (state.screen === 'quiz' || state.screen === 'reaction') { reaction.pause(); exitDestination = screen;
      document.querySelector('#exit-dialog h2').textContent = state.screen === 'reaction' ? '반속테스트를 나갈까요?' : '퀴즈를 나갈까요?';
      document.querySelector('#exit-dialog p').textContent = '진행 중인 기록은 저장되지 않아요. 처음부터 다시 도전할 수 있어요.'; document.querySelector('#exit-dialog').showModal(); return; }
    if (['result', 'reactionResult'].includes(state.screen) && !state.saved && !state.backedUp) { toast('저장이 되지 않았어요. 저장 재시도 또는 CSV 보관 후 이동해주세요.'); return; }
    if (screen === 'home' || screen === 'register' && state.screen !== 'games') state.participant = null;
    navigate(screen);
  }
  document.addEventListener('click', event => {
    const brand = event.target.closest('.brand');
    if (brand) { event.preventDefault(); go('home'); return; }
    const button = event.target.closest('[data-action]');
    if (!button || button.disabled) return;
    const action = button.dataset.action;
    if (state.screen === 'quiz' && expireRecordMode()) return;
    if (action !== 'answer') beep();
    if (action === 'home' || action === 'records' || action === 'register') go(action);
    if (action === 'start') { state.mode = button.dataset.mode || 'quick'; go('register'); }
    if (action === 'choose-game' && state.screen === 'games') {
      const game = gameById(button.dataset.game);
      state.game = game; state.questions = state.mode === 'record' ? C.allQuestions(game) : C.pickQuestions(game); state.answers = []; state.selected = null; state.index = 0; state.started = Date.now(); state.record = null; state.saved = false; state.backedUp = false; state.timedOut = false; navigate('quiz');
    }
    if (action === 'answer' && state.screen === 'quiz' && state.mediaReady) {
      state.selected = Number(button.dataset.option); beep();
      document.querySelectorAll('.answer-option').forEach(b => { const selected = Number(b.dataset.option) === state.selected; b.classList.toggle('selected', selected); b.setAttribute('aria-pressed', selected); });
      document.querySelector('#submit-answer').disabled = false;
      document.querySelector('#answer-hint').textContent = `${state.selected + 1}번을 선택했어요. 다음으로 넘어가면 답이 제출돼요.`;
    }
    if (action === 'submit-answer' && state.screen === 'quiz' && state.selected !== null && state.mediaReady) {
      state.answers.push(state.selected); state.selected = null;
      if (state.index === questionTotal() - 1) { state.recordMode = state.mode; finish(); } else { state.index++; navigate('quiz'); }
    }
    if (action === 'cancel-exit') document.querySelector('#exit-dialog').close();
    if (action === 'retry-media' && state.screen === 'quiz') {
      app.querySelectorAll('.question-panel img[data-quiz-image]').forEach(img => {
        img.closest('.image-shell').classList.remove('media-error');
        const url = new URL(img.src); url.searchParams.set('retry', Date.now()); img.src = url.href;
      });
      watchQuizMedia();
    }
    if (action === 'zoom-image') {
      const img = document.querySelector('#enlarged-image'); img.src = button.dataset.src; img.alt = button.dataset.alt;
      document.querySelector('#image-dialog').showModal();
    }
    if (action === 'close-image') document.querySelector('#image-dialog').close();
    if (action === 'confirm-exit') { document.querySelector('#exit-dialog').close(); state.participant = null; state.questions = []; state.answers = []; navigate(exitDestination); }
    if (action === 'retry-save') { if (state.screen === 'reactionResult') { reaction.save(); navigate('reactionResult'); } else { saveResult(); navigate('result'); } }
    if (action === 'export-result') { if (state.screen === 'reactionResult') reaction.downloadCSV([state.record]); else downloadCSV([state.record]); state.backedUp = true; toast('결과 CSV를 내려받았어요. 다운로드 파일을 확인해주세요.'); }
    if (action === 'export' && state.recordMode === 'reaction') reaction.downloadCSV(reaction.records());
    if (action === 'export' && state.recordMode !== 'reaction') { const rows = records(); if (rows) downloadCSV(rows.filter(r => (r.mode || 'quick') === state.recordMode)); else toast('기록을 읽지 못했어요.'); }
    if (action === 'records-mode') { state.recordMode = button.dataset.mode; state.filter = 'all'; state.search = ''; navigate('records'); }
    if (action === 'sort') { state.order = button.dataset.order; document.querySelectorAll('.records-tabs button').forEach(b => b.classList.toggle('active', b === button)); updateRecordsTable(); }
    if (action === 'sound') {
      state.sound = !state.sound;
      button.setAttribute('aria-pressed', state.sound); button.setAttribute('aria-label', state.sound ? '효과음 끄기' : '효과음 켜기'); button.title = state.sound ? '효과음 끄기' : '효과음 켜기'; button.classList.toggle('sound-on', state.sound); beep();
    }
    if (action === 'fullscreen') {
      const operation = document.fullscreenElement ? document.exitFullscreen?.() : document.documentElement.requestFullscreen?.();
      operation?.catch(() => toast('브라우저의 F11 키로 전체화면을 켜주세요.'));
      if (!operation) toast('브라우저의 전체화면 기능을 사용해주세요.');
    }
  });
  document.addEventListener('submit', event => {
    if (event.target.id !== 'registration-form') return;
    event.preventDefault();
    const form = event.target, name = form.elements.playerName.value.trim(), department = form.elements.department.value.trim();
    if (!name || !department) { toast('이름과 학과를 모두 입력해주세요.'); (!name ? form.elements.playerName : form.elements.department).focus(); return; }
    state.participant = { name, department }; beep(); if (state.mode === 'reaction') reaction.start(); else navigate('games');
  });
  document.addEventListener('change', event => { if (event.target.id === 'game-filter') { state.filter = event.target.value; updateRecordsTable(); } });
  document.addEventListener('error', event => {
    if (event.target.matches?.('img[data-quiz-image]')) event.target.closest('.image-shell').classList.add('media-error');
  }, true);
  document.addEventListener('input', event => { if (event.target.id === 'record-search') { state.search = event.target.value; updateRecordsTable(); } });
  window.addEventListener('storage', event => { if ((event.key === C.KEY || event.key === window.ReactionCore.KEY || event.key === null) && state.screen === 'records') navigate('records'); });
  window.addEventListener('beforeunload', event => { if (['quiz', 'reaction'].includes(state.screen) || ['result', 'reactionResult'].includes(state.screen) && !state.saved && !state.backedUp) { event.preventDefault(); event.returnValue = ''; } });
  setInterval(() => {
    if (expireRecordMode()) return;
    const timer = document.querySelector('#timer');
    if (!timer) return;
    const seconds = timerSeconds();
    timer.textContent = timeLabel(seconds);
    timer.classList.toggle('timer-warning', state.mode === 'record' && seconds <= 30);
    timer.setAttribute('aria-label', state.mode === 'record' ? `남은 시간 ${timeLabel(seconds)}` : `소요 시간 ${timeLabel(seconds)}`);
  }, 250);
  navigate('home');
})();
