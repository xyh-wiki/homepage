import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const port = Number(process.env.PORT || 4173);
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.xml': 'application/xml; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.json': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json' };

http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', 'http://localhost');
  const decoded = decodeURIComponent(url.pathname);
  const normalized = path.posix.normalize(decoded);
  if (normalized.includes('..')) { res.writeHead(400); res.end('Bad request'); return; }
  let target = path.join(root, normalized);
  try {
    const targetStat = await stat(target);
    if (targetStat.isDirectory()) target = path.join(target, 'index.html');
    const body = await readFile(target);
    res.writeHead(200, { 'Content-Type': types[path.extname(target)] || 'application/octet-stream', 'Cache-Control': target.endsWith('.html') ? 'no-cache' : 'public, max-age=3600' });
    res.end(body);
  } catch {
    const body = await readFile(path.join(root, '404.html'));
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
    res.end(body);
  }
}).listen(port, '0.0.0.0', () => console.log(`Serving ${root} on http://0.0.0.0:${port}`));
