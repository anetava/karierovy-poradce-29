import { build } from 'esbuild';
import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

await build({
  entryPoints: ['src/firebase-store.js'],
  bundle: true,
  minify: true,
  target: ['es2020'],
  format: 'iife',
  legalComments: 'eof',
  outfile: 'pravni-audit-ai/firebase-store.js',
  logLevel: 'info',
});

const directory = 'pravni-audit-ai';
const hash = createHash('sha256');
// Include the locally served student document, scripts, styles and images.
// Teacher pages always load from the network, never from the student's cache.
async function hashWorksheetFiles(relativeDirectory = '') {
  const names = await readdir(join(directory, relativeDirectory), { withFileTypes: true });
  for (const entry of names.sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0)) {
    const path = join(relativeDirectory, entry.name);
    if (path === 'ucitel' || path === 'offline-worker.js') continue;
    if (entry.isDirectory()) await hashWorksheetFiles(path);
    else if (entry.isFile()) {
      hash.update(path.split('\\').join('/') + '\0');
      hash.update(await readFile(join(directory, path)));
      hash.update('\0');
    }
  }
}
await hashWorksheetFiles();
const workerPath = join(directory, 'offline-worker.js');
const worker = await readFile(workerPath, 'utf8');
const versionLine = /^const shellVersion = '[0-9a-f]{32}';$/m;
if (!versionLine.test(worker)) throw new Error('V offline-worker.js chybí otisk vydání.');
const version = hash.digest('hex').slice(0, 32);
await writeFile(workerPath, worker.replace(versionLine, "const shellVersion = '" + version + "';"));
