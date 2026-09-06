const { chromium } = require('@playwright/test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const http = require('node:http');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'test-results/tablet');
fs.mkdirSync(out, { recursive: true });
const snapshot = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(root, 'quiz-data.js'), 'utf8'), snapshot);
const data = JSON.parse(JSON.stringify(snapshot.window.QUIZ_DATA));
const imagePath = 'questions/valorant/level-01/question-01/';
const palette = ['#b398d1', '#8cb9a4', '#dda2ac', '#d8bb7e'];
const fixtureImage = index => `<svg xmlns="http://www.w3.org/2000/svg" width="${index === 5 ? 800 : 300}" height="${index === 5 ? 350 : 300}" viewBox="0 0 300 300"><rect width="300" height="300" fill="#f6f2eb"/><path d="M70 90h30V60h25v30h50V60h25v30h30v110h-30v30h-25v-30h-50v30h-25v-30H70z" fill="${palette[(index - 1) % 4]}"/><rect x="95" y="110" width="25" height="25" fill="#fff"/><rect x="180" y="110" width="25" height="25" fill="#fff"/><text x="150" y="177" text-anchor="middle" font-size="32" fill="white">${index}</text></svg>`;

async function startGame(page) {
  await page.click('.start-button');
  await page.fill('#player-name', '탭플레이어');
  await page.fill('#player-department', '컴퓨터공학과');
  await page.click('#registration-form button');
}
const readyImages = page => page.waitForFunction(() => [...document.querySelectorAll('.question-panel img')].every(img => img.complete && img.naturalWidth > 0) && !document.querySelector('.answer-option')?.disabled);
const noOverflow = async page => assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'horizontal page overflow');
const insideViewport = async (page, selector) => {
  const bounds = await page.locator(selector).evaluate(el => ({ bottom: el.getBoundingClientRect().bottom, height: innerHeight, width: innerWidth, coarse: matchMedia('(pointer:coarse)').matches }));
  assert.ok(bounds.bottom <= bounds.height + 1, `${selector} should fit in landscape viewport: ${JSON.stringify(bounds)}`);
};

(async () => {
  // Serve the actual generated site below a repository prefix, just like project Pages.
  const server = http.createServer((req, res) => {
    const pathname = decodeURIComponent(new URL(req.url, 'http://local').pathname);
    if (!pathname.startsWith('/erica-quiz/')) { res.writeHead(404).end(); return; }
    const relative = pathname.slice('/erica-quiz/'.length) || 'index.html';
    const file = path.resolve(root, 'dist', relative);
    if (!file.startsWith(path.join(root, 'dist') + path.sep)) { res.writeHead(404).end(); return; }
    fs.readFile(file, (err, body) => {
      if (err) { res.writeHead(404).end(); return; }
      const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.woff': 'font/woff' };
      res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' }).end(body);
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}/erica-quiz/`;
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    for (const [width, height, dpr] of [[1480, 924, 2], [1280, 800, 2], [1184, 740, 2.5]]) {
      const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: dpr, hasTouch: true, isMobile: true });
      const page = await context.newPage();
      const errors = []; page.on('pageerror', e => errors.push(e.message));
      await page.goto(origin); await page.evaluate(() => document.fonts.ready);
      assert.equal(await page.evaluate(() => matchMedia('(pointer:coarse)').matches), true);
      await noOverflow(page);
      assert.ok(await page.evaluate(() => document.querySelector('.press-start').getBoundingClientRect().bottom < document.querySelector('.how-to').getBoundingClientRect().top), 'hero must not overlap the instructions');
      await page.screenshot({ path: path.join(out, `${width}-home.png`), fullPage: false, scale: 'css' });
      await startGame(page);
      const tiles = await page.locator('.game-card').evaluateAll(els => els.map(el => { const r = el.getBoundingClientRect(); return { y: r.y, w: r.width, h: r.height }; }));
      assert.equal(new Set(tiles.map(t => t.y)).size, 2);
      assert.ok(tiles.every(t => Math.abs(t.w - t.h) < 1));
      await insideViewport(page, '.games-grid');
      await page.screenshot({ path: path.join(out, `${width}-games.png`), fullPage: false, scale: 'css' });
      await page.click('[data-game="valorant"]');
      await page.screenshot({ path: path.join(out, `${width}-text-quiz.png`), fullPage: false, scale: 'css' });
      await insideViewport(page, '#submit-answer');
      await context.close();

      const imageContext = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: dpr, hasTouch: true, isMobile: true });
      const images = await imageContext.newPage();
      images.on('pageerror', e => errors.push(e.message));
      const modified = JSON.parse(JSON.stringify(data));
      const game = modified.find(g => g.id === 'valorant');
      game.levels = game.levels.map((level, i) => [{ ...level.find(q => !q.pending), layout: 'image', question: '다음 그림과 같은 모양의 이미지를 골라주세요.', image: imagePath + 'question.svg', imageAlt: '비교할 그림', options: ['보라 우주인', '초록 우주인', '분홍 우주인', '노랑 우주인'], optionImages: [1, 2, 3, 4].map(n => imagePath + `option-${n}.svg`), answer: 1, explanation: '두 번째 그림을 골랐으면 정답입니다.', explanationImage: imagePath + 'explanation.svg' }]);
      await images.route('**/quiz-data.js', route => route.fulfill({ contentType: 'text/javascript', body: `window.QUIZ_DATA=${JSON.stringify(modified)};` }));
      await images.route('**/questions/**', route => {
        const name = new URL(route.request().url()).pathname.split('/').at(-1);
        return route.fulfill({ contentType: 'image/svg+xml', body: fixtureImage(name.startsWith('option-') ? Number(name.charAt(7)) : name === 'question.svg' ? 5 : 2) });
      });
      await images.goto(origin); await startGame(images); await images.click('[data-game="valorant"]'); await readyImages(images);
      assert.equal(await images.locator('.image-answer').count(), 4);
      assert.deepEqual(await images.locator('.image-answer .answer-label').allTextContents(), ['보라 우주인', '초록 우주인', '분홍 우주인', '노랑 우주인']);
      const cards = await images.locator('.image-answer').evaluateAll(els => els.map(el => { const r = el.getBoundingClientRect(); return { y: r.y, w: r.width, h: r.height }; }));
      assert.equal(new Set(cards.map(t => t.y)).size, 1);
      const visuals = await images.locator('.answer-visual').evaluateAll(els => els.map(el => { const r = el.getBoundingClientRect(); return { w: r.width, h: r.height }; }));
      assert.ok(visuals.every(item => Math.abs(item.w - item.h) < 1));
      assert.ok(await images.locator('.answer-visual img').evaluateAll(els => els.every(el => getComputedStyle(el).objectFit === 'cover' && getComputedStyle(el).objectPosition === '50% 50%')));
      const widths = await images.evaluate(() => ({ grid: document.querySelector('.image-answers').getBoundingClientRect().width, panel: document.querySelector('.question-panel').getBoundingClientRect().width }));
      assert.ok(widths.grid / widths.panel > .9, `image choices should use almost the full quiz panel width: ${JSON.stringify(widths)}`);
      await insideViewport(images, '#submit-answer'); await noOverflow(images);
      await images.screenshot({ path: path.join(out, `${width}-image-quiz.png`), fullPage: false, scale: 'css' });
      await images.click('.question-image'); assert.equal(await images.locator('#image-dialog').isVisible(), true); await images.click('[data-action="close-image"]');
      for (let i = 0; i < 5; i++) { await readyImages(images); await images.click('[data-option="1"]'); await images.click('#submit-answer'); }
      assert.match(await images.locator('.score-correct strong').textContent(), /^5/);
      await images.locator('details').first().locator('summary').click();
      assert.equal(await images.locator('.review-image').count(), 5);
      assert.equal(await images.locator('.explanation-image').count(), 5);
      await images.screenshot({ path: path.join(out, `${width}-result.png`), fullPage: false, scale: 'css' });
      if (width === 1480) {
        // Rotate the same session to portrait, preserving the questions and selection.
        await images.click('.result-actions [data-action="home"]'); await startGame(images); await images.click('[data-game="valorant"]'); await readyImages(images);
        await images.setViewportSize({ width: 924, height: 1480 });
        // Edge resets touch emulation on viewport changes; restore the tablet input.
        const cdp = await imageContext.newCDPSession(images);
        await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
        await images.waitForFunction(() => matchMedia('(orientation:portrait)').matches && getComputedStyle(document.querySelector('.image-answers')).gridTemplateColumns.split(' ').length === 2);
        const ys = await images.locator('.image-answer').evaluateAll(els => els.map(el => el.getBoundingClientRect().y));
        assert.equal(new Set(ys).size, 2); await noOverflow(images);
        await images.screenshot({ path: path.join(out, 'portrait-image-quiz.png'), fullPage: false, scale: 'css' });
      }
      assert.deepEqual(errors, []);
      await imageContext.close();
    }
    // Runtime image failures block submission and retry restores the same round.
    const broken = await browser.newPage({ viewport: { width: 1184, height: 740 }, hasTouch: true, isMobile: true });
    const badData = JSON.parse(JSON.stringify(data));
    badData.find(g => g.id === 'valorant').levels[0] = [{ ...badData.find(g => g.id === 'valorant').levels[0][0], image: imagePath + 'question.svg' }];
    await broken.route('**/quiz-data.js', route => route.fulfill({ contentType: 'text/javascript', body: `window.QUIZ_DATA=${JSON.stringify(badData)};` }));
    let fail = true;
    await broken.route('**/questions/**', route => fail ? route.fulfill({ status: 404 }) : route.fulfill({ contentType: 'image/svg+xml', body: fixtureImage(1) }));
    await broken.goto(origin); await startGame(broken); await broken.click('[data-game="valorant"]');
    await broken.locator('[data-action="retry-media"]').waitFor();
    assert.equal(await broken.locator('.answer-option').first().isDisabled(), true);
    assert.equal(await broken.locator('#submit-answer').isDisabled(), true);
    fail = false; await broken.click('[data-action="retry-media"]'); await readyImages(broken);
    await broken.click('[data-option="1"]'); assert.equal(await broken.locator('#submit-answer').isDisabled(), false);
    console.log('PASS: 3 landscape viewports with touch/DPR, square image choices, portrait rotation, zoom, image grading/review, failed-image retry, GitHub Pages subpath.');
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; });

