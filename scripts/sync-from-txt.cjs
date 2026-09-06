// Updates authored question text from the original TXT sheets while preserving media and layout settings.
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const specs = [
  ['lol', '리그 오브 레전드'],
  ['valorant', '발로란트'],
  ['overwatch', '오버워치'],
  ['pubg', '배틀그라운드'],
  ['tft', '롤토체스'],
  ['minecraft', '마크'],
  ['pokemon', '포켓몬'],
  ['lck', 'LCK'],
];
const answerMarks = '①②③④';
const clean = value => value.replace(/\*/g, '').replace(/\s+/g, ' ').trim();
const sourceFiles = fs.readdirSync(root).filter(name => name.endsWith('.txt'));
const changes = [];

function parseSheet(gameId, keyword) {
  const filename = sourceFiles.find(name => name.includes(keyword));
  if (!filename) throw new Error(`문제지 없음: ${keyword}`);
  const content = fs.readFileSync(path.join(root, filename), 'utf8').replace(/^\uFEFF/, '');
  const sections = [...content.matchAll(/^#{2,3}\s*\[난이도 (\d):[^\n]+\n([\s\S]*?)(?=^#{2,3}\s*\[난이도|(?![\s\S]))/gm)];
  const questions = [];
  for (const section of sections) {
    const level = Number(section[1]);
    for (const match of section[2].matchAll(/^\* \*\*(\d)번:\*\*\s*([^\n]+)([\s\S]*?)(?=^\* \*\*\d번:|(?![\s\S]))/gm)) {
      const number = Number(match[1]);
      const sourceQuestion = clean(match[2]);
      const body = match[3];
      const answerMatch = body.match(/정답:\s*([①②③④])([^\n]*)/);
      const optionText = body.split(/정답:/)[0];
      const parsedOptions = [...optionText.matchAll(/([①②③④])([^①②③④]+)/g)].map(option => clean(option[2]));
      const options = parsedOptions.length === 4 ? parsedOptions : ['', '', '', ''];
      const answerIndex = answerMatch ? answerMarks.indexOf(answerMatch[1]) : -1;
      const explanationTail = answerMatch ? clean(body.slice(answerMatch.index + answerMatch[0].length).replace(/---/g, '')) : '';
      const explanation = explanationTail || (answerMatch ? `정답은 ${clean(answerMatch[2])}입니다.` : '');
      questions.push({
        id: `${gameId}-${level}-${number}`,
        question: sourceQuestion.replace(/\[(?:스킬 )?이미지 문제[^\]]*\]\s*/g, '').trim(),
        options,
        answer: answerIndex >= 0 ? answerIndex + 1 : null,
        explanation,
        sourceQuestion,
      });
    }
  }
  if (questions.length !== 25) throw new Error(`문항 수 확인 필요: ${filename} (${questions.length}/25)`);
  return questions;
}

for (const [gameId, keyword] of specs) {
  for (const parsed of parseSheet(gameId, keyword)) {
    const [, level, number] = parsed.id.match(/-(\d+)-(\d+)$/) || [];
    const file = path.join(root, 'questions', gameId, `level-${String(level).padStart(2, '0')}`, `question-${String(number).padStart(2, '0')}`, 'question.json');
    const current = JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
    const next = { ...current };
    for (const key of ['question', 'options', 'answer', 'explanation', 'sourceQuestion']) next[key] = parsed[key];
    if (JSON.stringify(current) === JSON.stringify(next)) continue;
    fs.writeFileSync(file, JSON.stringify(next, null, 2) + '\n');
    changes.push(parsed.id);
  }
}

if (changes.length) console.log(`TXT 갱신 완료: ${changes.length}개 (${changes.join(', ')})`);
else console.log('TXT와 문항 JSON의 질문·보기·정답·해설이 이미 같습니다.');
