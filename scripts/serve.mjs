#!/usr/bin/env node
/**
 * Static server for local checking. Netlify serves public/ in production, so
 * this only needs to do the same thing with correct content types.
 *
 *   npm run serve
 */
import { createServer } from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = fileURLToPath(new URL('../public/', import.meta.url));
const PORT = Number(process.env.PORT ?? 4173);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml'
};

createServer((request, response) => {
  const url = new URL(request.url, `http://localhost:${PORT}`);
  const requested = path.normalize(path.join(ROOT, decodeURIComponent(url.pathname)));
  if (!requested.startsWith(ROOT)) {
    response.writeHead(403).end('Forbidden');
    return;
  }

  let file = requested;
  try {
    if (statSync(file).isDirectory()) file = path.join(file, 'index.html');
  } catch {
    response.writeHead(404).end('Not found');
    return;
  }

  try {
    statSync(file);
  } catch {
    response.writeHead(404).end('Not found');
    return;
  }

  response.writeHead(200, {
    'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream',
    'cache-control': 'no-store'
  });
  createReadStream(file).pipe(response);
}).listen(PORT, () => {
  console.log(`Serving public/ on http://localhost:${PORT}`);
});
