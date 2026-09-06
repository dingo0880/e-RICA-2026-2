const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = process.argv.includes('--dist') ? path.join(__dirname, 'dist') : __dirname;
const port = Number(process.argv.find(arg => arg.startsWith('--port='))?.split('=')[1] || 4173);
const url = `http://localhost:${port}`;
const openBrowser = () => {
  if (process.platform === 'win32') require('node:child_process').spawn('cmd.exe', ['/c', 'start', '', url], { windowsHide: true, stdio: 'ignore' }).on('error', () => console.log(`Open ${url} in your browser.`));
};
const allowed = new Set(['index.html', 'styles.css', 'tablet.css', 'app.js', 'quiz-core.js', 'quiz-data.js', 'assets/arcade.svg', 'assets/DungGeunMo.woff']);
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.woff': 'font/woff', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.avif': 'image/avif' };
http.createServer((req, res) => {
  let file;
  try { file = decodeURIComponent(new URL(req.url, 'http://localhost').pathname).replace(/^\//, '') || 'index.html'; } catch { res.writeHead(400).end(); return; }
  const questionImage = /^questions\/[a-z0-9-]+\/level-\d{2}\/question-\d{2}\/[^/\\]+\.(png|jpg|jpeg|webp|gif|avif|svg)$/.test(file);
  if (!allowed.has(file) && !questionImage) { res.writeHead(404).end('Not found'); return; }
  fs.readFile(path.join(root, file), (error, data) => {
    if (error) { res.writeHead(404).end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(data);
  });
}).listen(port, '127.0.0.1', () => {
  console.log(`E-RICA Quiz: ${url} (Stop: Ctrl+C)`);
  if (process.argv.includes('--open')) openBrowser();
}).on('error', error => {
  if (error.code === 'EADDRINUSE' && process.argv.includes('--open')) {
    console.log(`E-RICA Quiz is already running: ${url}`);
    openBrowser();
    return;
  }
  console.error(error.code === 'EADDRINUSE' ? `${port} is already in use. Open ${url}.` : error.message);
  process.exitCode = 1;
});
