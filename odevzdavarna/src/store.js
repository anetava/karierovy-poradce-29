// Isolated submission client; server paths and rules remain compatible with the existing audit.
import { initializeApp, getApps, deleteApp } from 'firebase/app';
import {
  initializeAuth, getAuth, indexedDBLocalPersistence, browserLocalPersistence, inMemoryPersistence,
  browserSessionPersistence, browserPopupRedirectResolver, onIdTokenChanged,
  signInAnonymously, signInWithPopup, GoogleAuthProvider, signOut, connectAuthEmulator,
} from 'firebase/auth';
import {
  getFirestore, connectFirestoreEmulator, collection, doc, getDocFromServer,
  getDocsFromServer, runTransaction, serverTimestamp, onSnapshot, query, orderBy, limit,
} from 'firebase/firestore';

export const COURSE_ID = 'pravni-audit-ai';
export const TEACHER_EMAIL = 'aneta.vadovicova@gmail.com';
export const NOTICE_VERSION = '2026-11-23';
export const FIELD_LIMITS = Object.freeze({ tool: 120, checkedAt: 10, ai: 60000, law: 600, effective: 10, source: 2048, quote: 12000, meaning: 20000, verdict: 100, assessment: 20000, advice: 20000 });
const LABELS = { tool: 'AI nástroj a model', checkedAt: 'Datum ověření', ai: 'Skutečná odpověď AI', law: 'Předpis, paragraf a odstavec', effective: 'Použité znění účinné od', source: 'Přesný odkaz na zdroj', quote: 'Citace z právního předpisu', meaning: 'Výklad a použití na případ', verdict: 'Hodnocení odpovědi AI', assessment: 'Odůvodnění hodnocení', advice: 'Doporučení klientovi' };
const VERDICTS = ['Správná', 'Částečně správná', 'Nesprávná', 'Nelze rozhodnout bez dalších údajů'];
const RECORD_KEYS = [...Object.keys(FIELD_LIMITS), 'readConfirmed', 'complete', 'completedAt'];
const ROOM = Object.freeze({ id: COURSE_ID, title: 'Právní audit AI', status: 'open', permanent: true, code: '', joinExpiresAt: null });

export class AuditStoreError extends Error {
  constructor(status, code, message, details) {
    super(message); this.name = 'AuditStoreError'; this.status = status; this.code = code;
    if (details !== undefined) this.details = details;
  }
}
function fail(status, code, message, details) { throw new AuditStoreError(status, code, message, details); }
function asError(error) {
  if (error instanceof AuditStoreError) return error;
  const code = String(error?.code || '');
  if (['unavailable', 'deadline-exceeded', 'auth/network-request-failed'].includes(code)) return new AuditStoreError(503, 'STORAGE_UNAVAILABLE', 'Spojení s ukládáním není dostupné. Nezavírejte rozepsaný pracovní list; odeslání se po připojení zopakuje.');
  if (['unauthenticated', 'auth/user-token-expired', 'auth/invalid-user-token', 'auth/user-disabled', 'auth/user-not-found'].includes(code)) return new AuditStoreError(401, 'STUDENT_SESSION_EXPIRED', 'Uložené přihlášení již není platné. Před novým vstupem si stáhněte kopii své práce.');
  if (code === 'permission-denied') return new AuditStoreError(403, 'PERMISSION_DENIED', 'Tento účet nemá povolení k požadované operaci. Před zavřením pracovního listu si stáhněte kopii odpovědí.');
  if (['resource-exhausted', 'auth/too-many-requests', 'auth/quota-exceeded'].includes(code)) return new AuditStoreError(429, 'QUOTA_EXCEEDED', 'Ukládání právě dosáhlo provozního limitu. Nezavírejte pracovní list a stáhněte si svou kopii.');
  if (['auth/popup-closed-by-user', 'auth/cancelled-popup-request'].includes(code)) return new AuditStoreError(400, 'AUTH_CANCELLED', 'Přihlášení bylo zavřeno. Můžete ho spustit znovu.');
  if (code === 'auth/popup-blocked') return new AuditStoreError(400, 'AUTH_POPUP_BLOCKED', 'Prohlížeč zablokoval přihlašovací okno. Povolte je pro tuto stránku a zkuste přihlášení znovu.');
  if (code === 'auth/unauthorized-domain') return new AuditStoreError(503, 'AUTH_DOMAIN_NOT_ALLOWED', 'Tato adresa ještě není povolena v nastavení přihlášení aplikace.');
  if (['auth/invalid-api-key', 'auth/invalid-app-credential', 'auth/operation-not-allowed', 'auth/configuration-not-found'].includes(code)) return new AuditStoreError(503, 'COURSE_NOT_CONFIGURED', 'Společné ukládání ještě není správně připojeno. Zápisy zatím ponechte v tomto prohlížeči.');
  if (code === 'aborted') return new AuditStoreError(409, 'REVISION_CONFLICT', 'Práce se změnila také v jiné kartě. Načtěte aktuální verzi; svůj rozepsaný text si ponechte.');
  return new AuditStoreError(500, 'STORAGE_ERROR', 'Uložení se nepodařilo potvrdit. Nezavírejte pracovní list, stáhněte si kopii a zkuste to znovu.');
}
async function operation(fn) { try { return await fn(); } catch (error) { throw asError(error); } }
function objectKeys(value, allowed) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(key => !allowed.includes(key))) fail(422, 'INVALID_INPUT', 'Záznam obsahuje neplatná nebo neznámá pole.');
}
function validDate(value) {
  return /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(value) && Number(value.slice(0, 4)) > 0 && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}
function validSource(value) { try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) && Boolean(url.hostname); } catch { return false; } }
export function normalizeRecord(value) {
  objectKeys(value, RECORD_KEYS);
  const record = {};
  for (const [key, maximum] of Object.entries(FIELD_LIMITS)) {
    if (value[key] !== undefined && (typeof value[key] !== 'string' || value[key].length > maximum)) fail(422, 'FIELD_LIMIT', `Pole „${LABELS[key]}“ má nesprávný formát nebo překračuje ${maximum} znaků.`);
    record[key] = value[key] ?? '';
  }
  for (const key of ['readConfirmed', 'complete']) {
    if (value[key] !== undefined && typeof value[key] !== 'boolean') fail(422, 'INVALID_INPUT', 'Stav vyplnění má nesprávný formát.');
    record[key] = value[key] === true;
  }
  if (value.completedAt !== undefined && (typeof value.completedAt !== 'string' || value.completedAt.length > 40)) fail(422, 'INVALID_INPUT', 'Datum dokončení má nesprávný formát.');
  record.completedAt = record.complete ? (value.completedAt ?? '') : '';
  if (record.verdict && !VERDICTS.includes(record.verdict)) fail(422, 'INVALID_INPUT', 'Vyberte platné hodnocení odpovědi AI.');
  if (record.complete) {
    if (!Object.keys(FIELD_LIMITS).every(key => record[key].trim()) || !record.readConfirmed || !validDate(record.checkedAt) || !validDate(record.effective) || !validSource(record.source) || !record.completedAt || Number.isNaN(Date.parse(record.completedAt))) fail(422, 'INCOMPLETE_RECORD', 'Audit označený jako vyplněný musí obsahovat všechna pole, platná data, zdroj a potvrzení čtení.');
    record.completedAt = new Date(record.completedAt).toISOString();
  }
  return record;
}
export function summarize(record, revision, savedAt) {
  return {
    revision, savedAt, complete: record.complete,
    hasAi: Boolean(record.ai.trim()),
    hasEvidence: Boolean(record.law.trim() && record.source.trim() && record.quote.trim()),
    hasConclusion: Boolean(record.assessment.trim() && record.advice.trim()),
    hasContent: Object.keys(FIELD_LIMITS).some(key => Boolean(record[key].trim())),
  };
}
function iso(timestamp) { return timestamp?.toDate ? timestamp.toDate().toISOString() : null; }
function envelope(data) { return { record: data.record, revision: data.revision, savedAt: iso(data.savedAt) }; }
function studentDto(snapshot) {
  const data = snapshot.data();
  return {
    id: snapshot.id, displayName: data.displayName, joinedAt: iso(data.joinedAt), lastSavedAt: iso(data.lastSavedAt),
    selectedCaseId: typeof data.selectedCaseId === 'string' && /^[0-9]$/.test(data.selectedCaseId) ? data.selectedCaseId : null,
    caseSummaries: Object.fromEntries(Object.entries(data.caseSummaries || {}).map(([id, summary]) => [id, { ...summary, savedAt: iso(summary.savedAt) }])),
  };
}
function validUid(uid) { return typeof uid === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(uid); }
function caseId(value) { const id = String(value); if (!/^[0-9]$/.test(id)) fail(422, 'INVALID_CASE', 'Neplatný případ.'); return id; }
function sameRecord(a, b) { return RECORD_KEYS.every(key => a[key] === b[key]); }

export function createAuditStore(config, { hostname = globalThis.location?.hostname || '' } = {}) {
  const emulator = config?.emulator === true;
  const configured = Boolean(config && typeof config === 'object'
    && ['apiKey', 'projectId', 'authDomain', 'appId'].every(key => typeof config[key] === 'string' && config[key].trim() && !/YOUR_|REPLACE_|PLACEHOLDER/i.test(config[key]))
    && (!emulator || (['localhost', '127.0.0.1'].includes(hostname) && config.projectId === 'demo-pravni-audit')));
  let studentClient = null, teacherClient = null, studentEpoch = 0, joining = null;
  function requireConfig() { if (!configured) fail(503, 'COURSE_NOT_CONFIGURED', 'Automatické ukládání ještě není připojeno. Výklad a vzor můžete používat; pracovní list zpřístupníme po dokončení připojení.'); }
  function client(name, teacher) {
    requireConfig();
    const existing = getApps().find(app => app.name === name);
    const firebaseConfig = Object.fromEntries(['apiKey', 'projectId', 'authDomain', 'appId', 'messagingSenderId', 'storageBucket'].filter(key => typeof config[key] === 'string').map(key => [key, config[key]]));
    const app = existing || initializeApp(firebaseConfig, name);
    if (app.options.projectId !== config.projectId) fail(503, 'COURSE_NOT_CONFIGURED', 'Na stránce je neslučitelné připojení úložiště. Obnovte stránku.');
    const persistence = (teacher ? [browserSessionPersistence] : [inMemoryPersistence]).filter(item => typeof item === 'function');
    const dependencies = { persistence: persistence.length ? persistence : inMemoryPersistence };
    // The SDK's Node entry omits browser-only classes. Keep the emulator tests
    // honest without attempting a popup or relying on browser globals in Node.
    if (teacher && typeof browserPopupRedirectResolver === 'function') dependencies.popupRedirectResolver = browserPopupRedirectResolver;
    const auth = existing ? getAuth(app) : initializeAuth(app, dependencies);
    // Firestore's default web cache is in memory. Our existing, per-student local
    // queue owns offline recovery; do not enable another persistent class-data cache.
    const db = getFirestore(app);
    if (emulator && !existing) {
      connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
      connectFirestoreEmulator(db, '127.0.0.1', 8080);
    }
    return { app, auth, db };
  }
  function student() { return studentClient || (studentClient = client('audit-submission-student', false)); }
  function teacher() { return teacherClient || (teacherClient = client('audit-teacher', true)); }
  const profileRef = (db, uid) => doc(db, 'courses', COURSE_ID, 'students', uid);
  const casesRef = (db, uid) => collection(profileRef(db, uid), 'cases');
  const caseRef = (db, uid, id) => doc(casesRef(db, uid), id);
  function verifyStudent(current, uid, epoch = studentEpoch) {
    if (epoch !== studentEpoch || current !== studentClient || !validUid(uid) || current.auth.currentUser?.uid !== uid || !current.auth.currentUser.isAnonymous) fail(401, 'STUDENT_SESSION_EXPIRED', 'Tento pracovní list nepatří k aktuálnímu přihlášení. Před novým vstupem si stáhněte svou místní kopii.');
  }
  async function ready() {
    return operation(async () => {
      const current = student();
      await current.auth.authStateReady();
      if (current.auth.currentUser && !current.auth.currentUser.isAnonymous) fail(401, 'STUDENT_SESSION_EXPIRED', 'Studentské přihlášení není platné. Otevřete nový studentský vstup.');
      return { uid: current.auth.currentUser?.uid || null };
    });
  }
  async function loadWorkspace(current, uid) {
    const epoch = studentEpoch;
    verifyStudent(current, uid, epoch);
    const [profile, cases] = await Promise.all([getDocFromServer(profileRef(current.db, uid)), getDocsFromServer(casesRef(current.db, uid))]);
    verifyStudent(current, uid, epoch);
    if (!profile.exists()) fail(401, 'STUDENT_SESSION_EXPIRED', 'Pracovní list pro tento vstup ještě neexistuje. Dokončete zadání svého jména.');
    return { room: { ...ROOM }, studentId: uid, token: uid, displayName: profile.data().displayName, records: Object.fromEntries(cases.docs.map(item => [item.id, envelope(item.data())])) };
  }
  async function start(displayName) {
    return operation(async () => {
      if (typeof displayName !== 'string' || displayName.trim().length < 2 || displayName.trim().length > 80) fail(422, 'INVALID_INPUT', 'Napište jméno a příjmení v délce 2 až 80 znaků.');
      const name = displayName.trim();
      if (joining) {
        if (joining.name !== name) fail(409, 'ENTRY_NAME_MISMATCH', 'Připojení již probíhá pod jiným jménem. Dokončete původní vstup.');
        return joining.promise;
      }
      const current = student(), epoch = studentEpoch;
      const promise = (async () => {
        await current.auth.authStateReady();
        if (epoch !== studentEpoch) fail(401, 'STUDENT_SESSION_EXPIRED', 'Studentský vstup se mezitím změnil.');
        if (current.auth.currentUser && !current.auth.currentUser.isAnonymous) fail(401, 'STUDENT_SESSION_EXPIRED', 'Pro práci studenta je potřeba vlastní studentský vstup.');
        if (!current.auth.currentUser) await signInAnonymously(current.auth);
        const uid = current.auth.currentUser?.uid;
        verifyStudent(current, uid, epoch);
        await runTransaction(current.db, async transaction => {
          verifyStudent(current, uid, epoch);
          const reference = profileRef(current.db, uid), profile = await transaction.get(reference);
          if (profile.exists()) {
            if (profile.data().displayName !== name) fail(409, 'ENTRY_NAME_MISMATCH', 'Tento prohlížeč už má pracovní list pod jiným jménem. Pro novou osobu použijte „Jiný student“.');
            return;
          }
          transaction.set(reference, { displayName: name, joinedAt: serverTimestamp(), noticeVersion: NOTICE_VERSION, lastSavedAt: null, lastCaseId: null, caseSummaries: {} });
        });
        return loadWorkspace(current, uid);
      })();
      joining = { name, promise };
      try { return await promise; } finally { if (joining?.promise === promise) joining = null; }
    });
  }
  async function resume(uid) {
    return operation(async () => { await ready(); const current = student(); verifyStudent(current, uid); return loadWorkspace(current, uid); });
  }
  async function selectCase(uid, inputCaseId) {
    const id = caseId(inputCaseId);
    return operation(async () => {
      await ready();
      const current = student(), epoch = studentEpoch;
      verifyStudent(current, uid, epoch);
      const reference = profileRef(current.db, uid);
      await runTransaction(current.db, async transaction => {
        verifyStudent(current, uid, epoch);
        const profile = await transaction.get(reference);
        if (!profile.exists()) fail(401, 'STUDENT_SESSION_EXPIRED', 'Pracovní list pro tento vstup ještě neexistuje.');
        if (profile.data().selectedCaseId !== id) transaction.update(reference, { selectedCaseId: id });
      });
      verifyStudent(current, uid, epoch);
    });
  }
  async function save(uid, inputCaseId, op) {
    return operation(async () => {
      await ready();
      const current = student(), epoch = studentEpoch;
      verifyStudent(current, uid, epoch);
      const id = caseId(inputCaseId);
      objectKeys(op, ['record', 'baseRevision', 'mutationId']);
      if (!Number.isSafeInteger(op.baseRevision) || op.baseRevision < 0 || op.baseRevision > 1000000) fail(422, 'INVALID_REVISION', 'Neplatná verze záznamu.');
      if (typeof op.mutationId !== 'string' || !/^[A-Za-z0-9_-]{16,80}$/.test(op.mutationId)) fail(422, 'INVALID_MUTATION', 'Uložení nemá platný identifikátor.');
      const record = normalizeRecord(op.record), revision = op.baseRevision + 1;
      const reference = caseRef(current.db, uid, id), historyRef = doc(reference, 'history', op.mutationId);
      const accepted = await runTransaction(current.db, async transaction => {
        verifyStudent(current, uid, epoch);
        const history = await transaction.get(historyRef);
        if (history.exists()) {
          const previous = history.data();
          if (previous.baseRevision !== op.baseRevision || !sameRecord(previous.record, record)) fail(409, 'MUTATION_REUSED', 'Identifikátor tohoto uložení už patří k jinému obsahu. Místní text zůstává zachovaný.');
          return envelope(previous);
        }
        const latest = await transaction.get(reference);
        if ((latest.exists() ? latest.data().revision : 0) !== op.baseRevision) fail(409, 'REVISION_CONFLICT', 'Práce se změnila také v jiné kartě. Nejdřív vyřešte rozdíl; svůj rozepsaný text si ponechte.', { current: latest.exists() ? envelope(latest.data()) : null });
        const savedAt = serverTimestamp();
        transaction.set(reference, { record, revision, lastMutationId: op.mutationId, savedAt });
        transaction.set(historyRef, { record, revision, baseRevision: op.baseRevision, mutationId: op.mutationId, savedAt });
        transaction.update(profileRef(current.db, uid), { lastSavedAt: savedAt, lastCaseId: id, [`caseSummaries.${id}`]: summarize(record, revision, savedAt) });
        return null;
      });
      verifyStudent(current, uid, epoch);
      // Read the immutable acknowledgement from the server. A lost response is
      // retried with the same mutation ID, so it cannot create another revision.
      const acknowledgement = accepted || envelope((await getDocFromServer(historyRef)).data());
      verifyStudent(current, uid, epoch);
      if (!acknowledgement.savedAt) fail(503, 'STORAGE_UNAVAILABLE', 'Server zatím nepotvrdil čas uložení. Odeslání bezpečně zopakujeme.');
      return { revision: acknowledgement.revision, savedAt: acknowledgement.savedAt };
    });
  }
  async function forget() {
    return operation(async () => {
      const current = student();
      studentEpoch++;
      await signOut(current.auth);
      // Delete only the named student client to discard its memory cache too.
      // Teacher login and teacher listeners use their independent app instance.
      await deleteApp(current.app);
      if (studentClient === current) studentClient = null;
      joining = null;
    });
  }
  async function teacherState(user) {
    if (!user) return { user: null, authorized: false };
    const claims = (await user.getIdTokenResult()).claims;
    return { user: { uid: user.uid, displayName: user.displayName || '', email: user.email || '', emailVerified: user.emailVerified }, authorized: claims.firebase?.sign_in_provider === 'google.com' && claims.email_verified === true && claims.email === TEACHER_EMAIL };
  }
  async function authorizedTeacher() {
    const current = teacher(); await current.auth.authStateReady();
    if (!current.auth.currentUser) fail(401, 'TEACHER_SIGN_IN_REQUIRED', 'Přihlaste se účtem vyučující.');
    if (!(await teacherState(current.auth.currentUser)).authorized) fail(403, 'TEACHER_NOT_ALLOWED', 'Tento Google účet nemá přístup k přehledu vyučující.');
    return current;
  }
  async function teacherSignIn() {
    return operation(async () => {
      const current = teacher(), provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(current.auth, provider);
      const state = await teacherState(result.user);
      if (!state.authorized) { await signOut(current.auth); fail(403, 'TEACHER_NOT_ALLOWED', 'Tento Google účet nemá přístup k přehledu vyučující. Přihlaste se účtem určeným pro tuto aplikaci.'); }
      return state;
    });
  }
  async function teacherSignOut() { return operation(async () => { const current = teacher(); await signOut(current.auth); }); }
  function teacherOnAuth(callback) {
    let cancelled = false, sequence = 0, unsubscribe = () => {};
    try {
      unsubscribe = onIdTokenChanged(teacher().auth, async user => {
        const mine = ++sequence;
        try { const state = await teacherState(user); if (!cancelled && mine === sequence) callback(state); }
        catch (error) { if (!cancelled && mine === sequence) callback({ user: null, authorized: false, error: asError(error) }); }
      });
    } catch (error) { queueMicrotask(() => { if (!cancelled) callback({ user: null, authorized: false, error: asError(error) }); }); }
    return () => { cancelled = true; sequence++; unsubscribe(); };
  }
  function watchStudents(next, error = () => {}) {
    let cancelled = false, unsubscribe = () => {};
    operation(async () => {
      const current = await authorizedTeacher();
      if (cancelled) return;
      unsubscribe = onSnapshot(collection(current.db, 'courses', COURSE_ID, 'students'), { includeMetadataChanges: true }, snapshot => {
        if (cancelled) return;
        next(snapshot.docs.map(studentDto).sort((a, b) => (a.joinedAt || '').localeCompare(b.joinedAt || '') || a.id.localeCompare(b.id)), { fromCache: snapshot.metadata.fromCache });
      }, cause => { if (!cancelled) error(asError(cause)); });
    }).catch(cause => { if (!cancelled) error(cause); });
    return () => { cancelled = true; unsubscribe(); };
  }
  async function studentDetails(uid) {
    return operation(async () => {
      if (!validUid(uid)) fail(404, 'STUDENT_NOT_FOUND', 'Záznam studenta nebyl nalezen.');
      const current = await authorizedTeacher();
      const [profile, cases] = await Promise.all([getDocFromServer(profileRef(current.db, uid)), getDocsFromServer(casesRef(current.db, uid))]);
      if (!profile.exists()) fail(404, 'STUDENT_NOT_FOUND', 'Záznam studenta nebyl nalezen.');
      return { student: studentDto(profile), records: Object.fromEntries(cases.docs.map(item => [item.id, envelope(item.data())])) };
    });
  }
  async function caseHistory(uid, inputCaseId) {
    return operation(async () => {
      if (!validUid(uid)) fail(404, 'STUDENT_NOT_FOUND', 'Záznam studenta nebyl nalezen.');
      const current = await authorizedTeacher(), id = caseId(inputCaseId);
      const history = await getDocsFromServer(query(collection(caseRef(current.db, uid, id), 'history'), orderBy('revision', 'desc'), limit(40)));
      return history.docs.map(item => ({ id: item.id, caseId: id, ...envelope(item.data()), baseRevision: item.data().baseRevision }));
    });
  }
  return Object.freeze({ configured, ready, start, resume, selectCase, save, forget, teacherSignIn, teacherSignOut, teacherOnAuth, watchStudents, studentDetails, caseHistory });
}


