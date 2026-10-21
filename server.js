const http = require('http');
const fs = require('fs');
const path = require('path');
const root = __dirname;
const server = http.createServer((req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  const allowed = {
    '/': ['index.html', 'text/html; charset=utf-8'],
    '/index.html': ['index.html', 'text/html; charset=utf-8'],
    '/mascot-kitchen.png': ['mascot-kitchen.png', 'image/png'],
  };
  const entry = allowed[pathname];
  if (!entry) { res.writeHead(404); res.end('Not found'); return; }
  const [name, contentType] = entry;
  const file = path.join(root, name);
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(500); res.end('Preview could not be loaded'); return; }
    res.writeHead(200, { 'Content-Type': contentType, 'Cache-Control': 'no-store' });
    res.end(data);
  });
});
server.listen(4174, '127.0.0.1');

