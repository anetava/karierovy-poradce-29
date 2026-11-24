import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { setTimeout } from 'node:timers/promises';
import test from 'node:test';
import { deleteApp, getApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { createAuditStore, TEACHER_EMAIL } from '../src/firebase-store.js';

test('a live teacher listener, details, revisions and sign-out with two anonymous students', {timeout: 35000}, async t => {
  assert.equal(process.env.FIREBASE_AUTH_EMULATOR_HOST, '127.0.0.1:9099');
  assert.equal(process.env.FIRESTORE_EMULATOR_HOST, '127.0.0.1:8080');
  const store = createAuditStore({
    emulator: true, projectId: 'demo-pravni-audit', apiKey: 'local-demo-key', appId: 'local-test-app',
    authDomain: 'demo-pravni-audit.firebaseapp.com',
  }, {hostname: '127.0.0.1'});
  t.after(async () => { await Promise.all(getApps().map(deleteApp)); });
  let authState;
  const stopAuth = store.teacherOnAuth(state => { authState = state; });
  t.after(stopAuth);
  async function waitFor(check) {
    for (let i = 0; i < 300; i++) {
      if (check()) return;
      await setTimeout(25);
    }
    assert.fail('Expected emulator event did not arrive.');
  }
  await waitFor(() => authState !== undefined);
  assert.equal(authState.authorized, false);
  const first = await store.start('Testovací student A');
  const save = (uid, ai, baseRevision = 0) => store.save(uid, 0, {record: {ai}, baseRevision, mutationId: randomUUID()});
  await save(first.studentId, 'První zápis');
  await store.forget();
  const second = await store.start('Testovací student B');
  assert.notEqual(first.studentId, second.studentId);
  await save(second.studentId, 'Druhý zápis');
  await assert.rejects(store.studentDetails(first.studentId), {code: 'TEACHER_SIGN_IN_REQUIRED'});

  const auth = getAuth(getApp('audit-teacher'));
  // Federated identities are confined to the verified local Auth emulator.
  const signIn = email => signInWithCredential(auth, GoogleAuthProvider.credential(JSON.stringify({
    sub: randomUUID(), email, email_verified: true,
  })));
  await signIn('jina-vyucujici@example.org');
  await waitFor(() => authState.user?.email === 'jina-vyucujici@example.org');
  assert.equal(authState.authorized, false);
  await assert.rejects(store.studentDetails(first.studentId), {code: 'TEACHER_NOT_ALLOWED'});
  await store.teacherSignOut();

  await signIn(TEACHER_EMAIL);
  await waitFor(() => authState.authorized === true);
  let students = [];
  let watchError;
  const stopWatching = store.watchStudents((rows, metadata) => {
    if (!metadata.fromCache) students = rows;
  }, error => { watchError = error; });
  t.after(stopWatching);
  const find = uid => students.find(student => student.id === uid);
  await waitFor(() => find(first.studentId) && find(second.studentId));
  assert.equal(find(first.studentId).displayName, 'Testovací student A');
  assert.equal(find(second.studentId).displayName, 'Testovací student B');
  assert.equal(find(second.studentId).selectedCaseId, null);
  const previousSavedAt = find(second.studentId).lastSavedAt;
  await store.selectCase(second.studentId, '7');
  await waitFor(() => find(second.studentId)?.selectedCaseId === '7');
  assert.equal(find(second.studentId).lastSavedAt, previousSavedAt);
  assert.equal(find(second.studentId).caseSummaries['7'], undefined);
  assert.equal((await store.studentDetails(first.studentId)).records[0].record.ai, 'První zápis');
  assert.equal((await store.studentDetails(second.studentId)).records[0].record.ai, 'Druhý zápis');
  await save(second.studentId, 'Aktualizovaný druhý zápis', 1);
  await waitFor(() => find(second.studentId)?.caseSummaries[0]?.revision === 2);
  assert.equal((await store.studentDetails(second.studentId)).records[0].record.ai, 'Aktualizovaný druhý zápis');
  assert.equal((await store.studentDetails(second.studentId)).student.selectedCaseId, '7');
  assert.deepEqual((await store.caseHistory(second.studentId, 0)).map(version => version.record.ai),
    ['Aktualizovaný druhý zápis', 'Druhý zápis']);
  assert.equal(watchError, undefined);
  stopWatching();
  await store.teacherSignOut();
  await waitFor(() => authState.user === null);
  await assert.rejects(store.caseHistory(second.studentId, 0), {code: 'TEACHER_SIGN_IN_REQUIRED'});
});
