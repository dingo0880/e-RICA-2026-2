const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = __dirname;
const allowed = new Set(['index.html', 'styles.css', 'app.js', 'quiz-core.js', 'quiz-data.js', 'assets/arcade.svg', 'assets/DungGeunMo.woff']);
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.woff': 'font/woff' };
http.createServer((req, res) => {
  let file;
  try { file = decodeURIComponent(new URL(req.url, 'http://localhost').pathname).replace(/^\//, '') || 'index.html'; } catch { res.writeHead(400).end(); return; }
  if (!allowed.has(file)) { res.writeHead(404).end('Not found'); return; }
  fs.readFile(path.join(root, file), (error, data) => {
    if (error) { res.writeHead(404).end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(data);
  });
}).listen(4173, '127.0.0.1', () => {
  console.log('E-RICA 퀴즈: http://localhost:4173 (종료: Ctrl+C)');
  if (process.argv.includes('--open') && process.platform === 'win32') {
    require('node:child_process').spawn('cmd.exe', ['/c', 'start', '', 'http://localhost:4173'], { windowsHide: true, stdio: 'ignore' }).on('error', () => console.log('브라우저에서 http://localhost:4173 을 열어주세요.'));
  }
}).on('error', error => {
  console.error(error.code === 'EADDRINUSE' ? '4173 포트가 사용 중입니다. 이미 실행한 E-RICA 창이 있다면 http://localhost:4173 을 열어주세요.' : error.message);
  process.exitCode = 1;
});
