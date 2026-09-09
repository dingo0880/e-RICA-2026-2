const fs = require('node:fs');
const path = require('node:path');
const { buildData } = require('./build-data.cjs');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'dist');
const games = buildData();
// Only the fixed generated dist directory is replaced; authoring files are untouched.
if (path.dirname(out) !== root || path.basename(out) !== 'dist') throw new Error('Invalid output directory');
fs.rmSync(out, { force: true, recursive: true });
fs.mkdirSync(out, { recursive: true });
const copy = relative => {
  const destination = path.join(out, relative);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(path.join(root, relative), destination);
};
for (const file of ['index.html', 'styles.css', 'tablet.css', 'reaction.css', 'reaction-core.js', 'reaction-ui.js', 'app.js', 'quiz-core.js', 'quiz-data.js', 'ASSETS.md']) copy(file);
function copyDirectory(relative) {
  for (const item of fs.readdirSync(path.join(root, relative), { withFileTypes: true })) {
    const name = path.join(relative, item.name);
    if (item.isDirectory()) copyDirectory(name);
    else if (item.isFile()) copy(name);
  }
}
copyDirectory('assets');
for (const q of games.flatMap(g => g.levels.flat())) {
  for (const image of [q.image, ...q.optionImages, q.explanationImage].filter(Boolean)) copy(decodeURIComponent(image));
}
fs.writeFileSync(path.join(out, '.nojekyll'), '');
console.log('Built dist/ for GitHub Pages. Laptop archive and test records are not included.');
