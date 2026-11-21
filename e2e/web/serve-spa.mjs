// Serves the `expo export -p web` output with the SPA fallback Cloudflare Pages applies: unknown paths
// get index.html, so deep links load the app. `expo serve` answers them with 404.
import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';

const root = path.resolve(process.argv[2] ?? 'dist');
const port = Number(process.argv[3] ?? 8099);
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.ttf': 'font/ttf', '.ico': 'image/x-icon', '.svg': 'image/svg+xml' };

createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  let file = path.join(root, pathname);
  if (!file.startsWith(root) || !statSync(file, { throwIfNoEntry: false })?.isFile()) file = path.join(root, 'index.html');
  res.writeHead(200, { 'content-type': types[path.extname(file)] ?? 'application/octet-stream' });
  createReadStream(file).pipe(res);
}).listen(port, () => console.log(`serving ${root} on http://localhost:${port}`));
