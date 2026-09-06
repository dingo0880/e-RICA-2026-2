const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const specs = [
  ['lol', '리그 오브 레전드', 'LEAGUE OF LEGENDS', '리그 오브 레전드', '#be9854', 'MOBA'],
  ['valorant', '발로란트', 'VALORANT', '발로란트', '#f16f79', 'TACTICAL FPS'],
  ['overwatch', '오버워치', 'OVERWATCH', '오버워치', '#e2a344', 'TEAM FPS'],
  ['pubg', '배틀그라운드', 'PUBG', '배틀그라운드', '#c69c4b', 'BATTLE ROYALE'],
  ['tft', '전략적 팀 전투', 'TEAMFIGHT TACTICS', '롤토체스', '#809ae6', 'AUTO BATTLER'],
  ['minecraft', '마인크래프트', 'MINECRAFT', '마크', '#76a76c', 'SANDBOX'],
  ['pokemon', '포켓몬스터', 'POKÉMON', '포켓몬', '#d4aa3b', 'RPG'],
  ['lck', 'LCK', 'LCK', 'LCK', '#9080ba', 'ESPORTS'],
];
const clean = s => s.replace(/\*/g, '').replace(/\s+/g, ' ').trim();
const games = specs.map(([id, name, english, keyword, color, genre]) => {
  const file = fs.readdirSync(root).find(f => f.endsWith('.txt') && f.includes(keyword));
  if (!file) throw new Error(`문제지 없음: ${keyword}`);
  const content = fs.readFileSync(path.join(root, file), 'utf8');
  const sections = [...content.matchAll(/^#{2,3}\s*\[난이도 (\d):[^\n]+\n([\s\S]*?)(?=^#{2,3}\s*\[난이도|(?![\s\S]))/gm)];
  const levels = sections.map(section => {
    const level = Number(section[1]);
    return [...section[2].matchAll(/^\* \*\*(\d)번:\*\*\s*([^\n]+)([\s\S]*?)(?=^\* \*\*\d번:|(?![\s\S]))/gm)].map(match => {
      const question = clean(match[2]);
      const body = match[3];
      const answerMatch = body.match(/정답:\s*([①②③④])([^\n]*)/);
      const optionText = body.split(/정답:/)[0];
      const options = [...optionText.matchAll(/([①②③④])([^①②③④]+)/g)].map(m => clean(m[2]));
      const answer = answerMatch ? '①②③④'.indexOf(answerMatch[1]) : -1;
      const note = answerMatch ? clean(body.slice(answerMatch.index + answerMatch[0].length).replace(/---/g, '')) : '';
      const pending = /이미지|사진 속/.test(question) || options.length !== 4 || answer < 0;
      return { id: `${id}-${level}-${match[1]}`, level, question, options, answer, explanation: note || (answerMatch ? `정답은 ${clean(answerMatch[2])}입니다.` : ''), pending };
    });
  });
  if (levels.length !== 5 || levels.some(l => l.length !== 5)) throw new Error(`문항 수 확인 필요: ${file} ${levels.map(l => l.length)}`);
  return { id, name, english, color, genre, source: file, levels, available: levels.every(l => l.some(q => !q.pending)) };
});
fs.writeFileSync(path.join(root, 'quiz-data.js'), `// Generated from the original quiz sheets. Run npm run build:data after editing.\nwindow.QUIZ_DATA = ${JSON.stringify(games, null, 2)};\n`);
for (const game of games) console.log(`${game.name}: ${game.levels.map(l => l.filter(q => !q.pending).length).join('/')} playable per level${game.available ? '' : ' (준비 중)'}`);
