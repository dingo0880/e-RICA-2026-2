const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const extensions = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'avif', 'svg'];

function imageFile(folder, configured, stem) {
  if (typeof configured !== 'string') throw new Error(`${folder}: ${stem} 파일명은 문자열이어야 합니다.`);
  const names = fs.readdirSync(folder);
  let name = configured.trim();
  if (!name) {
    const candidates = names.filter(n => extensions.some(ext => n === `${stem}.${ext}`));
    if (candidates.length > 1) throw new Error(`${folder}: ${stem} 이미지가 여러 개입니다. JSON에서 파일명을 지정해주세요.`);
    name = candidates[0] || '';
  }
  if (!name) return { url: '', exists: false };
  if (name !== path.basename(name) || /[\\/<>:#?\x00-\x1f]/.test(name) || !extensions.includes(name.split('.').at(-1))) throw new Error(`${folder}: 지원하지 않는 이미지 파일명 ${name}`);
  const exists = names.includes(name) && fs.statSync(path.join(folder, name)).isFile();
  const relative = path.relative(root, folder).split(path.sep).map(encodeURIComponent).join('/');
  return { url: exists ? `${relative}/${encodeURIComponent(name)}` : '', exists, missing: !exists ? name : '' };
}

function compileQuestion(folder, gameId, level, number) {
  const file = path.join(folder, 'question.json');
  const raw = JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
  const id = `${gameId}-${level}-${number}`;
  if (raw.id !== id) throw new Error(`${file}: id는 ${id}이어야 합니다.`);
  if (!['pending', 'ready'].includes(raw.status)) throw new Error(`${file}: status는 ready 또는 pending이어야 합니다.`);
  if (!Array.isArray(raw.options) || raw.options.length !== 4 || raw.options.some(o => typeof o !== 'string')) throw new Error(`${file}: options는 문자열 4개여야 합니다.`);
  if (!Array.isArray(raw.optionImages) || raw.optionImages.length !== 4) throw new Error(`${file}: optionImages는 파일명 4개여야 합니다.`);
  if (typeof raw.question !== 'string' || typeof raw.explanation !== 'string' || typeof raw.imageAlt !== 'string' || typeof raw.requiresImage !== 'boolean') throw new Error(`${file}: 질문·해설·이미지 설정의 형식을 확인해주세요.`);
  const layout = raw.layout || (raw.requiresImage ? 'image' : 'text');
  if (!['text', 'image'].includes(layout)) throw new Error(`${file}: layout은 text 또는 image여야 합니다.`);
  const image = imageFile(folder, raw.image, 'question');
  const choices = raw.optionImages.map((name, i) => imageFile(folder, name, `option-${i + 1}`));
  const explanationImage = imageFile(folder, raw.explanationImage, 'explanation');
  const optionImageCount = choices.filter(i => i.exists).length;
  const reasons = [];
  if (raw.status === 'pending') reasons.push('준비 중으로 설정됨');
  if (!raw.question.trim() || /\[.*이미지 문제/.test(raw.question)) reasons.push('질문 작성 필요');
  if (!Number.isInteger(raw.answer) || raw.answer < 1 || raw.answer > 4) reasons.push('정답 1~4 입력 필요');
  if (optionImageCount && optionImageCount !== 4) reasons.push('이미지 보기 4개 필요');
  if (raw.options.some((label, i) => !label.trim() && !choices[i].exists)) reasons.push('보기 내용 또는 이미지 필요');
  if (layout === 'image' && optionImageCount !== 4) reasons.push('이미지형은 보기 이미지 4개 필요');
  if ((raw.requiresImage || layout === 'image') && !image.exists && optionImageCount !== 4) reasons.push('질문 이미지 또는 이미지 보기 4개 필요');
  for (const media of [image, ...choices, explanationImage]) if (media.missing) reasons.push(`이미지 없음: ${media.missing}`);
  return {
    id, level, layout, question: raw.question.trim(), options: raw.options.map(s => s.trim()),
    answer: Number.isInteger(raw.answer) ? raw.answer - 1 : -1,
    explanation: raw.explanation.trim(), image: image.url, imageAlt: raw.imageAlt.trim() || '문제 이미지',
    optionImages: choices.map(i => i.url), explanationImage: explanationImage.url,
    pending: reasons.length > 0, pendingReasons: reasons,
    folder: path.relative(root, folder).split(path.sep).join('/'),
  };
}

function buildData() {
  const metadata = JSON.parse(fs.readFileSync(path.join(root, 'questions/games.json'), 'utf8'));
  const games = metadata.map(game => {
    if (!/^[a-z0-9-]+$/.test(game.id)) throw new Error('잘못된 게임 ID');
    const levels = Array.from({ length: 5 }, (_, li) => Array.from({ length: 5 }, (_, qi) => compileQuestion(path.join(root, 'questions', game.id, `level-${String(li + 1).padStart(2, '0')}`, `question-${String(qi + 1).padStart(2, '0')}`), game.id, li + 1, qi + 1)));
    return { ...game, levels, available: levels.every(level => level.length > 0) };
  });
  fs.writeFileSync(path.join(root, 'quiz-data.js'), `// Generated from questions/*/level-*/question-*/question.json. Do not edit directly.\nwindow.QUIZ_DATA = ${JSON.stringify(games, null, 2)};\n`);
  const index = ['# 문제 목록', '', '각 링크를 열면 해당 문항 폴더로 이동합니다. 이미지와 question.json을 같은 폴더에서 관리하세요.', '', ...games.flatMap(game => [
    `## ${game.name}`, '', '| 난이도 | 번호 | 질문 | 상태 |', '| --- | --- | --- | --- |',
    ...game.levels.flat().map(q => `| ${q.level} | [${q.id.split('-').at(-1)}번](${q.folder.replace(/^questions\//, '')}/) | ${(q.question || '질문 작성 필요').replace(/\|/g, ' / ')} | ${q.pending ? '준비 중: ' + q.pendingReasons.join(', ') : '출제 가능'} |`), '',
  ])];
  fs.writeFileSync(path.join(root, 'questions/INDEX.md'), index.join('\n'));
  for (const game of games) console.log(`${game.name}: ${game.levels.map(l => l.filter(q => !q.pending).length).join('/')} playable${game.available ? '' : ' (준비 중)'}`);
  return games;
}
if (require.main === module) buildData();
module.exports = { buildData, compileQuestion, imageFile };
