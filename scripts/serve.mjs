import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, sep } from 'node:path';

const root = join(import.meta.dirname, '..');
const port = 5174;
const types = {
  '.css': 'text/css', '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json',
  '.mjs': 'text/javascript', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2',
};

createServer((request, response) => {
  const relative = normalize(decodeURIComponent(new URL(request.url, `http://${request.headers.host}`).pathname))
    .replace(/^([/\\])+/, '');
  let path = join(root, relative);
  if (path !== root && !path.startsWith(root + sep)) {
    response.writeHead(403).end('Forbidden');
    return;
  }
  try {
    if (statSync(path).isDirectory()) path = join(path, 'index.html');
    response.setHeader('Content-Type', types[extname(path).toLowerCase()] ?? 'application/octet-stream');
    createReadStream(path).on('error', () => response.writeHead(404).end('Not found')).pipe(response);
  } catch {
    response.writeHead(404).end('Not found');
  }
}).listen(port, '127.0.0.1', () => console.log(`BF6 Weapon Analyzer: http://localhost:${port}/`));
