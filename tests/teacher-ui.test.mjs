import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import test from 'node:test';

const markup = fs.readFileSync(new URL('../pravni-audit-ai/ucitel/index.html', import.meta.url), 'utf8');
const code = fs.readFileSync(new URL('../pravni-audit-ai/ucitel/teacher.js', import.meta.url), 'utf8');

// A small DOM double deliberately rejects innerHTML. These tests exercise the
// shipped script and its asynchronous state guards, without a browser or SDK.
function boot(configured = true) {
  const ids = new Map(), created = [];
  let document;
  class Element {
    constructor(tag) {
      this.tagName = tag; this.children = []; this.attributes = {}; this.dataset = {}; this.handlers = {};
      this.hidden = false; this.disabled = false; this.className = ''; this._text = ''; this._value = undefined;
      created.push(this);
      this.classList = {
        add: (...values) => { this.className = [...new Set([...this.className.split(' ').filter(Boolean), ...values])].join(' '); },
        remove: (...values) => { this.className = this.className.split(' ').filter(value => !values.includes(value)).join(' '); },
        toggle: (value, force) => { const enabled = force ?? !this.className.split(' ').includes(value); enabled ? this.classList.add(value) : this.classList.remove(value); return enabled; },
        contains: value => this.className.split(' ').includes(value),
      };
    }
    get textContent() { return this._text + this.children.map(child => child.textContent).join(''); }
    set textContent(value) { this._text = String(value ?? ''); this.children = []; }
    set innerHTML(_) { throw new Error('Unsafe innerHTML write'); }
    get value() { return this._value !== undefined ? this._value : this.tagName === 'select' ? this.options[0]?.value || '' : this.tagName === 'option' ? this.textContent : ''; }
    set value(value) { this._value = String(value); }
    get options() { return this.children.filter(child => child.tagName === 'option'); }
    setAttribute(key, value) {
      value = String(value); this.attributes[key] = value;
      if (key === 'id') { this.id = value; ids.set(value, this); }
      if (key === 'class') this.className = value;
      if (key === 'value') this.value = value;
      if (key === 'hidden') this.hidden = true;
      if (key === 'disabled') this.disabled = true;
      if (key.startsWith('data-')) this.dataset[key.slice(5).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())] = value;
    }
    getAttribute(key) { return this.attributes[key]; }
    append(...nodes) {
      for (const node of nodes) {
        if (node.tagName === '#fragment') { this.append(...node.children); continue; }
        node.parentElement = this; this.children.push(node);
      }
    }
    replaceChildren(...nodes) { this._text = ''; this.children = []; this.append(...nodes); }
    remove() { if (this.parentElement) this.parentElement.children = this.parentElement.children.filter(node => node !== this); }
    addEventListener(type, handler) { (this.handlers[type] ??= []).push(handler); }
    async fire(type, event = {}) { for (const handler of this.handlers[type] || []) await handler({ target: this, ...event }); }
    focus() { document.activeElement = this; }
    scrollIntoView() {}
    click() { return this.fire('click'); }
    cloneNode(deep) {
      const clone = new Element(this.tagName); clone._text = this._text; clone._value = this._value; clone.className = this.className; clone.dataset = { ...this.dataset };
      if (deep) clone.append(...this.children.map(child => child.cloneNode(true)));
      return clone;
    }
    querySelectorAll(selector) {
      const result = [];
      function walk(element) { for (const child of element.children) { if (selector === '[data-student-id]' && child.dataset.studentId !== undefined) result.push(child); walk(child); } }
      walk(this); return result;
    }
  }
  const root = new Element('root'), stack = [root], voidElements = new Set(['meta', 'link', 'input', 'br', 'hr', 'img', 'source']);
  for (const match of markup.matchAll(/<\/?([a-z][a-z0-9-]*)([^>]*)>|([^<]+)/gi)) {
    if (match[3]) { const text = new Element('#text'); text.textContent = match[3]; stack.at(-1).append(text); continue; }
    const tag = match[1].toLowerCase();
    if (match[0].startsWith('</')) { if (stack.length > 1) stack.pop(); continue; }
    const element = new Element(tag);
    for (const attribute of match[2].matchAll(/([\w-]+)(?:="([^"]*)")?/g)) element.setAttribute(attribute[1], attribute[2] ?? '');
    stack.at(-1).append(element); if (!voidElements.has(tag)) stack.push(element);
  }
  const body = created.find(element => element.tagName === 'body');
  document = { getElementById: id => ids.get(id) || null, createElement: tag => new Element(tag), createDocumentFragment: () => new Element('#fragment'), body, activeElement: body };
  let authCallback;
  const watches = [], details = [], histories = [];
  const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
  const store = {
    configured,
    teacherOnAuth: callback => { authCallback = callback; callback({ user: null, authorized: false }); return () => {}; },
    teacherSignIn: async () => {}, teacherSignOut: async () => { authCallback({ user: null, authorized: false }); },
    watchStudents: (next, error) => { const watch = { next, error, stopped: false }; watches.push(watch); return () => { watch.stopped = true; }; },
    studentDetails: id => { const detail = { id, ...deferred() }; details.push(detail); return detail.promise; },
    caseHistory: (id, caseId) => { const history = { id, caseId, ...deferred() }; histories.push(history); return history.promise; },
  };
  const window = { AuditStore: store, addEventListener() {}, print() {}, location: { reload() {} } };
  vm.runInNewContext(code, { window, document, URL, Blob, setTimeout, Intl });
  return { $: id => ids.get(id), auth: value => authCallback(value), watches, details, histories, created };
}
const tick = async () => { await Promise.resolve(); await Promise.resolve(); };
const savedAt = '2026-11-23T23:30:00.000Z';
const summary = revision => ({ revision, savedAt, hasContent: true, hasAi: true, hasEvidence: true, hasConclusion: true, complete: false });
const student = (id, displayName, revision = 1) => ({ id, displayName, joinedAt: savedAt, lastSavedAt: savedAt, caseSummaries: { '0': summary(revision) } });
const record = ai => ({ tool: 'AI', checkedAt: '2026-11-24', ai, law: '§ 75', effective: '2026-11-01', source: 'javascript:alert(1)', quote: '<script>alert(1)</script>', meaning: 'Výklad', verdict: 'Nesprávná', assessment: 'Odůvodnění', advice: 'Rada', readConfirmed: true, complete: false });
const workspace = (profile, ai, revision = 1) => ({ student: profile, records: { '0': { record: record(ai), revision, savedAt } } });

test('static teacher UI: privacy, freshness and asynchronous review flow', async t => {
  const app = boot(), teacher = { uid: 'teacher', email: 'verified@example.com', emailVerified: true };
  const a = student('a', '<img src=x onerror=alert(1)>'), b = student('b', 'Bára');
  let lateA, lateB;
  const open = async id => {
    const button = app.$('rosterBody').querySelectorAll('[data-student-id]').find(element => element.dataset.studentId === id && element.dataset.action === 'open');
    assert.ok(button); await button.fire('click');
  };
  await t.test('unauthorized and unverified identities cannot see data or email', () => {
    assert.equal(app.$('dashboard').hidden, true); assert.equal(app.$('authState').hidden, false);
    app.auth({ user: { uid: 'wrong', email: 'unverified@example.com', emailVerified: false }, authorized: true });
    assert.equal(app.$('dashboard').hidden, true); assert.equal(app.$('teacherIdentity').textContent, '');
  });
  await t.test('only a server-confirmed snapshot is called current', () => {
    app.auth({ user: teacher, authorized: true }); assert.equal(app.$('dashboard').hidden, false); assert.equal(app.watches.length, 1);
    app.watches[0].next([a, b], { fromCache: true }); assert.notEqual(app.$('liveStatus').textContent, 'Přehled je aktuální'); assert.equal(app.$('rosterError').hidden, false);
    assert.equal(app.$('rosterBody').textContent, ''); assert.equal(app.$('studentCount').textContent, '0');
    app.watches[0].next([a, b], { fromCache: false }); assert.equal(app.$('liveStatus').textContent, 'Přehled je aktuální'); assert.equal(app.$('rosterError').hidden, true);
  });
  await t.test('HTML in a student name stays literal text', () => {
    assert.ok(app.$('rosterBody').textContent.includes('<img src=x onerror=alert(1)>')); assert.ok(!app.created.some(element => element.tagName === 'img'));
  });
  await t.test('record HTML stays text and an unsafe source is not linked', async () => {
    await open('a'); assert.equal(app.details.length, 1); app.details[0].resolve(workspace(a, 'CURRENT ONE')); await tick();
    assert.equal(app.$('detailBody').hidden, false); assert.ok(app.$('recordFields').textContent.includes('CURRENT ONE')); assert.ok(app.$('recordFields').textContent.includes('javascript:alert(1)'));
    assert.ok(!app.created.some(element => element.tagName === 'a' && element.href?.startsWith('javascript:')));
  });
  await t.test('duplicates and unrelated student changes do not refetch the detail', () => {
    app.watches[0].next([a, b], { fromCache: false }); assert.equal(app.details.length, 1);
    app.watches[0].next([a, student('b', 'Bára', 2)], { fromCache: false }); assert.equal(app.details.length, 1);
  });
  await t.test('a selected revision refreshes the detail but keeps an open historical version', async () => {
    app.$('historyPanel').open = true; await app.$('historyPanel').fire('toggle'); assert.equal(app.histories.length, 1);
    const old = { id: 'history-1', caseId: '0', record: record('FROZEN HISTORICAL'), revision: 1, savedAt };
    app.histories[0].resolve([old]); await tick(); app.$('historySelect').value = 'history-1'; await app.$('historySelect').fire('change');
    assert.ok(app.$('recordFields').textContent.includes('FROZEN HISTORICAL'));
    const a2 = student('a', a.displayName, 2); app.watches[0].next([a2, b], { fromCache: false }); assert.equal(app.details.length, 2);
    app.details[1].resolve(workspace(a2, 'NEW CURRENT', 2)); await tick(); assert.ok(app.$('recordFields').textContent.includes('FROZEN HISTORICAL')); assert.equal(app.histories.length, 2);
    app.histories[1].resolve([]); await tick(); assert.ok(app.$('recordFields').textContent.includes('FROZEN HISTORICAL')); assert.equal(app.$('historicalNotice').hidden, false);
  });
  await t.test('a same-user token refresh preserves the selected historical view', () => {
    app.auth({ user: teacher, authorized: true }); assert.equal(app.watches.length, 1); assert.ok(app.$('recordFields').textContent.includes('FROZEN HISTORICAL'));
  });
  await t.test('date filtering uses Prague time across UTC midnight', async () => {
    app.$('dateFilter').value = '2026-11-24'; await app.$('dateFilter').fire('change'); assert.equal(app.$('rosterTableWrap').hidden, false);
    app.$('dateFilter').value = '2026-11-23'; await app.$('dateFilter').fire('change'); assert.equal(app.$('rosterTableWrap').hidden, true); await app.$('resetFilters').fire('click');
  });
  await t.test('selecting another student ignores a stale earlier response', async () => {
    await open('a'); lateA = app.details.at(-1); await open('b'); lateB = app.details.at(-1);
    lateA.resolve(workspace(a, 'STALE STUDENT A')); await tick(); assert.equal(app.$('detailTitle').textContent, 'Bára'); assert.equal(app.$('detailBody').hidden, true);
  });
  await t.test('signout clears private content and ignores pending responses', async () => {
    app.$('nameFilter').value='Bára'; app.$('dateFilter').value='2026-11-24'; app.$('caseFilter').value='6';
    app.auth({ user: null, authorized: false });
    assert.equal(app.$('nameFilter').value,''); assert.equal(app.$('dateFilter').value,''); assert.equal(app.$('caseFilter').value,'all');
    assert.ok(app.$('detailCase').options.every(option=>!option.textContent.includes('rozpracováno')));
    lateB.resolve(workspace(b, 'PRIVATE AFTER LOGOUT')); await tick();
    assert.equal(app.$('dashboard').hidden, true); assert.equal(app.$('recordFields').textContent, ''); assert.equal(app.$('rosterBody').textContent, ''); assert.equal(app.watches[0].stopped, true);
  });
  await t.test('unconfigured storage shows setup information without sign-in', () => {
    const empty = boot(false); assert.equal(empty.$('setupState').hidden, false); assert.equal(empty.$('authState').hidden, true);
  });
  await t.test('auth callback errors stay visible without unlocking data', () => {
    const failing = boot();
    failing.auth({ user: null, authorized: false, error: { code: 'STORAGE_UNAVAILABLE', message: 'Ověření přihlášení se nezdařilo.' } });
    assert.equal(failing.$('dashboard').hidden, true); assert.equal(failing.$('authMessage').hidden, false);
    assert.equal(failing.$('authMessage').textContent, 'Ověření přihlášení se nezdařilo.');
    failing.auth({ user: null, authorized: false, error: { code: 'COURSE_NOT_CONFIGURED' } });
    assert.equal(failing.$('dashboard').hidden, true); assert.equal(failing.$('setupState').hidden, false); assert.equal(failing.$('authState').hidden, true);
  });
});


test('teacher opens the most recently selected case even before the student writes an answer', async () => {
  const app=boot();
  const enrolled=student('a','Student A');
  app.auth({user:{uid:'teacher',emailVerified:true},authorized:true});
  app.watches[0].next([enrolled],{fromCache:false});
  assert.match(app.$('rosterBody').textContent,/Volba případu zatím nezaznamenána/);
  app.watches[0].next([{...enrolled,selectedCaseId:'4'}],{fromCache:false});
  const selected=app.$('rosterBody').querySelectorAll('[data-student-id]').find(button=>button.dataset.action==='choice');
  assert.match(selected.textContent,/5\. Výpověď zaměstnance/);
  assert.match(app.$('rosterBody').textContent,/1\. Dvě dohody/);
  await selected.fire('click');
  app.details[0].resolve(workspace(enrolled,'Původní zápis u případu 1'));
  await tick();
  assert.equal(app.$('detailCase').value,'4');
  assert.equal(app.$('recordEmpty').hidden,false);
  assert.equal(app.$('recordFields').textContent,'');
});
