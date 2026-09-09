const { chromium } = require('@playwright/test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'test-results/reaction');
fs.mkdirSync(out, { recursive: true });
const click = (page, selector) => page.locator(selector).dispatchEvent('click');
const phase = page => page.locator('#reaction-pad').getAttribute('data-phase');
async function register(page) {
  await page.goto('http://127.0.0.1:4173');
  await page.click('[data-action="start"][data-mode="reaction"]');
  await page.fill('#player-name', '홍길동'); await page.fill('#player-department', '컴퓨터공학과');
  await page.click('#registration-form button');
  await page.clock.install({ time: new Date('2026-09-09T00:00:00Z') });
  await page.clock.pauseAt(new Date('2026-09-09T00:00:01Z'));
  await page.evaluate(() => { Math.random = () => 0; });
}
async function tap(page) { await page.touchscreen.tap(200, 300); }
async function round(page, delay) {
  await tap(page); assert.equal(await phase(page), 'waiting');
  await page.clock.runFor(1990); assert.equal(await phase(page), 'waiting');
  await page.clock.runFor(30); assert.equal(await phase(page), 'ready');
  await page.clock.runFor(delay); await tap(page);
}
(async () => {
  let server, browser;
  try {
    try { await fetch('http://127.0.0.1:4173'); } catch { server = spawn(process.execPath, ['server.cjs'], { cwd: root, windowsHide: true, stdio: 'ignore' }); }
    for (let i = 0; i < 30; i++) { try { await fetch('http://127.0.0.1:4173'); break; } catch { await new Promise(r => setTimeout(r, 100)); } }
    browser = await chromium.launch({ channel: 'msedge', headless: true });
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, hasTouch: true });
    const page = await context.newPage(); const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto('http://127.0.0.1:4173');
    assert.deepEqual(await page.locator('.mode-start-buttons button').evaluateAll(buttons => buttons.map(b => b.dataset.mode)), ['reaction', 'quick', 'record']);
    for (const viewport of [{ width: 1440, height: 1000 }, { width: 1480, height: 924 }, { width: 1280, height: 800 }, { width: 1184, height: 740 }, { width: 768, height: 1024 }, { width: 600, height: 900 }, { width: 390, height: 844 }, { width: 360, height: 800 }]) {
      await page.setViewportSize(viewport);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Overflow at ${viewport.width}`);
      const boxes = await page.locator('.mode-start-buttons button').evaluateAll(els => els.map(el => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, fits: el.scrollWidth <= el.clientWidth }; }));
      assert.ok(boxes.every(b => b.fits && Math.abs(b.y - boxes[0].y) < 1));
      assert.ok(boxes[0].x < boxes[1].x && boxes[1].x < boxes[2].x);
      await page.screenshot({ path: path.join(out, `home-${viewport.width}.png`), fullPage: true });
    }
    await page.setViewportSize({ width: 1280, height: 800 });
    await register(page);
    assert.equal(await phase(page), 'idle');
    await tap(page); await page.clock.runFor(100); await tap(page);
    assert.equal(await phase(page), 'early'); assert.equal(await page.locator('.reaction-progress').textContent(), '1/3');
    await page.clock.runFor(11000); assert.equal(await phase(page), 'early');
    await tap(page); await page.clock.runFor(100);
    await click(page, '.reaction-exit'); assert.equal(await page.locator('#exit-dialog').isVisible(), true);
    await page.clock.runFor(11000); await click(page, '[data-action="cancel-exit"]'); assert.equal(await phase(page), 'paused');
    await tap(page); await page.evaluate(() => window.dispatchEvent(new Event('blur')));
    await page.clock.runFor(11000); assert.equal(await phase(page), 'paused');
    await round(page, 220); assert.equal(await phase(page), 'round'); assert.equal(await page.locator('.reaction-progress').textContent(), '1/3');
    // Second round starts with a visible 2/3 counter; only primary pointers count.
    await tap(page); assert.equal(await page.locator('.reaction-progress').textContent(), '2/3');
    await page.locator('#reaction-pad').dispatchEvent('pointerdown', { isPrimary: false, button: 0 }); assert.equal(await phase(page), 'waiting');
    await page.clock.runFor(2020); await page.clock.runFor(320); await tap(page);
    await tap(page); assert.equal(await page.locator('.reaction-progress').textContent(), '3/3');
    await page.clock.runFor(2020); await page.clock.runFor(270); await tap(page);
    assert.equal(await page.locator('.reaction-result').count(), 1);
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('erica.reaction.records.v1')));
    assert.equal(saved.length, 1); assert.equal(saved[0].name, '홍*동'); assert.equal(saved[0].department, '컴퓨터공학과');
    saved[0].attempts.forEach((n, i) => assert.ok(n >= [220, 320, 270][i] && n <= [240, 340, 290][i], `Measured ${n}`));
    assert.equal(saved[0].bestMs, Math.min(...saved[0].attempts));
    assert.equal(saved[0].averageMs, Math.round(saved[0].attempts.reduce((a, b) => a + b) / 3 * 10) / 10);
    assert.equal(await page.evaluate(() => localStorage.getItem('erica.quiz.records.v1')), null);
    await page.screenshot({ path: path.join(out, 'result.png'), fullPage: true });
    await click(page, '.result-actions [data-action="records"]');
    assert.equal(await page.locator('[data-mode="reaction"][role="tab"]').getAttribute('aria-selected'), 'true');
    assert.equal(await page.locator('#records-body tr').count(), 1);
    await page.fill('#record-search', '없는학과'); assert.equal(await page.locator('#records-body tr').count(), 0);
    await page.fill('#record-search', '컴퓨터'); assert.equal(await page.locator('#records-body tr').count(), 1);
    const downloaded = page.waitForEvent('download'); await click(page, '[data-action="export"]');
    const download = await downloaded; await download.saveAs(path.join(out, 'records.csv'));
    const csv = fs.readFileSync(path.join(out, 'records.csv'), 'utf8'); assert.match(csv, /최고 기록\(ms\)/); assert.match(csv, /홍\*동/); assert.ok(!csv.includes('홍길동'));
    await page.screenshot({ path: path.join(out, 'records.png'), fullPage: true });
    await click(page, '[data-mode="quick"][role="tab"]'); assert.equal(await page.locator('#records-body tr').count(), 0);
    await page.clock.resume(); await page.reload(); await page.click('.nav-button[data-action="records"]');
    await page.click('[data-mode="reaction"][role="tab"]'); assert.equal(await page.locator('#records-body tr').count(), 1);
    await page.setViewportSize({ width: 390, height: 844 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.screenshot({ path: path.join(out, 'records-mobile.png'), fullPage: true });
    // Failed saves remain recoverable and retries never duplicate the record.
    const brokenContext = await browser.newContext({ hasTouch: true });
    await brokenContext.addInitScript(() => { window.originalSetItem = Storage.prototype.setItem; Storage.prototype.setItem = () => { throw new Error('Quota'); }; });
    const broken = await brokenContext.newPage(); broken.on('pageerror', e => errors.push(e.message));
    await register(broken); for (const n of [200, 250, 300]) await round(broken, n);
    assert.equal(await broken.locator('.save-error').count(), 1);
    await click(broken, '.result-actions [data-action="home"]'); assert.equal(await broken.locator('.reaction-result').count(), 1);
    await broken.evaluate(() => { Storage.prototype.setItem = window.originalSetItem; });
    await click(broken, '[data-action="retry-save"]'); assert.equal(await broken.locator('.save-error').count(), 0);
    assert.equal(await broken.evaluate(() => JSON.parse(localStorage.getItem('erica.reaction.records.v1')).length), 1);
    await click(broken, '.result-actions [data-action="home"]'); assert.equal(await broken.locator('.hero').count(), 1);
    await brokenContext.close(); assert.deepEqual(errors, []);
    console.log('PASS: reaction touch timing, 3 rounds, early input, cancellation, blur, persistence, CSV, storage recovery, and 8 viewport layouts.');
  } finally { await browser?.close(); server?.kill(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
