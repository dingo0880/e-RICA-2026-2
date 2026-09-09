(function (scope) {
  'use strict';
  scope.createReactionUI = function ({ app, state, navigate, esc, pixel, back, tabs, toast }) {
    const R = scope.ReactionCore, C = scope.QuizCore;
    const session = { attempts: [], phase: 'idle', timer: null, frame: null, started: 0 };
    const ms = n => `${n.toFixed(1)} ms`;
    function records() { try { return R.readRecords(localStorage); } catch { return null; } }
    function stopTimers() { clearTimeout(session.timer); cancelAnimationFrame(session.frame); session.timer = null; session.frame = null; }
    function pause() {
      stopTimers();
      if (state.screen === 'reaction' && ['waiting', 'ready'].includes(session.phase)) {
        session.phase = 'paused'; app.innerHTML = screen();
      }
    }
    function start() {
      stopTimers(); session.attempts = []; session.phase = 'idle';
      state.record = null; state.saved = false; state.backedUp = false;
      navigate('reaction');
    }
    function screen() {
      const phase = session.phase;
      const copy = {
        idle: ['초록색이 되면 터치!', '빨간 화면에서 기다리세요. 10초 안에 초록색으로 바뀝니다. 화면을 누르면 시작해요.'],
        waiting: ['기다리세요…', '아직 빨간색이에요. 초록색이 되는 순간 터치하세요!'],
        ready: ['지금 터치!', '초록색! 최대한 빠르게 화면을 터치하세요.'],
        early: ['너무 빨랐어요!', '빨간색에서 눌렀어요. 이번 회차는 세지 않아요. 화면을 눌러 다시 도전하세요.'],
        paused: ['잠시 멈췄어요', '화면을 벗어나 측정을 중단했어요. 화면을 눌러 같은 회차를 다시 시작하세요.'],
        round: [session.attempts.length ? ms(session.attempts.at(-1)) : '', '화면을 누르면 다음 회차를 시작해요.'],
      }[phase];
      const round = Math.min(R.ROUNDS, session.attempts.length + (phase === 'round' ? 0 : 1));
      return `<section class="reaction-page" aria-label="반응속도 테스트"><button type="button" id="reaction-pad" class="reaction-pad" data-phase="${phase}"><span class="reaction-progress">${round}/${R.ROUNDS}</span><strong>${copy[0]}</strong><span class="reaction-instruction">${copy[1]}</span><span class="reaction-history">${session.attempts.map((n, i) => `${i + 1}회 ${ms(n)}`).join(' · ') || '총 3회 · 터치 / 클릭 / 스페이스 키'}</span></button><button class="reaction-exit" data-action="home">← 테스트 나가기</button></section>`;
    }
    function beginRound() {
      stopTimers(); session.phase = 'waiting'; navigate('reaction');
      session.timer = setTimeout(() => {
        if (state.screen !== 'reaction' || session.phase !== 'waiting') return;
        if (document.hidden || document.querySelector('dialog[open]')) { pause(); return; }
        session.frame = requestAnimationFrame(() => {
          if (state.screen !== 'reaction' || session.phase !== 'waiting') return;
          if (document.hidden || document.querySelector('dialog[open]')) { pause(); return; }
          const pad = app.querySelector('#reaction-pad');
          pad.dataset.phase = 'ready';
          pad.querySelector('strong').textContent = '지금 터치!';
          pad.querySelector('.reaction-instruction').textContent = '초록색! 최대한 빠르게 화면을 터치하세요.';
          // Monotonic, high-resolution clock in the same frame as the color change.
          session.started = performance.now(); session.phase = 'ready';
        });
      }, R.randomDelay());
    }
    function save() { try { R.saveRecord(localStorage, state.record); state.saved = true; } catch { state.saved = false; } }
    function tap(now) {
      if (state.screen !== 'reaction' || document.hidden || document.querySelector('dialog[open]')) return;
      if (session.phase === 'waiting') {
        stopTimers(); session.phase = 'early'; navigate('reaction'); return;
      }
      if (session.phase === 'ready') {
        stopTimers(); session.attempts.push(R.roundMs(Math.max(0, now - session.started)));
        if (session.attempts.length === R.ROUNDS) {
          session.phase = 'complete';
          state.record = { id: scope.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`, name: C.maskName(state.participant.name), department: state.participant.department, attempts: [...session.attempts], ...R.summarize(session.attempts), date: new Date().toISOString() };
          state.recordMode = 'reaction'; save(); navigate('reactionResult');
        } else { session.phase = 'round'; navigate('reaction'); }
        return;
      }
      if (['idle', 'round', 'early', 'paused'].includes(session.phase)) beginRound();
    }
    document.addEventListener('pointerdown', event => {
      const now = performance.now();
      if (!event.isPrimary || event.button !== 0 || !event.target.closest?.('#reaction-pad')) return;
      event.preventDefault(); tap(now);
    });
    document.addEventListener('keydown', event => {
      const now = performance.now();
      if (state.screen !== 'reaction' || ![' ', 'Enter'].includes(event.key) || event.target.closest?.('.reaction-exit, dialog')) return;
      event.preventDefault(); if (!event.repeat) tap(now);
    });
    document.addEventListener('click', event => {
      // Assistive technology can activate buttons without a pointer event.
      if (event.detail === 0 && event.target.closest?.('#reaction-pad')) tap(performance.now());
    });
    document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
    scope.addEventListener('blur', pause);
    function resultScreen() {
      const r = state.record;
      return `<section class="result-page reaction-result"><div class="result-banner"><span class="eyebrow">REACTION TEST COMPLETE · 3/3</span><div class="result-trophy">${pixel('bolt')}</div><h1>3번의 도전, 완료!</h1><p>${esc(state.participant.name)} 님의 반응속도 테스트 결과예요.</p><div class="score-boxes"><div class="score-correct"><span>최고 기록</span><strong>${r.bestMs.toFixed(1)}<small> ms</small></strong><span>3회 중 가장 빠른 기록</span></div><div class="score-total"><span>평균 기록</span><strong>${r.averageMs.toFixed(1)}<small> ms</small></strong><span>3회 평균 · 순위 기준</span></div></div><p class="save-status ${state.saved ? '' : 'save-error'}" role="status">${state.saved ? `✓ ${esc(r.name)} · ${esc(r.department)} 님의 반속 기록이 저장되었어요.` : '기록을 저장하지 못했어요. 다시 시도하거나 CSV로 보관해주세요.'}</p>${state.saved ? '' : '<div class="save-retry"><button class="button secondary" data-action="retry-save">저장 다시 시도</button><button class="text-button" data-action="export-result">이 결과 CSV 저장 ↓</button></div>'}</div><div class="reaction-attempts">${r.attempts.map((n, i) => `<div><span>${i + 1}/3 회차</span><strong>${ms(n)}</strong></div>`).join('')}</div><p class="under-note">낮을수록 빠른 기록이에요. <span>빨간색에서 누른 시도는 기록에 포함하지 않아요.</span></p><div class="result-actions"><button class="button secondary" data-action="records">${pixel('trophy')} 기록보기</button><button class="button primary" data-action="home">메인으로 돌아가기 ${pixel('arrow')}</button></div></section>`;
    }
    function recordsScreen() {
      const rows = records() || [];
      const best = rows.length ? ms(rows.reduce((value, r) => Math.min(value, r.bestMs), Infinity)) : '—';
      const average = rows.length ? ms(rows.reduce((value, r) => Math.min(value, r.averageMs), Infinity)) : '—';
      return `<section class="records-page reaction-records">${back()}<div class="page-heading"><div><span class="eyebrow">THE HALL OF FAME</span><h1>반속테스트 명예의 전당<span class="accent">.</span></h1><p>3회 평균이 빠른 순서예요. 최고 기록도 함께 확인하세요.</p></div><div class="records-mascot">${pixel('bolt')}</div></div>${tabs()}<div class="record-stats"><div><span>반속테스트 도전</span><strong>${rows.length}<small>회</small></strong></div><div><span>최고 기록</span><strong>${best}</strong></div><div><span>가장 빠른 평균</span><strong>${average}</strong></div><div class="stats-message">${pixel('bolt')}<p>초록색이 되면<br><b>빠르게 터치하세요!</b></p></div></div><div class="records-toolbar"><div class="records-tabs"><button class="${state.order === 'rank' ? 'active' : ''}" data-action="sort" data-order="rank">순위순</button><button class="${state.order === 'latest' ? 'active' : ''}" data-action="sort" data-order="latest">최신순</button></div><div class="record-filters"><label class="sr-only" for="record-search">이름 또는 학과 검색</label><input id="record-search" placeholder="이름 · 학과 검색" maxlength="40" value="${esc(state.search)}"></div><button class="text-button csv-button" data-action="export" ${rows.length ? '' : 'disabled'}>현재 순위 CSV ↓</button></div><div class="table-wrap"><table class="records-table"><thead><tr>${['순위', '플레이어', '학과', '최고 기록', '평균 기록', '1회 / 2회 / 3회', '참여 일시'].map(s => `<th scope="col">${s}</th>`).join('')}</tr></thead><tbody id="records-body"></tbody></table><div id="records-empty"></div></div><div class="records-footnote"><span>평균 기록이 같으면 공동 순위예요. 단위: ms</span><span>이름(가림) · 학과 · 기록은 이 브라우저에 보관돼요.</span></div><div class="records-bottom"><span class="eyebrow">READY, SET, REACT.</span><button class="button primary" data-action="start" data-mode="reaction">반속테스트 도전하기 ${pixel('arrow')}</button></div></section>`;
    }
    function updateRecordsTable() {
      const rows = records();
      let ranked = R.rankRecords(rows || []).filter(r => `${r.name} ${r.department}`.toLowerCase().includes(state.search.toLowerCase()));
      if (state.order === 'latest') ranked.sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
      app.querySelector('#records-body').innerHTML = ranked.map(r => `<tr><td><span class="rank-number ${r.rank <= 3 ? 'top-rank rank-' + r.rank : ''}">${r.rank}</span></td><td><b>${esc(r.name)}</b></td><td>${esc(r.department)}</td><td class="record-time">${ms(r.bestMs)}</td><td><b class="record-score">${ms(r.averageMs)}</b></td><td class="record-time">${r.attempts.map(ms).join(' / ')}</td><td class="record-date">${esc(new Date(r.date).toLocaleString('ko-KR'))}</td></tr>`).join('');
      app.querySelector('#records-empty').innerHTML = ranked.length ? '' : `<div class="empty-state">${pixel('bolt')}<h2>${rows === null ? '기록을 불러올 수 없어요' : state.search ? '조건에 맞는 기록이 없어요' : '첫 반속 기록을 기다리고 있어요'}</h2><p>${rows === null ? '브라우저의 저장소 사용 설정을 확인해주세요.' : '반속테스트에 도전하고 기록을 남겨보세요.'}</p></div>`;
    }
    function downloadCSV(rows) {
      if (!rows) { toast('반속 기록을 읽지 못했어요.'); return; }
      const header = ['순위', '이름(가림)', '학과', '최고 기록(ms)', '평균 기록(ms)', '1회(ms)', '2회(ms)', '3회(ms)', '참여 일시'];
      const lines = R.rankRecords(rows).map(r => [r.rank, r.name, r.department, r.bestMs, r.averageMs, ...r.attempts, new Date(r.date).toLocaleString('ko-KR')]);
      const blob = new Blob(['\uFEFF' + [header, ...lines].map(row => row.map(C.csvCell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob), anchor = document.createElement('a');
      anchor.href = url; anchor.download = `E-RICA_반속기록_${new Date().toISOString().slice(0, 10)}.csv`; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
    return { start, screen, pause, stopTimers, save, resultScreen, records, recordsScreen, updateRecordsTable, downloadCSV };
  };
})(window);
