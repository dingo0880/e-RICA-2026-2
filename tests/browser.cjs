const { chromium } = require('@playwright/test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'test-results');
fs.mkdirSync(out, { recursive: true });
(async () => {
  let server;
  try { await fetch('http://127.0.0.1:4173'); }
  catch { server = spawn(process.execPath, ['server.cjs'], { cwd: root, windowsHide: true, stdio: 'ignore' }); }
  let browser;
  try {
    for (let i = 0; i < 30; i++) { try { await fetch('http://127.0.0.1:4173'); break; } catch { await new Promise(r => setTimeout(r, 100)); } }
    browser = await chromium.launch({ channel: 'msedge', headless: true });
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('dialog', dialog => dialog.accept());
    await page.goto('http://127.0.0.1:4173');
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: path.join(out, '01-home-desktop.png'), fullPage: true });
    await page.click('.start-button');
    await page.fill('#player-name', '홍길동');
    await page.fill('#player-department', '컴퓨터공학과');
    await page.screenshot({ path: path.join(out, '02-register-desktop.png'), fullPage: true });
    await page.click('#registration-form button');
    assert.equal(await page.locator('.game-card').count(), 8);
    const tiles = await page.locator('.game-card').evaluateAll(els => els.map(el => ({ x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight })));
    assert.equal(new Set(tiles.map(t => t.y)).size, 2);
    assert.ok(tiles.every(t => Math.abs(t.w - t.h) <= 1));
    await page.screenshot({ path: path.join(out, '03-games-desktop.png'), fullPage: true });
    assert.equal(await page.locator('[data-game="lol"]').getAttribute('aria-disabled'), null);
    await page.click('[data-game="valorant"]');
    assert.equal(await page.locator('#submit-answer').isDisabled(), true);
    // Exit protection preserves the current round when cancelled.
    await page.click('.back-button');
    assert.equal(await page.locator('#exit-dialog').isVisible(), true);
    await page.click('[data-action="cancel-exit"]');
    assert.equal(await page.locator('.question-title').count(), 1);
    for (let i = 0; i < 5; i++) {
      const question = await page.locator('.question-title').textContent();
      const answer = await page.evaluate(({ question, i }) => window.QUIZ_DATA.find(g => g.id === 'valorant').levels[i].find(q => q.question === question).answer, { question, i });
      await page.click(`[data-option="${i < 3 ? answer : (answer + 1) % 4}"]`);
      if (i === 0) await page.screenshot({ path: path.join(out, '04-quiz-desktop.png'), fullPage: true });
      await page.click('#submit-answer');
    }
    assert.match(await page.locator('.score-correct strong').textContent(), /^3/);
    assert.equal(await page.locator('.reviews details').count(), 5);
    assert.equal(await page.locator('.reviews details[open]').count(), 2);
    assert.match(await page.locator('.save-status').textContent(), /홍\*동/);
    await page.screenshot({ path: path.join(out, '05-result-desktop.png'), fullPage: true });
    await page.click('.result-actions [data-action="home"]');
    await page.click('.nav-button[data-action="records"]');
    assert.equal(await page.locator('#records-body tr').count(), 1);
    assert.match(await page.locator('#records-body').textContent(), /홍\*동/);
    const download = page.waitForEvent('download');
    await page.click('[data-action="export"]');
    const csv = await download;
    await csv.saveAs(path.join(out, 'records.csv'));
    assert.match(fs.readFileSync(path.join(out, 'records.csv'), 'utf8'), /홍\*동/);
    await page.reload();
    await page.click('.nav-button[data-action="records"]');
    assert.equal(await page.locator('#records-body tr').count(), 1);
    await page.screenshot({ path: path.join(out, '06-records-desktop.png'), fullPage: true });
    await page.selectOption('#game-filter', 'minecraft');
    assert.equal(await page.locator('#records-body tr').count(), 0);
    await page.selectOption('#game-filter', 'all');
    await page.fill('#record-search', '컴퓨터');
    assert.equal(await page.locator('#records-body tr').count(), 1);
    await page.fill('#record-search', '없는학과');
    assert.equal(await page.locator('#records-body tr').count(), 0);
    // Play every other fully-authored game and verify all-perfect results.
    for (const gameId of ['overwatch', 'pubg', 'tft', 'minecraft', 'pokemon', 'lck']) {
      await page.click('.nav-button[data-action="home"]');
      await page.click('.start-button');
      await page.fill('#player-name', '테스트');
      await page.fill('#player-department', '검증학과');
      await page.click('#registration-form button');
      await page.click(`[data-game="${gameId}"]`);
      for (let i = 0; i < 5; i++) {
        const question = await page.locator('.question-title').textContent();
        const answer = await page.evaluate(({ question, i, gameId }) => window.QUIZ_DATA.find(g => g.id === gameId).levels[i].find(q => q.question === question).answer, { question, i, gameId });
        await page.click(`[data-option="${answer}"]`);
        await page.click('#submit-answer');
      }
      assert.match(await page.locator('.score-correct strong').textContent(), /^5/);
    }
    await page.click('.result-actions [data-action="home"]');
    await page.click('.nav-button[data-action="records"]');
    await page.fill('#record-search', '');
    assert.equal(await page.locator('#records-body tr').count(), 7);
    await page.screenshot({ path: path.join(out, '07-records-populated.png'), fullPage: true });
    // Mobile layout, quiz and stored records.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.click('.nav-button[data-action="home"]');
    await page.screenshot({ path: path.join(out, '08-home-mobile.png'), fullPage: true });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    // Record mode uses all 25 questions and has its own leaderboard tab.
    await page.click('.nav-button[data-action="home"]');
    await page.click('[data-action="start"][data-mode="record"]');
    await page.fill('#player-name', '기록왕');
    await page.fill('#player-department', '게임학과');
    await page.click('#registration-form button');
    await page.click('[data-game="tft"]');
    assert.match(await page.locator('.question-meta').textContent(), /01 \/ 25/);
    for (let i = 0; i < 25; i++) {
      const question = await page.locator('.question-title').textContent();
      const answer = await page.evaluate(({ question }) => window.QUIZ_DATA.find(g => g.id === 'tft').levels.flat().find(q => q.question === question).answer, { question });
      await page.click(`[data-option="${answer}"]`);
      await page.click('#submit-answer');
    }
    assert.match(await page.locator('.score-correct strong').textContent(), /^25/);
    assert.match(await page.locator('.review-heading').textContent(), /총 25문제/);
    await page.click('.result-actions [data-action="records"]');
    assert.equal(await page.locator('[data-action="records-mode"][data-mode="record"]').getAttribute('aria-selected'), 'true');
    assert.equal(await page.locator('#records-body tr').count(), 1);
    assert.match(await page.locator('#records-body').textContent(), /25 \/ 25/);
    await page.click('[data-action="records-mode"][data-mode="quick"]');
    assert.equal(await page.locator('#records-body tr').count(), 7);
    // LoL stays playable; its intentionally empty level-3 card can be answered and advanced.
    await page.click('.nav-button[data-action="home"]');
    await page.click('[data-action="start"][data-mode="quick"]');
    await page.fill('#player-name', '롤테스트');
    await page.fill('#player-department', '검증학과');
    await page.click('#registration-form button');
    await page.click('[data-game="lol"]');
    for (let i = 0; i < 2; i++) { await page.click('[data-option="0"]'); await page.click('#submit-answer'); }
    assert.equal(await page.locator('.image-answer').count(), 4);
    const blankImageCards = await page.locator('.image-answer').evaluateAll(els => els.map(el => { const r = el.getBoundingClientRect(); return { y: r.y, w: r.width, h: r.height }; }));
    assert.equal(new Set(blankImageCards.map(card => card.y)).size, 2);
    const blankVisuals = await page.locator('.empty-answer-visual').evaluateAll(els => els.map(el => { const r = el.getBoundingClientRect(); return { w: r.width, h: r.height }; }));
    assert.ok(blankVisuals.every(item => Math.abs(item.w - item.h) <= 1));
    await page.click('[data-option="0"]'); await page.click('#submit-answer');
    assert.match(await page.locator('.question-meta').textContent(), /04 \/ 05/);
    await page.click('.back-button');
    await page.click('[data-action="confirm-exit"]');
    await page.click('[data-action="start"][data-mode="quick"]');
    await page.fill('#player-name', '김민수');
    await page.fill('#player-department', '전자공학과');
    await page.screenshot({ path: path.join(out, '09-register-mobile.png'), fullPage: true });
    await page.click('#registration-form button');
    await page.screenshot({ path: path.join(out, '10-games-mobile.png'), fullPage: true });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.click('[data-game="pokemon"]');
    await page.screenshot({ path: path.join(out, '11-quiz-mobile.png'), fullPage: true });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.click('.back-button');
    await page.click('[data-action="confirm-exit"]');
    await page.click('.nav-button[data-action="records"]');
    assert.equal(await page.locator('#records-body tr').count(), 7);
    await page.screenshot({ path: path.join(out, '12-records-mobile.png'), fullPage: true });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    // No raw participant name is persisted.
    const saved = await page.evaluate(() => localStorage.getItem('erica.quiz.records.v1'));
    assert.ok(!saved.includes('홍길동'));
    // Storage failure must be visible and must not pretend a save succeeded.
    const brokenContext = await browser.newContext();
    await brokenContext.addInitScript(() => { Storage.prototype.setItem = () => { throw new DOMException('Quota full', 'QuotaExceededError'); }; });
    const broken = await brokenContext.newPage();
    await broken.goto('http://127.0.0.1:4173');
    await broken.click('.start-button');
    await broken.fill('#player-name', '실패확인');
    await broken.fill('#player-department', '테스트학과');
    await broken.click('#registration-form button');
    await broken.click('[data-game="tft"]');
    for (let i = 0; i < 5; i++) { await broken.click('[data-option="0"]'); await broken.click('#submit-answer'); }
    assert.equal(await broken.locator('.save-error').count(), 1);
    await broken.click('.result-actions [data-action="home"]');
    assert.equal(await broken.locator('.result-banner').count(), 1);
    const backup = broken.waitForEvent('download');
    await broken.click('[data-action="export-result"]');
    await backup;
    await broken.click('.result-actions [data-action="home"]');
    assert.equal(await broken.locator('.hero').count(), 1);
    await brokenContext.close();
    assert.deepEqual(errors, []);
    console.log('PASS: seven games, 35 graded questions, masked persistent records, CSV, exit protection, storage failure, desktop/mobile layout.');
  } finally { await browser?.close(); server?.kill(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
