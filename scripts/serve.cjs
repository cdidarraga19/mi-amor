const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.jpg': 'image/jpeg', '.mp3': 'audio/mpeg' };
http.createServer((req, res) => {
  let filename;
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const parts = pathname.split(/[\\/]/).filter(Boolean);
    if (parts.some(part => part.startsWith('.')) || (parts.length && !['index.html', 'css', 'js', 'json', 'img', 'musica'].includes(parts[0]))) {
      res.writeHead(403).end(); return;
    }
    filename = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!filename.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  } catch { res.writeHead(400).end(); return; }
  fs.readFile(filename, (error, data) => {
    if (error) { res.writeHead(404).end('No encontrado'); return; }
    res.writeHead(200, { 'Content-Type': types[path.extname(filename)] || 'application/octet-stream' });
    res.end(data);
  });
}).listen(8080, '127.0.0.1', () => console.log('Abre http://localhost:8080'));
