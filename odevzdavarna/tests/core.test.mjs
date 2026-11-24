import test from 'node:test';
import assert from 'node:assert/strict';
import {parseBackup,submissionName,submissionInfo,createDelivery,MAX_BYTES} from '../src/core.js';
const sample=()=>JSON.stringify({app:'pravni-audit-ai',version:2,records:{0:{ai:'Modelová odpověď'},1:{},2:{advice:'Doporučení'}}});
test('imports current backup, preserves text, skips empty cases',()=>{const p=parseBackup(sample());assert.equal(p.count,2);assert.equal(p.records[0].ai,'Modelová odpověď');assert.equal(p.records[0].complete,false);assert.equal(p.complete,0);});
test('rejects other files, unknown cases, empty backups and malformed records',()=>{
 for(const text of ['TXT',JSON.stringify({app:'other',version:2,records:{}}),JSON.stringify({app:'pravni-audit-ai',version:2,records:{10:{ai:'x'}}}),JSON.stringify({app:'pravni-audit-ai',version:2,records:{0:{}}}),JSON.stringify({app:'pravni-audit-ai',version:2,records:{0:{ai:12}}}),JSON.stringify({app:'pravni-audit-ai',version:2,records:{0:{ai:'x',complete:true}}})])assert.throws(()=>parseBackup(text));
 assert.throws(()=>parseBackup(' '.repeat(MAX_BYTES+1)));
});
test('untrusted HTML is preserved as text and unknown record fields are rejected',()=>{assert.equal(parseBackup(JSON.stringify({app:'pravni-audit-ai',version:2,records:{0:{ai:'<img src=x onerror=alert(1)>'}}})).records[0].ai,'<img src=x onerror=alert(1)>');assert.throws(()=>parseBackup('{"app":"pravni-audit-ai","version":2,"records":{"0":{"__proto__":{},"ai":"a"}}}'));});
test('names fit existing rules; progress is count of server-confirmed records',()=>{assert.equal(submissionName(' Nováková ',2),'Odevzdání [2] · Nováková');assert.throws(()=>submissionName('x',1));assert.ok(submissionName('a'.repeat(60),10).length<=80);assert.equal(submissionInfo({displayName:'Modelový test Alfa'}),null);const s={displayName:submissionName('Nováková',2),caseSummaries:{0:{hasContent:true,savedAt:'2026-11-24T10:00:00Z'}}};assert.equal(submissionInfo(s).complete,false);s.caseSummaries[2]={hasContent:true,savedAt:'2026-11-24T10:00:00Z'};assert.equal(submissionInfo(s).complete,true);});
test('retry reuses mutation after lost acknowledgement and skips previously confirmed case',async()=>{
 const saved=[],ops=[],payload=parseBackup(sample());let starts=0,failed=false;
 const store={async start(){starts++;return {studentId:'uid'};},async save(uid,id,op){ops.push([id,op.mutationId]);if(!saved.includes(id))saved.push(id);if(id==='2'&&!failed){failed=true;throw Error('Lost response');}return {savedAt:'2026-11-24T10:00:00Z',revision:1};}};
 let n=0;const d=createDelivery(store,payload,'Nováková',()=>String(++n));await assert.rejects(d.send());assert.equal(d.received,1);const receipt=await d.send();assert.equal(receipt.count,2);assert.equal(starts,1);assert.deepEqual(ops,[['0','1'],['2','2'],['2','2']]);await d.send();assert.equal(ops.length,3);
});
test('double-submit cannot run concurrent deliveries',async()=>{let finish;const pending=new Promise(resolve=>finish=resolve);const d=createDelivery({start:()=>pending,save:async()=>({savedAt:'2026-11-24T10:00:00Z'})},parseBackup(sample()),'Nováková',()=> 'id');const first=d.send();await assert.rejects(d.send(),/probíhá/);finish({studentId:'uid'});await first;});
