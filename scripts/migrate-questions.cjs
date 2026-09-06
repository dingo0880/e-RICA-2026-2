// One-time, non-destructive migration from the archived TXT data.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const context = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(root, 'versions/laptop-v1/quiz-data.js'), 'utf8'), context);
const games = context.window.QUIZ_DATA;
const writeNew = (file, data) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  if (!fs.existsSync(file)) fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
};
writeNew(path.join(root, 'questions/games.json'), games.map(({ levels, available, ...game }) => game));
for (const game of games) {
  for (const level of game.levels) for (const q of level) {
    const number = q.id.split('-').at(-1);
    const folder = path.join(root, 'questions', game.id, `level-${String(q.level).padStart(2, '0')}`, `question-${number.padStart(2, '0')}`);
    writeNew(path.join(folder, 'question.json'), {
      id: q.id,
      status: q.pending ? 'pending' : 'ready',
      layout: q.options.length === 4 && q.options.every(option => !option.trim()) ? 'image' : 'text',
      question: q.question.replace(/\[(?:스킬 )?이미지 문제[^\]]*\]\s*/g, '').trim(),
      image: '', imageAlt: '',
      options: q.options.length === 4 ? q.options : ['', '', '', ''],
      optionImages: ['', '', '', ''],
      answer: q.answer >= 0 ? q.answer + 1 : null,
      explanation: q.explanation,
      explanationImage: '', requiresImage: q.pending, sourceQuestion: q.question,
    });
  }
}
console.log('Created question folders; existing question.json files were left unchanged.');
