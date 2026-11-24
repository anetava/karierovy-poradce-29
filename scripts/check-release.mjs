import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, dirname, relative } from 'node:path';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import vm from 'node:vm';

const root = resolve('pravni-audit-ai');
function files(dir) {
  return readdirSync(dir, {withFileTypes:true}).flatMap(x => x.isDirectory() ? files(resolve(dir,x.name)) : [resolve(dir,x.name)]);
}
const sources = files(root).filter(x => /\.(html|css|js)$/.test(x));
for (const path of sources) {
  const text = readFileSync(path,'utf8');
  assert(!/chatgpt\.site|AUDIT_CLASSROOM_API|\/api\/student\//.test(text), `Odmítnuté napojení: ${relative(root,path)}`);
  if (path.endsWith('.js')) new vm.Script(text, {filename:path});
  if (path.endsWith('.html')) {
    for (const script of text.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)) new vm.Script(script[1], {filename:path});
    for (const item of text.matchAll(/(?:src|href)="([^"#]+)"/g)) {
      const url = item[1];
      if (/^(?:https?:|mailto:|data:)/.test(url)) continue;
      assert(existsSync(resolve(dirname(path),url.split(/[?#]/)[0])), `Chybějící lokální soubor ${path}: ${url}`);
    }
  }
}
const hash = value => createHash('sha256').update(value).digest('hex');
// Otisky původních, obsahově neměněných karet před převodem ukládání.
const BASE_CASES_SHA256 = '3d8306f6087a3d5f70f4942b275be48ef08da335f3d7f61010ba25622399cefa';
const BASE_ORIGINAL_SHA256 = '43550728484bd9229ffbe9a77fe24f5093361fda37231e6421f3a31863f9ba12';
const current = readFileSync(resolve(root,'index.html'),'utf8');
function casesFrom(html) { return JSON.parse(html.match(/const cases = (\[[\s\S]*?\n\]);/)[1]); }
assert.equal(hash(JSON.stringify(casesFrom(current))),BASE_CASES_SHA256,'Původních 10 případů se změnilo.');
assert.equal(casesFrom(current).length,10);
const rootHtml = readFileSync('index.html', 'utf8');
const currentTeaser = 'Svůj postup doložte konkrétním ustanovením.';
assert.equal(rootHtml.split(currentTeaser).length, 2, 'Změnil se odkaz na audit.');
assert.equal(hash(rootHtml.replace(currentTeaser, 'Výsledky si ponecháte u sebe.')), BASE_ORIGINAL_SHA256, 'Původní karty, obrázky nebo navigace se změnily.');
const learning={window:{}};
vm.runInNewContext(readFileSync(resolve(root,'learning-content.js'),'utf8'),learning);
assert.equal(learning.window.AuditLearningContent.slides.length,28);
assert(!/<script[^>]+src=["'](?:firebase-store|classroom)\.js/.test(current), 'Samostatný nácvik nesmí spouštět sdílené ukládání.');
assert(!current.includes('id="auditFields" disabled'), 'Pracovní list musí být dostupný bez přihlášení.');
const rulesHash = hash(readFileSync('firebase/firestore.rules'));
assert(readFileSync('scripts/verify-live-firebase.py','utf8').includes(rulesHash),
  'Kontrolní skript používá odlišnou verzi pravidel.');
assert(readFileSync('scripts/upgrade-selection-rules.py','utf8').includes(rulesHash),
  'Migrační skript používá odlišnou verzi pravidel.');

const config={window:{}};
vm.runInNewContext(readFileSync(resolve(root,'firebase-config.js'),'utf8'),config);
const value=config.window.AUDIT_FIREBASE_CONFIG;
if(process.argv.includes('--ready')) {
  assert(value && ['apiKey','projectId','authDomain','appId'].every(k => typeof value[k] === 'string' && value[k].trim()), 'Nasazení blokováno: chybí ověřená veřejná konfigurace Firebase.');
  assert(!value.emulator && !value.projectId.startsWith('demo-'),'Nasazení blokováno: testovací konfigurace.');
}
console.log('Zdrojová kontrola OK: zachováno 20 + 10 případů, 28 snímků, žádné napojení na odmítnutý hosting, lokální soubory existují.');
console.log(value ? 'Konfigurace vyplněna; živý přístup a pravidla vyžadují samostatné ověření.' : 'Firebase není připojený. Tuto verzi zatím nenasazovat jako funkční sdílenou aplikaci.');
