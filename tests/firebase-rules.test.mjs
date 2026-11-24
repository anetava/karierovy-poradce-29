import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import test, { before, beforeEach, after } from 'node:test';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import {
  collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc,
  writeBatch, serverTimestamp, Timestamp, setLogLevel,
} from 'firebase/firestore';
import { getApps, deleteApp } from 'firebase/app';
import { createAuditStore, normalizeRecord } from '../src/firebase-store.js';

const PROJECT = 'demo-pravni-audit';
const ROOT = 'courses/pravni-audit-ai/students';
const OWNER_EMAIL = 'aneta.vadovicova@gmail.com';
let env;
const blank = (patch = {}) => ({ tool: '', checkedAt: '', ai: '', law: '', effective: '', source: '', quote: '', meaning: '', verdict: '', assessment: '', advice: '', readConfirmed: false, complete: false, completedAt: '', ...patch });
const complete = (patch = {}) => blank({ tool: 'Vlastní AI', checkedAt: '2026-11-23', ai: 'Odpověď modelu', law: 'Zákoník práce, § 75', effective: '2026-01-01', source: 'https://www.e-sbirka.cz/sb/2006/262', quote: 'Citace ověřeného ustanovení', meaning: 'Výklad aplikovaný na konkrétní případ', verdict: 'Částečně správná', assessment: 'Odůvodnění rozdílu', advice: 'Srozumitelné doporučení', readConfirmed: true, complete: true, completedAt: '2026-11-23T09:20:00.000Z', ...patch });
const anonymous = uid => env.authenticatedContext(uid, { firebase: { sign_in_provider: 'anonymous' } }).firestore();
const teacher = (uid = 'teacher', overrides = {}) => env.authenticatedContext(uid, { email: OWNER_EMAIL, email_verified: true, firebase: { sign_in_provider: 'google.com' }, ...overrides }).firestore();
function summary(record, revision, savedAt) {
  const text = key => typeof record[key] === 'string' ? record[key].trim() : '';
  return { revision, savedAt, complete: record.complete, hasAi: Boolean(text('ai')), hasEvidence: Boolean(text('law') && text('source') && text('quote')), hasConclusion: Boolean(text('assessment') && text('advice')), hasContent: ['tool', 'checkedAt', 'ai', 'law', 'effective', 'source', 'quote', 'meaning', 'verdict', 'assessment', 'advice'].some(key => text(key)) };
}
async function createProfile(db, uid, patch = {}) {
  return setDoc(doc(db, ROOT, uid), { displayName: `Student ${uid}`, joinedAt: serverTimestamp(), noticeVersion: '2026-11-23', lastSavedAt: null, lastCaseId: null, caseSummaries: {}, ...patch });
}
function saveBatch(db, uid, { id = '0', record = blank({ ai: 'První odpověď' }), revision = 1, mutation = randomUUID(), savedAt = serverTimestamp(), casePatch = {}, historyPatch = {}, profilePatch = {}, summaryPatch = {}, omitCase = false, omitHistory = false, omitProfile = false } = {}) {
  const batch = writeBatch(db);
  if (!omitCase) batch.set(doc(db, ROOT, uid, 'cases', id), { record, revision, lastMutationId: mutation, savedAt, ...casePatch });
  if (!omitHistory) batch.set(doc(db, ROOT, uid, 'cases', id, 'history', mutation), { record, revision, baseRevision: revision - 1, mutationId: mutation, savedAt, ...historyPatch });
  if (!omitProfile) batch.update(doc(db, ROOT, uid), { lastSavedAt: savedAt, lastCaseId: id, [`caseSummaries.${id}`]: { ...summary(record, revision, savedAt), ...summaryPatch }, ...profilePatch });
  return { commit: () => batch.commit(), mutation, id, revision };
}

before(async () => {
  // Never silently run these tests against a signed-in CLI's real project.
  assert.equal(process.env.FIRESTORE_EMULATOR_HOST, '127.0.0.1:8080', 'Run through the loopback Firestore emulator.');
  assert.equal(process.env.FIREBASE_AUTH_EMULATOR_HOST, '127.0.0.1:9099', 'Run through the loopback Auth emulator.');
  setLogLevel('silent');
  env = await initializeTestEnvironment({ projectId: PROJECT, firestore: { host: '127.0.0.1', port: 8080, rules: await readFile(new URL('../firebase/firestore.rules', import.meta.url), 'utf8') } });
});
beforeEach(async () => { await env.clearFirestore(); });
after(async () => {
  await env?.cleanup();
  for (const app of getApps().filter(item => ['audit-student', 'audit-teacher'].includes(item.name))) await deleteApp(app);
});

test('student creates only own anonymous profile; name and identity fields are immutable', async () => {
  const alice = anonymous('alice');
  await assertSucceeds(createProfile(alice, 'alice'));
  await assertFails(createProfile(alice, 'bob'));
  await assertFails(updateDoc(doc(alice, ROOT, 'alice'), { displayName: 'Jiná osoba' }));
  await assertFails(updateDoc(doc(alice, ROOT, 'alice'), { teacher: true }));
  await assertFails(deleteDoc(doc(alice, ROOT, 'alice')));
  await assertFails(createProfile(teacher('teacher'), 'teacher'));
});

test('two students are isolated; the verified Google teacher sees both without write permission', async () => {
  const alice = anonymous('alice'), bob = anonymous('bob'), owner = teacher();
  await createProfile(alice, 'alice'); await createProfile(bob, 'bob');
  await assertSucceeds(saveBatch(alice, 'alice').commit());
  await assertSucceeds(saveBatch(bob, 'bob', { record: blank({ ai: 'Odpověď druhého studenta' }) }).commit());
  assert.equal((await assertSucceeds(getDocs(collection(owner, ROOT)))).size, 2);
  assert.equal((await assertSucceeds(getDoc(doc(owner, ROOT, 'alice', 'cases', '0')))).data().record.ai, 'První odpověď');
  await assertFails(getDocs(collection(alice, ROOT)));
  await assertFails(getDoc(doc(alice, ROOT, 'bob')));
  await assertFails(getDocs(collection(alice, ROOT, 'bob', 'cases')));
  await assertFails(getDocs(collection(alice, ROOT, 'bob', 'cases', '0', 'history')));
  await assertFails(saveBatch(alice, 'bob', { revision: 2 }).commit());
  await assertFails(saveBatch(owner, 'alice', { revision: 2 }).commit());
  await assertFails(deleteDoc(doc(owner, ROOT, 'alice', 'cases', '0')));
});

test('explicit selection is private, optional and independent of answers and timestamps', async () => {
  const alice = anonymous('alice');
  await createProfile(alice, 'alice');
  const own = doc(alice, ROOT, 'alice');
  const teacherView = doc(teacher(), ROOT, 'alice');
  const before = (await getDoc(teacherView)).data();
  assert.equal(before.selectedCaseId, undefined);
  await assertSucceeds(updateDoc(own, {selectedCaseId: '9'}));
  assert.deepEqual((await getDoc(teacherView)).data(), {...before, selectedCaseId: '9'});
  assert.equal((await getDocs(collection(alice, ROOT, 'alice', 'cases'))).size, 0);
  await assertSucceeds(saveBatch(alice, 'alice', {id:'0'}).commit());
  const saved = (await getDoc(teacherView)).data();
  assert.equal(saved.lastCaseId, '0');
  assert.equal(saved.selectedCaseId, '9');
  await assertSucceeds(updateDoc(own, {selectedCaseId: '0'}));
  assert.deepEqual((await getDoc(teacherView)).data(), {...saved, selectedCaseId: '0'});
  for (const user of [teacher(), anonymous('bob'), env.unauthenticatedContext().firestore()]) {
    await assertFails(updateDoc(doc(user, ROOT, 'alice'), {selectedCaseId: '2'}));
  }
  for (const invalid of [{selectedCaseId: 1}, {selectedCaseId: '10'}, {selectedCaseId: null},
    {selectedCaseId: '1', displayName: 'Jiná osoba'}, {selectedCaseId: '2', lastSavedAt: serverTimestamp()},
    {selectedCaseId: '3', caseSummaries: {}}]) {
    await assertFails(updateDoc(own, invalid));
  }
  await assertFails(createProfile(anonymous('bob'), 'bob', {selectedCaseId: '1'}));
});

test('anonymous visitor, wrong email, wrong provider and unverified email cannot read teacher data', async () => {
  const alice = anonymous('alice'); await createProfile(alice, 'alice');
  const denied = [
    env.unauthenticatedContext().firestore(), anonymous('visitor'),
    teacher('wrong-email', { email: 'other@example.com' }),
    teacher('password-account', { firebase: { sign_in_provider: 'password' } }),
    teacher('unverified', { email_verified: false }),
    teacher('anonymous-spoof', { firebase: { sign_in_provider: 'anonymous' } }),
  ];
  for (const db of denied) {
    await assertFails(getDocs(collection(db, ROOT)));
    await assertFails(getDoc(doc(db, ROOT, 'alice')));
  }
});

test('profile creation cannot prefill fabricated progress or unknown role fields', async () => {
  const alice = anonymous('alice');
  await assertFails(createProfile(alice, 'alice', { role: 'teacher' }));
  await assertFails(createProfile(alice, 'alice', { caseSummaries: { '0': { complete: true } } }));
  await assertFails(createProfile(alice, 'alice', { displayName: ' ' }));
  await assertFails(createProfile(alice, 'alice', { joinedAt: Timestamp.fromMillis(1) }));
});

test('save needs matching case, immutable history and truthful roster in one atomic commit', async () => {
  const alice = anonymous('alice'); await createProfile(alice, 'alice');
  for (const omitted of [{ omitCase: true }, { omitHistory: true }, { omitProfile: true }]) await assertFails(saveBatch(alice, 'alice', omitted).commit());
  await assertFails(saveBatch(alice, 'alice', { summaryPatch: { complete: true } }).commit());
  await assertFails(saveBatch(alice, 'alice', { summaryPatch: { hasContent: false } }).commit());
  await assertFails(saveBatch(alice, 'alice', { historyPatch: { record: blank({ ai: 'Podvržená historie' }) } }).commit());
  await assertFails(saveBatch(alice, 'alice', { profilePatch: { 'caseSummaries.1': { complete: true } } }).commit());
  assert.equal((await getDocs(collection(alice, ROOT, 'alice', 'cases'))).size, 0, 'failed batches leave no case or partial history');
  await assertSucceeds(saveBatch(alice, 'alice').commit());
});

test('history-only insertion and modifying an accepted historical version are forbidden', async () => {
  const alice = anonymous('alice'); await createProfile(alice, 'alice');
  const first = saveBatch(alice, 'alice'); await first.commit();
  await assertFails(saveBatch(alice, 'alice', { revision: 2, omitCase: true, omitProfile: true }).commit());
  await assertFails(setDoc(doc(alice, ROOT, 'alice', 'cases', '0', 'history', first.mutation), { record: blank({ ai: 'Přepsaná historie' }) }, { merge: true }));
  await assertFails(deleteDoc(doc(alice, ROOT, 'alice', 'cases', '0', 'history', first.mutation)));
  assert.equal((await getDocs(collection(alice, ROOT, 'alice', 'cases', '0', 'history'))).size, 1);
});

test('revisions advance once; stale revisions, jumps and mutation reuse are denied', async () => {
  const alice = anonymous('alice'); await createProfile(alice, 'alice');
  const first = saveBatch(alice, 'alice'); await first.commit();
  await assertFails(saveBatch(alice, 'alice', { revision: 1 }).commit());
  await assertFails(saveBatch(alice, 'alice', { revision: 3 }).commit());
  await assertFails(saveBatch(alice, 'alice', { revision: 2, mutation: first.mutation }).commit());
  await assertSucceeds(saveBatch(alice, 'alice', { revision: 2, record: blank({ ai: 'Druhá odpověď' }) }).commit());
  assert.equal((await getDoc(doc(alice, ROOT, 'alice', 'cases', '0'))).data().revision, 2);
});

test('incomplete, impossible date, invalid source and fabricated verdict cannot be marked complete', async () => {
  const alice = anonymous('alice'); await createProfile(alice, 'alice');
  const invalid = [
    blank({ complete: true, completedAt: '2026-11-23T09:20:00.000Z' }),
    complete({ readConfirmed: false }), complete({ ai: ' \n ' }),
    complete({ checkedAt: '2026-02-29' }), complete({ effective: '2026-04-31' }),
    complete({ source: 'javascript:alert(1)' }), complete({ verdict: 'Určitě správná' }),
    complete({ completedAt: '2026-02-30T09:20:00.000Z' }),
  ];
  for (const record of invalid) await assertFails(saveBatch(alice, 'alice', { record }).commit());
  await assertSucceeds(saveBatch(alice, 'alice', { record: complete({ checkedAt: '2024-02-29' }) }).commit());
});

test('long legal/AI fields retain limits; wrong types and unknown record keys are rejected', async () => {
  const alice = anonymous('alice'); await createProfile(alice, 'alice');
  await assertFails(saveBatch(alice, 'alice', { record: blank({ ai: 'x'.repeat(60001) }) }).commit());
  await assertFails(saveBatch(alice, 'alice', { record: blank({ quote: 'x'.repeat(12001) }) }).commit());
  await assertFails(saveBatch(alice, 'alice', { record: blank({ advice: 123 }) }).commit());
  await assertFails(saveBatch(alice, 'alice', { record: blank({ role: 'teacher' }) }).commit());
  await assertSucceeds(saveBatch(alice, 'alice', { record: blank({ ai: 'x'.repeat(60000), quote: 'x'.repeat(12000), meaning: 'x'.repeat(20000), assessment: 'x'.repeat(20000), advice: 'x'.repeat(20000) }) }).commit());
});

test('clearing a saved case clears progress but keeps both history entries', async () => {
  const alice = anonymous('alice'); await createProfile(alice, 'alice');
  await saveBatch(alice, 'alice', { record: complete() }).commit();
  await assertSucceeds(saveBatch(alice, 'alice', { revision: 2, record: blank({ readConfirmed: true }) }).commit());
  const profile = (await getDoc(doc(teacher(), ROOT, 'alice'))).data();
  assert.equal(profile.caseSummaries['0'].hasContent, false);
  assert.equal(profile.caseSummaries['0'].complete, false);
  assert.equal((await getDocs(collection(teacher(), ROOT, 'alice', 'cases', '0', 'history'))).size, 2);
});

test('client timestamps, other course paths and out-of-range case ids are refused', async () => {
  const alice = anonymous('alice'); await createProfile(alice, 'alice');
  await assertFails(saveBatch(alice, 'alice', { savedAt: Timestamp.fromMillis(1) }).commit());
  await assertFails(saveBatch(alice, 'alice', { id: '10' }).commit());
  await assertFails(setDoc(doc(alice, 'courses', 'other-course', 'students', 'alice'), { displayName: 'Alice' }));
  await assertFails(getDocs(collection(teacher(), 'courses', 'other-course', 'students')));
});

test('old enrollment never expires; new writes retain server timestamps', async () => {
  const alice = anonymous('alice');
  await env.withSecurityRulesDisabled(async context => {
    await setDoc(doc(context.firestore(), ROOT, 'alice'), { displayName: 'Student Alice', joinedAt: Timestamp.fromDate(new Date('2020-01-01T00:00:00Z')), noticeVersion: '2026-11-23', lastSavedAt: null, lastCaseId: null, caseSummaries: {} });
  });
  await assertSucceeds(saveBatch(alice, 'alice').commit());
  const record = (await getDoc(doc(alice, ROOT, 'alice', 'cases', '0'))).data();
  assert.ok(record.savedAt.toMillis() > Date.now() - 60000);
});

test('adapter fails closed without config or when emulator is requested outside loopback', async () => {
  const empty = createAuditStore(null);
  assert.equal(empty.configured, false);
  await assert.rejects(empty.ready(), error => error.status === 503 && error.code === 'COURSE_NOT_CONFIGURED');
  const remoteEmulator = createAuditStore({ apiKey: 'demo-key', appId: 'demo-app', authDomain: `${PROJECT}.firebaseapp.com`, projectId: PROJECT, emulator: true }, { hostname: 'anetava.github.io' });
  assert.equal(remoteEmulator.configured, false);
  await assert.rejects(remoteEmulator.start('Student Alice'), error => error.code === 'COURSE_NOT_CONFIGURED');
  assert.equal(getApps().some(app => app.name === 'audit-student'), false, 'unconfigured calls must not initialize Auth');
});

test('adapter anonymous start/retry/resume/save is idempotent and forget changes only student identity', async () => {
  const store = createAuditStore({ apiKey: 'demo-api-key', appId: 'demo-app', authDomain: `${PROJECT}.firebaseapp.com`, projectId: PROJECT, emulator: true }, { hostname: '127.0.0.1' });
  assert.equal(store.configured, true);
  assert.deepEqual(await store.ready(), { uid: null }, 'ready never signs a student in');
  const [first, repeat] = await Promise.all([store.start('Student Alice'), store.start('Student Alice')]);
  assert.equal(first.studentId, repeat.studentId);
  assert.equal(first.token, first.studentId);
  assert.equal(first.room.id, 'pravni-audit-ai');
  assert.deepEqual(first.records, {});
  await store.selectCase(first.studentId, '5');
  await store.selectCase(first.studentId, 5);
  const profile = (await getDoc(doc(teacher(), ROOT, first.studentId))).data();
  assert.equal(profile.selectedCaseId, '5');
  assert.equal(profile.lastSavedAt, null);
  assert.deepEqual(profile.caseSummaries, {});
  await assert.rejects(store.selectCase('someone-else', 0), error => error.status === 401);
  await assert.rejects(store.selectCase(first.studentId, 10), error => error.status === 422);
  await assert.rejects(store.start('Student Bob'), error => error.status === 409 && error.code === 'ENTRY_NAME_MISMATCH');
  await assert.rejects(store.resume('someone-else'), error => error.status === 401);
  const op = { record: blank({ ai: 'Moje skutečná práce' }), baseRevision: 0, mutationId: randomUUID() };
  const saved = await store.save(first.studentId, '0', op);
  const retry = await store.save(first.studentId, '0', op);
  assert.deepEqual(saved, retry);
  assert.equal(saved.revision, 1);
  assert.match(saved.savedAt, /^\d{4}-\d{2}-\d{2}T/);
  const restored = await store.resume(first.studentId);
  assert.equal(restored.records['0'].record.ai, op.record.ai);
  await assert.rejects(store.save(first.studentId, '0', { ...op, mutationId: randomUUID() }), error => error.status === 409 && error.code === 'REVISION_CONFLICT');
  await assert.rejects(store.save(first.studentId, '0', { ...op, record: blank({ ai: 'Jiný obsah se stejným ID' }) }), error => error.status === 409 && error.code === 'MUTATION_REUSED');
  await assert.rejects(store.save(first.studentId, '1', { ...op, mutationId: randomUUID(), record: blank({ complete: true }) }), error => error.status === 422);
  const owner = teacher();
  assert.equal((await getDocs(collection(owner, ROOT, first.studentId, 'cases', '0', 'history'))).size, 1);
  let authState;
  const stop = store.teacherOnAuth(state => { authState = state; });
  await new Promise(resolve => setTimeout(resolve, 30));
  assert.equal(authState?.authorized, false);
  assert.equal(authState?.error, undefined, 'teacher Auth initialization must succeed independently of the student');
  const teacherApp = getApps().find(app => app.name === 'audit-teacher');
  assert.ok(teacherApp);
  await store.forget();
  assert.equal(getApps().find(app => app.name === 'audit-teacher'), teacherApp, 'student forget preserves teacher client');
  assert.deepEqual(await store.ready(), { uid: null });
  await assert.rejects(store.resume(first.studentId), error => error.status === 401);
  const second = await store.start('Student Bob');
  assert.notEqual(second.studentId, first.studentId);
  assert.deepEqual(second.records, {});
  assert.equal((await getDocs(collection(owner, ROOT))).size, 2);
  stop();
  await store.forget();
});

test('normalization preserves long drafts and rejects fake completion before any network write', () => {
  assert.equal(normalizeRecord({ ai: 'x'.repeat(60000) }).ai.length, 60000);
  assert.throws(() => normalizeRecord(complete({ checkedAt: '2026-02-29' })), error => error.code === 'INCOMPLETE_RECORD');
  assert.throws(() => normalizeRecord({ ai: 'x'.repeat(60001) }), error => error.code === 'FIELD_LIMIT');
});
