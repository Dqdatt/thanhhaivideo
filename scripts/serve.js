// Xem thử bản build trên máy: node scripts/serve.js  ->  http://localhost:4000
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', 'dist');
const PORT = Number(process.env.PORT) || 4000;
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'application/javascript', '.json': 'application/json', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif', '.avif': 'image/avif', '.ico': 'image/x-icon', '.svg': 'image/svg+xml', '.txt': 'text/plain' };

http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p.endsWith('/')) p += 'index.html';
  const file = path.join(ROOT, path.normalize(p));
  if (!file.startsWith(ROOT)) return res.writeHead(403).end();
  fs.readFile(file, (err, data) => {
    if (err) {
      // /admin -> /admin/
      if (fs.existsSync(path.join(file, 'index.html'))) return res.writeHead(301, { Location: p + '/' }).end();
      return res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' }).end(fs.readFileSync(path.join(ROOT, '404.html')));
    }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(data);
  });
}).listen(PORT, () => console.log(`Xem thử: http://localhost:${PORT}  (admin: http://localhost:${PORT}/admin/)`));
