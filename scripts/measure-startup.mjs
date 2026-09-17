import { readFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';

// Measure scripts referenced by the prerendered entry page, excluding feature
// chunks fetched later and legacy-only nomodule polyfills. Run after a
// production build; gzip estimates transfer size, not deployment load time.
const html = await readFile('.next/server/app/index.html', 'utf8');
const scripts = [...html.matchAll(/<script\b[^>]*>/g)].map((match) => match[0]);
const files = [...new Set(scripts
  .filter((tag) => !/nomodule/i.test(tag))
  .map((tag) => /src="(\/_next\/[^"?]+\.js)/.exec(tag)?.[1])
  .filter(Boolean))];
if (!files.length) throw new Error('No startup scripts found in the production HTML');
const chunks = await Promise.all(files.map(async (file) => {
  const bytes = await readFile(`.next/${file.slice('/_next/'.length)}`);
  return { file, bytes: bytes.length, gzipBytes: gzipSync(bytes, { level: 9 }).length };
}));
console.log(JSON.stringify({
  chunks,
  totalBytes: chunks.reduce((total, chunk) => total + chunk.bytes, 0),
  totalGzipBytes: chunks.reduce((total, chunk) => total + chunk.gzipBytes, 0),
}, null, 2));
