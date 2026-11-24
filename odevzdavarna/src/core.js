import { normalizeRecord, FIELD_LIMITS } from './store.js';
export const MAX_BYTES = 4 * 1024 * 1024;
export const PREFIX = 'Odevzdání';
export function parseBackup(text) {
  if (new TextEncoder().encode(text).length > MAX_BYTES) throw new Error('Soubor je příliš velký. Vyberte zálohu JSON do 4 MB.');
  let data;
  try { data = JSON.parse(text.replace(/^\uFEFF/, '')); } catch { throw new Error('Soubor není platný JSON. V auditu zvolte „Stáhnout zálohu JSON“.'); }
  if (!data || data.app !== 'pravni-audit-ai' || data.version !== 2 || !data.records || typeof data.records !== 'object' || Array.isArray(data.records)) throw new Error('Toto není záloha Právního auditu AI. Potřebujete soubor moje_pravni_audity_zaloha.json.');
  const records = {};
  for (const [id, value] of Object.entries(data.records)) {
    if (!/^[0-9]$/.test(id)) throw new Error('Záloha obsahuje neplatné číslo případu.');
    const record = normalizeRecord(value);
    if (Object.keys(FIELD_LIMITS).some(key => record[key].trim())) records[id] = record;
  }
  if (!Object.keys(records).length) throw new Error('Záloha neobsahuje žádnou odpověď. Nejdřív vyplňte alespoň část jednoho případu.');
  return { records, count: Object.keys(records).length, complete: Object.values(records).filter(r=>r.complete).length };
}
export function submissionName(surname, count) {
  const name = surname.trim().replace(/\s+/g, ' ');
  if (name.length < 2 || name.length > 60 || /[\u0000-\u001f\u007f]/.test(name)) throw new Error('Zadejte příjmení v délce 2 až 60 znaků.');
  if (!Number.isInteger(count) || count < 1 || count > 10) throw new Error('Neplatný počet případů.');
  return `${PREFIX} [${count}] · ${name}`;
}
export function submissionInfo(student) {
  const m = /^Odevzdání \[(10|[1-9])\] · (.+)$/.exec(student.displayName || '');
  if (!m) return null;
  const received = Object.values(student.caseSummaries || {}).filter(s=>s.hasContent && s.savedAt).length;
  return { surname:m[2], expected:Number(m[1]), received, complete:received===Number(m[1]) };
}
// One immutable profile per delivery. Retrying uses the same mutation IDs, even
// if the acknowledgement was lost; server transactions prevent duplicate versions.
export function createDelivery(store, payload, surname, uuid = () => crypto.randomUUID()) {
  const name = submissionName(surname, payload.count);
  const entries = Object.entries(payload.records).map(([id, record]) => ({id,record,mutationId:uuid()}));
  let workspace = null, busy = false, receipt = null;
  const acknowledged = new Map();
  return {
    async send(progress = () => {}) {
      if (busy) throw new Error('Odesílání už probíhá.');
      if (receipt) return receipt;
      busy = true;
      try {
        workspace ||= await store.start(name);
        progress(acknowledged.size, entries.length);
        for (const item of entries) {
          if (acknowledged.has(item.id)) continue;
          const ack = await store.save(workspace.studentId, item.id, {record:item.record,baseRevision:0,mutationId:item.mutationId});
          acknowledged.set(item.id,ack);
          progress(acknowledged.size, entries.length);
        }
        receipt = {id:workspace.studentId,surname:name.split(' · ').slice(1).join(' · '),count:entries.length,savedAt:[...acknowledged.values()].map(a=>a.savedAt).sort().at(-1)};
        return receipt;
      } finally { busy = false; }
    },
    get received() { return acknowledged.size; }
  };
}
