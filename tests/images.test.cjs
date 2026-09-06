const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { compileQuestion } = require('../scripts/build-data.cjs');
const makeQuestion = () => ({ id: 'test-1-1', status: 'ready', layout: 'text', question: '그림을 보고 답을 고르세요.', image: '', imageAlt: '', options: ['하나', '둘', '셋', '넷'], optionImages: ['', '', '', ''], answer: 2, explanation: '두 번째 보기입니다.', explanationImage: '', requiresImage: false });
function fixture(fn) {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'erica-image-test-'));
  const write = q => fs.writeFileSync(path.join(base, 'question.json'), JSON.stringify(q));
  const image = name => fs.writeFileSync(path.join(base, name), '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><rect width="20" height="20"/></svg>');
  try { fn({ base, write, image, read: () => compileQuestion(base, 'test', 1, 1) }); }
  finally {
    if (path.dirname(base) !== path.resolve(os.tmpdir()) || !path.basename(base).startsWith('erica-image-test-')) throw new Error('Unexpected test path');
    fs.rmSync(base, { recursive: true, force: true });
  }
}
test('regular questions accept an optional prompt image by convention', () => fixture(({ write, image, read }) => {
  write(makeQuestion()); image('question.svg');
  const q = read(); assert.equal(q.pending, false); assert.match(q.image, /question.svg$/); assert.equal(q.answer, 1);
}));
test('four square image choices may have no text labels', () => fixture(({ write, image, read }) => {
  write({ ...makeQuestion(), layout: 'image', options: ['', '', '', ''], requiresImage: true });
  for (let i = 1; i <= 4; i++) image(`option-${i}.svg`);
  const q = read(); assert.equal(q.pending, false); assert.equal(q.layout, 'image'); assert.equal(q.optionImages.filter(Boolean).length, 4);
}));
test('an unfinished image question keeps its square-choice layout in generated data', () => fixture(({ write, read }) => {
  write({ ...makeQuestion(), status: 'pending', layout: 'image', question: '', options: ['', '', '', ''], answer: null, requiresImage: true });
  const q = read(); assert.equal(q.pending, true); assert.equal(q.layout, 'image'); assert.deepEqual(q.optionImages, ['', '', '', '']);
}));
test('partial choice sets are not put into a live quiz', () => fixture(({ write, image, read }) => {
  write(makeQuestion()); image('option-1.svg');
  const q = read(); assert.equal(q.pending, true); assert.ok(q.pendingReasons.includes('이미지 보기 4개 필요'));
}));
test('missing images, incomplete questions, and explicit pending status remain pending', () => fixture(({ write, image, read }) => {
  write({ ...makeQuestion(), requiresImage: true }); assert.equal(read().pending, true);
  image('question.svg'); write({ ...makeQuestion(), status: 'pending' }); assert.equal(read().pending, true);
  write({ ...makeQuestion(), question: '', answer: null }); assert.equal(read().pending, true);
  write({ ...makeQuestion(), image: 'missing.png' }); assert.equal(read().pending, true);
  write({ ...makeQuestion(), explanationImage: 'missing.png' }); assert.equal(read().pending, true);
}));
test('local filenames support spaces and Korean while preventing paths and case mismatches', () => fixture(({ write, image, read }) => {
  image('스킬 그림.svg'); write({ ...makeQuestion(), image: '스킬 그림.svg' }); assert.match(read().image, /%20/); assert.equal(read().pending, false);
  image('Question.svg'); write({ ...makeQuestion(), image: 'question.svg' }); assert.equal(read().pending, true);
  write({ ...makeQuestion(), image: '../outside.png' }); assert.throws(read, /파일명/);
  write({ ...makeQuestion(), image: 'https://example.com/a.png' }); assert.throws(read, /파일명/);
}));
test('ambiguous auto-discovery fails with a useful message', () => fixture(({ write, image, read }) => {
  write(makeQuestion()); image('question.svg'); image('question.png'); assert.throws(read, /여러 개/);
  write({ ...makeQuestion(), image: 'question.svg' }); assert.equal(read().pending, false);
}));
test('a real Pages build packages question and four choice images under relative paths', () => fixture(({ base }) => {
  const source = path.resolve(__dirname, '..');
  function copyTree(from, to) {
    fs.mkdirSync(to, { recursive: true });
    for (const item of fs.readdirSync(from, { withFileTypes: true })) {
      if (item.isDirectory()) copyTree(path.join(from, item.name), path.join(to, item.name));
      else if (item.isFile()) fs.copyFileSync(path.join(from, item.name), path.join(to, item.name));
    }
  }
  for (const folder of ['questions', 'assets', 'scripts']) copyTree(path.join(source, folder), path.join(base, folder));
  for (const name of ['index.html', 'styles.css', 'tablet.css', 'app.js', 'quiz-core.js', 'ASSETS.md']) fs.copyFileSync(path.join(source, name), path.join(base, name));
  const qFolder = path.join(base, 'questions/valorant/level-03/question-05');
  const qFile = path.join(qFolder, 'question.json');
  const q = JSON.parse(fs.readFileSync(qFile, 'utf8'));
  Object.assign(q, { status: 'ready', layout: 'image', image: '질문 그림.svg', options: ['', '', '', ''] });
  fs.writeFileSync(qFile, JSON.stringify(q));
  const imageNames = ['질문 그림.svg', ...[1, 2, 3, 4].map(i => `option-${i}.svg`), 'explanation.svg'];
  for (const name of imageNames) fs.writeFileSync(path.join(qFolder, name), '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>');
  const result = require('node:child_process').spawnSync(process.execPath, [path.join(base, 'scripts/build-site.cjs')], { encoding: 'utf8', windowsHide: true });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  for (const name of imageNames) assert.ok(fs.existsSync(path.join(base, 'dist/questions/valorant/level-03/question-05', name)));
  const context = { window: {} };
  require('node:vm').runInNewContext(fs.readFileSync(path.join(base, 'dist/quiz-data.js'), 'utf8'), context);
  const built = context.window.QUIZ_DATA.find(g => g.id === 'valorant').levels[2][4];
  assert.equal(built.pending, false); assert.match(built.image, /^questions\/.*%20/);
  assert.equal(built.optionImages.filter(Boolean).length, 4);
  assert.ok(fs.existsSync(path.join(base, 'dist/.nojekyll')));
  assert.equal(fs.existsSync(path.join(base, 'dist/questions/valorant/level-03/question-05/question.json')), false);
  assert.equal(fs.existsSync(path.join(base, 'dist/versions')), false);
}));
