const http = require('http');
const fs = require('fs');
const server = http.createServer((req, res) => {
  fs.readFile(__dirname + '/index.html', (err, data) => {
    if (err) { res.writeHead(500); res.end('Preview could not be loaded'); return; }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(data);
  });
});
server.listen(4174, '0.0.0.0');

