import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { webcrypto } from 'node:crypto';
const raw=readFileSync(new URL('../pravni-audit-ai/classroom.js',import.meta.url),'utf8');
const source=raw.replace('  init();\n})();','  window.__auditTest={flush,changed,activate,resume,resolveConflict,join,forgetSavedClass}; window.__auditReady=init();\n})();');
const uid='studentFirebaseUid123456789';
const room={id:'pravni-audit-ai',title:'Právní audit AI',code:'',status:'open',permanent:true,joinExpiresAt:null};
const credential={room,studentId:uid,displayName:'Student',token:uid,records:{}};
const savedKey='pravni-audit-firebase-session-v1';
const entryKey='pravni-audit-firebase-entry-v1';
const draftKey=`pravni-audit-firebase-v1:${room.id}:${uid}`;
const savedEntry={roomId:room.id,studentId:uid,displayName:'Student',title:room.title,token:uid};
const record=ai=>({tool:'Test',checkedAt:'',ai,law:'',effective:'',source:'',quote:'',meaning:'',verdict:'',assessment:'',advice:'',readConfirmed:false,complete:false,completedAt:''});
const failure=(status,code,message=code)=>Object.assign(new Error(message),{status,code});
const offline=()=>failure(503,'STORAGE_UNAVAILABLE','Připojení není dostupné.');
function storedClass(){return new Map([[savedKey,JSON.stringify(savedEntry)],[draftKey,JSON.stringify({0:record('saved local answer')})],[draftKey+':queue',JSON.stringify({dirty:{0:record('unsent newer answer')},operations:{},revisions:{0:0}})],['pravni-audit-v1',JSON.stringify({0:record('PRIVATE ORIGINAL')})],['unrelated-key','KEEP']]);}
function harness({storage=new Map(),handlers={},configured=true,initialUid=uid,failWrites=false,editorAvailable=true}={}){
 const nodes=new Map(),listeners=new Map(),timers=new Map();let timerId=0,workspace={},workspaceKey='welcome',backups=[],calls=[],downloads=[],currentUid=initialUid;
 const teacherUid='teacherGoogleUid987654321';
 const node=id=>{if(!nodes.has(id))nodes.set(id,{hidden:false,disabled:false,value:'',checked:false,textContent:'',focus(){},classList:{toggle(){}},addEventListener(type,fn){this[type]=fn;}});return nodes.get(id);};
 const localStorage={getItem:key=>storage.get(key)??null,setItem:(key,value)=>{if(failWrites)throw new Error('Storage denied');storage.set(key,String(value));},removeItem:key=>storage.delete(key)};
 const context={console,URL,navigator:{locks:{request:async(_name,_options,callback)=>callback(editorAvailable?{}:null)}},crypto:webcrypto,Date,JSON,Object,Map,Set,Number,String,Array,Promise,Error,CustomEvent:class{constructor(type,options={}){this.type=type;this.detail=options.detail;}},localStorage,location:new URL('https://anetava.github.io/karierovy-poradce-29/pravni-audit-ai/'),document:{hidden:false,getElementById:node,body:{classList:{toggle(){}}},addEventListener(type,fn){listeners.set(type,fn);}},confirm:()=>true,setTimeout(fn,delay){timers.set(++timerId,{fn,delay});return timerId;},clearTimeout:id=>timers.delete(id),addEventListener(type,fn){listeners.set(type,fn);},dispatchEvent(evt){listeners.get(evt.type)?.(evt);}};
 context.window=context;context.download=(content,type,name)=>downloads.push({content,type,name});
 context.fetch=()=>{throw new Error('Student sync must use AuditStore, not fetch');};
 context.AuditBridge={store(){},restoreCase(){},refreshSaveState(){},exportBackup(){backups.push(structuredClone(workspace));},switchWorkspace(key,records){for(const r of Object.values(records)){if(typeof r.ai!=='string')throw new Error('Invalid record');}workspaceKey=key;workspace=structuredClone(records);try{localStorage.setItem(key,JSON.stringify(workspace));}catch{}},privateRecord:()=>record('PRIVATE ORIGINAL'),replaceCurrent(r){workspace[0]=r;context.dispatchEvent({type:'audit:changed',detail:{caseId:0,record:r}});}};
 async function invoke(method,args,defaultResult){calls.push({method,args:structuredClone(args),uid:currentUid});return handlers[method]?handlers[method](...args):defaultResult();}
 context.AuditStore={configured,
  ready:()=>invoke('ready',[],()=>({uid:currentUid})),
  start:async name=>{if(!currentUid)currentUid=uid;return invoke('start',[name],()=>({...credential,studentId:currentUid,token:currentUid,displayName:name}));},
  resume:async id=>{if(id!==currentUid)throw failure(401,'STUDENT_SESSION_EXPIRED');return invoke('resume',[id],()=>({...credential,studentId:id,token:id}));},
  save:async(id,caseId,op)=>{if(id!==currentUid)throw failure(401,'STUDENT_SESSION_EXPIRED');return invoke('save',[id,caseId,op],()=>({record:op.record,revision:op.baseRevision+1,savedAt:'2026-11-23T12:00:00Z'}));},
  selectCase:async(id,caseId)=>invoke('selectCase',[id,caseId],()=>null),
  forget:async()=>{await invoke('forget',[],()=>null);currentUid=null;},
 };
 vm.runInNewContext(source,context);
 return {ctx:context,node,storage,calls,backups,downloads,timers,ready:()=>context.__auditReady,workspace:()=>workspace,currentUid:()=>currentUid,teacherUid:()=>teacherUid,setUid(value){currentUid=value;},async start(){await context.__auditReady;context.__auditTest.activate(structuredClone(credential),{token:uid,displayName:'Student'});},edit(id,r){workspace[id]=structuredClone(r);try{localStorage.setItem(workspaceKey,JSON.stringify(workspace));}catch{}context.dispatchEvent({type:'audit:changed',detail:{caseId:id,record:r}});},flush:()=>context.__auditTest.flush(),saves:()=>calls.filter(c=>c.method==='save')};
}
test('no REST API, server host, credential bearer or interval polling remains in the student adapter',()=>{
 assert.doesNotMatch(raw,/fetch\s*\(|\/api\/|https?:\/\/|Authorization|Bearer|setInterval\s*\(/);
});
test('null Firebase configuration blocks name entry and makes no adapter requests',async()=>{
 const h=harness({configured:false});await h.ready();assert.equal(h.calls.length,0);assert.equal(h.node('classJoinButton').disabled,true);assert.equal(h.node('auditFields').disabled,true);assert.match(h.node('classError').textContent,/ještě není připojené/);h.node('className').value='Jana Nováková';await h.ctx.__auditTest.join({preventDefault(){}});assert.equal(h.calls.length,0);
});
test('name entry calls only student start with name and opens the named workspace',async()=>{
 const h=harness({initialUid:null});await h.ready();h.node('className').value='Jana Nováková';await h.ctx.__auditTest.join({preventDefault(){}});const start=h.calls.find(c=>c.method==='start');assert.deepEqual(start.args,['Jana Nováková']);assert.equal(h.node('auditFields').disabled,false);assert.equal(h.node('classIdentity').textContent,'Jana Nováková');assert.equal(JSON.parse(h.storage.get(savedKey)).token,uid);
});
test('lost start acknowledgement retries the same Firebase identity and name',async()=>{
 let attempt=0;const h=harness({initialUid:null,handlers:{start:async name=>{if(++attempt===1)throw offline();return {...credential,displayName:name};}}});await h.ready();h.node('className').value='Jana Nováková';await h.ctx.__auditTest.join({preventDefault(){}});assert.deepEqual(JSON.parse(h.storage.get(entryKey)),{displayName:'Jana Nováková'});assert.equal(h.node('auditFields').disabled,true);await h.ctx.__auditTest.join({preventDefault(){}});const starts=h.calls.filter(c=>c.method==='start');assert.equal(starts.length,2);assert.equal(starts[0].uid,starts[1].uid);assert.equal(h.storage.has(entryKey),false);
});
test('old private answers and old Sites session are never automatically imported',async()=>{
 const storage=new Map([['pravni-audit-v1',JSON.stringify({0:record('PRIVATE ORIGINAL')})],['pravni-audit-course-session-v1',JSON.stringify({...savedEntry,token:'S'.repeat(43)})]]);const h=harness({storage});await h.ready();assert.equal(h.node('auditFields').disabled,true);assert.equal(h.calls.some(c=>['start','resume','save'].includes(c.method)),false);await h.start();await h.flush();assert.deepEqual(h.workspace(),{});assert.equal(h.saves().length,0);assert.match(storage.get('pravni-audit-v1'),/PRIVATE ORIGINAL/);assert.equal(storage.has('pravni-audit-course-session-v1'),true);
});
test('typing persists locally and coalesces into one remote write after a fixed 30 second window and a shorter idle delay',async()=>{
 const h=harness();await h.start();h.edit(0,record('first'));const [timerId,timer]=[...h.timers][0];assert.equal(timer.delay,30000);h.edit(0,record('second'));h.edit(0,record('latest'));assert.equal(h.timers.size,2);assert.ok([...h.timers.values()].some(t=>t.delay===1500));assert.equal(h.timers.has(timerId),true);assert.equal(h.saves().length,0);assert.equal(JSON.parse(h.storage.get(draftKey))[0].ai,'latest');assert.match(h.ctx.AuditClassroom.getState().message,/Místně uloženo/);await timer.fn();assert.equal(h.saves().length,1);assert.equal(h.saves()[0].args[2].record.ai,'latest');assert.match(h.ctx.AuditClassroom.getState().message,/Uloženo pro vyučující/);
});
test('failed local storage never reports locally saved while a remote save is pending',async()=>{
 const h=harness({failWrites:true});await h.start();h.edit(0,record('only in open page'));const state=h.ctx.AuditClassroom.getState();assert.equal(state.level,'error');assert.match(state.message,/Místní zálohu se nepodařilo uložit/);assert.doesNotMatch(state.message,/Místně uloženo|zůstává.*v tomto prohlížeči/i);assert.equal(h.saves().length,0);
});
test('erasing a first draft before sending removes the queued stale text',async()=>{
 const h=harness();await h.start();h.edit(0,record('erase me'));h.edit(0,{...record(''),tool:''});await h.flush();assert.equal(h.saves().length,0);assert.equal(h.ctx.AuditClassroom.hasPending(),false);
});
test('validation rejection is repaired with a new mutation rather than retrying rejected text',async()=>{
 let count=0;const h=harness({handlers:{save:async(_id,_case,op)=>{if(++count===1)throw failure(422,'FIELD_LIMIT','Pole je dlouhé.');return {record:op.record,revision:1,savedAt:'2026-11-23T12:00:00Z'};}}});await h.start();h.edit(0,record('bad'));await h.flush();assert.match(h.ctx.AuditClassroom.getState().message,/Pole je dlouhé/);h.edit(0,record('fixed'));await h.flush();assert.equal(h.saves()[1].args[2].record.ai,'fixed');assert.notEqual(h.saves()[1].args[2].mutationId,h.saves()[0].args[2].mutationId);assert.equal(h.ctx.AuditClassroom.hasPending(),false);
});
test('lost save acknowledgement retries exactly the same mutation',async()=>{
 let count=0;const h=harness({handlers:{save:async(_id,_case,op)=>{if(++count===1)throw offline();return {record:op.record,revision:1,savedAt:'2026-11-23T12:00:00Z'};}}});await h.start();h.edit(0,record('answer'));await h.flush();assert.equal([...h.timers.values()][0].delay,30000);await h.flush();assert.equal(h.saves()[0].args[2].mutationId,h.saves()[1].args[2].mutationId);assert.equal(h.ctx.AuditClassroom.hasPending(),false);
});
test('edits during a save remain queued and use the next revision',async()=>{
 let release;const gate=new Promise(resolve=>release=resolve);let count=0;const h=harness({handlers:{save:async(_id,_case,op)=>{if(++count===1)await gate;return {record:op.record,revision:op.baseRevision+1,savedAt:'2026-11-23T12:00:00Z'};}}});await h.start();h.edit(0,record('first'));const saving=h.flush();h.edit(0,record('newer'));h.edit(1,record('second case'));release();await saving;await h.flush();assert.equal(h.saves()[1].args[2].record.ai,'newer');assert.equal(h.saves()[1].args[2].baseRevision,1);assert.equal(h.saves()[2].args[2].record.ai,'second case');assert.equal(h.ctx.AuditClassroom.hasPending(),false);
});
test('saved Firebase session resumes automatically after confirming the same student UID',async()=>{
 const h=harness({storage:storedClass()});await h.ready();assert.equal(h.node('auditFields').disabled,false);assert.equal(h.node('classIdentity').textContent,'Student');assert.equal(h.workspace()[0].ai,'unsent newer answer');assert.equal(h.calls.some(c=>c.method==='start'),false);
});
test('known matching auth plus explicit offline error restores local work without false server acknowledgement',async()=>{
 const h=harness({storage:storedClass(),handlers:{resume:async()=>{throw offline();}}});await h.ready();assert.equal(h.workspace()[0].ai,'unsent newer answer');assert.equal(h.node('auditFields').disabled,false);assert.match(h.ctx.AuditClassroom.getState().message,/Čeká na připojení/);assert.doesNotMatch(h.ctx.AuditClassroom.getState().message,/Uloženo pro vyučující/);
});
test('unknown resume error does not activate a cached workspace or queue automatic writes',async()=>{
 const h=harness({storage:storedClass(),handlers:{resume:async()=>{throw new Error('Unknown SDK failure');}}});await h.ready();assert.equal(h.node('auditFields').disabled,true);assert.deepEqual(h.workspace(),{});await h.flush();assert.equal(h.saves().length,0);assert.match(h.node('classError').textContent,/Unknown SDK failure/);
});
test('unconfirmed auth failure keeps both start and existing work gated',async()=>{
 const h=harness({storage:storedClass(),handlers:{ready:async()=>{throw offline();}}});await h.ready();assert.equal(h.node('classJoinButton').disabled,true);assert.equal(h.node('auditFields').disabled,true);assert.equal(h.calls.some(c=>['start','resume','save'].includes(c.method)),false);
});
test('a different current Firebase UID cannot open or save the previous student records',async()=>{
 const h=harness({storage:storedClass(),initialUid:'otherFirebaseStudent'});await h.ready();assert.equal(h.node('auditFields').disabled,true);assert.equal(h.calls.some(c=>['resume','save'].includes(c.method)),false);assert.match(h.node('classError').textContent,/není přístup/);
});
test('an unsent first draft retains revision zero if another device advanced the server',async()=>{
 const storage=storedClass();const h=harness({storage,handlers:{resume:async()=>({...credential,records:{0:{record:record('remote advanced'),revision:3,savedAt:'2026-11-23T12:00:00Z'}}}),save:async()=>{throw failure(409,'REVISION_CONFLICT');}}});await h.ready();await h.flush();assert.equal(h.saves()[0].args[2].baseRevision,0);assert.equal(h.workspace()[0].ai,'unsent newer answer');assert.match(h.ctx.AuditClassroom.getState().message,/jiné kartě/);
});
test('cleared saved draft survives a crash before the queue update',async()=>{
 const blank={...record(''),tool:''};const storage=new Map([[savedKey,JSON.stringify(savedEntry)],[draftKey,JSON.stringify({0:blank})],[draftKey+':queue',JSON.stringify({dirty:{},operations:{},revisions:{0:1}})]]);const h=harness({storage,handlers:{resume:async()=>({...credential,records:{0:{record:record('old answer'),revision:1,savedAt:'2026-11-23T12:00:00Z'}}})}});await h.ready();await h.flush();assert.equal(h.saves()[0].args[2].baseRevision,1);assert.equal(h.saves()[0].args[2].record.ai,'');assert.equal(h.saves()[0].args[2].record.tool,'');
});
test('recovered erasure still conflicts with a newer remote revision',async()=>{
 const blank={...record(''),tool:''};const storage=new Map([[savedKey,JSON.stringify(savedEntry)],[draftKey,JSON.stringify({0:blank})],[draftKey+':queue',JSON.stringify({dirty:{},operations:{},revisions:{0:1}})]]);const h=harness({storage,handlers:{resume:async()=>({...credential,records:{0:{record:record('new remote answer'),revision:3,savedAt:'2026-11-23T12:00:00Z'}}}),save:async()=>{throw failure(409,'REVISION_CONFLICT');}}});await h.ready();await h.flush();assert.equal(h.saves()[0].args[2].baseRevision,1);assert.equal(h.workspace()[0].ai,'');assert.match(h.ctx.AuditClassroom.getState().message,/jiné kartě/);
});
test('conflict recovery backs up edits made during loading and does not requeue them',async()=>{
 let release;const gate=new Promise(resolve=>release=resolve);const h=harness({handlers:{resume:async()=>{await gate;return {...credential,records:{0:{record:record('remote'),revision:2,savedAt:'2026-11-23T12:00:00Z'}}};},save:async()=>{throw failure(409,'REVISION_CONFLICT');}}});await h.start();h.edit(0,record('draft'));await h.flush();const resolving=h.ctx.__auditTest.resolveConflict();h.edit(0,record('newer local edit'));release();await resolving;assert.equal(h.backups[0][0].ai,'newer local edit');assert.equal(h.workspace()[0].ai,'remote');assert.equal(h.ctx.AuditClassroom.hasPending(),false);
});
test('changing student signs out student auth only and retains the teacher login',async()=>{
 const h=harness({storage:storedClass()});await h.ready();await h.node('classForget').click();assert.equal(h.calls.filter(c=>c.method==='forget').length,1);assert.equal(h.currentUid(),null);assert.equal(h.teacherUid(),'teacherGoogleUid987654321');assert.equal(h.storage.has(savedKey),false);assert.equal(h.storage.has(draftKey),false);assert.equal(h.storage.has(draftKey+':queue'),false);assert.match(h.storage.get('pravni-audit-v1'),/PRIVATE ORIGINAL/);assert.equal(h.storage.get('unrelated-key'),'KEEP');assert.equal(h.node('auditFields').disabled,true);assert.deepEqual(h.workspace(),{});
});
test('failed student signout keeps the current workspace and credentials available',async()=>{
 const h=harness({handlers:{forget:async()=>{throw new Error('Signout failed');}}});await h.start();h.edit(0,record('answer'));await h.node('classForget').click();assert.equal(h.ctx.AuditClassroom.isReady(),true);assert.equal(h.node('auditFields').disabled,false);assert.equal(h.currentUid(),uid);assert.equal(h.storage.has(savedKey),true);assert.equal(h.workspace()[0].ai,'answer');assert.match(h.node('classError').textContent,/Odhlášení studenta se nepodařilo/);
});
test('cancelling student switch preserves credentials, unsent draft and private work',async()=>{
 const h=harness({storage:storedClass(),handlers:{resume:async()=>{throw offline();},save:async()=>{throw offline();}}});await h.ready();h.ctx.confirm=()=>false;await h.node('classForget').click();assert.equal(h.storage.has(savedKey),true);assert.equal(h.workspace()[0].ai,'unsent newer answer');assert.equal(h.calls.some(c=>c.method==='forget'),false);
});
test('backup contains newest unsent answers but no identity credential',async()=>{
 const h=harness({storage:storedClass()});await h.ready();h.node('classLocalBackup').click();assert.equal(h.backups[0][0].ai,'unsent newer answer');assert.equal(JSON.stringify(h.backups[0]).includes(uid),false);
});
test('another student starting in another tab locks the old form without signing out the new identity',async()=>{
 const h=harness();await h.start();h.edit(0,record('old pending'));const oldValue=h.storage.get(savedKey),other={...savedEntry,studentId:'newStudentUid',token:'newStudentUid',displayName:'Jiný student'};h.storage.set(savedKey,JSON.stringify(other));h.ctx.dispatchEvent({type:'storage',key:savedKey,oldValue,newValue:JSON.stringify(other)});await h.flush();assert.equal(h.ctx.AuditClassroom.isReady(),false);assert.equal(h.node('auditFields').disabled,true);assert.deepEqual(h.workspace(),{});assert.equal(h.saves().length,0);assert.equal(h.calls.some(c=>c.method==='forget'),false);assert.deepEqual(JSON.parse(h.storage.get(savedKey)),other);
});
test('identity expiry during a write preserves queued work and closes the editable form',async()=>{
 const h=harness();await h.start();h.edit(0,record('must retain'));h.setUid(null);await h.flush();assert.equal(h.node('auditFields').disabled,true);assert.equal(h.ctx.AuditClassroom.isReady(),false);assert.equal(JSON.parse(h.storage.get(draftKey+':queue')).dirty[0].ai,'must retain');assert.equal(h.storage.has(savedKey),true);
});

test('a second tab never opens or exports the writable draft',async()=>{
 const h=harness({storage:storedClass(),editorAvailable:false});await h.ready();
 assert.equal(h.node('auditFields').disabled,true);assert.equal(h.node('classLocalBackup').disabled,true);
 assert.equal(h.calls.length,0);assert.match(h.node('classError').textContent,/jiné kartě/);
});
test('a different Firebase identity cannot export the cached answers',async()=>{
 const h=harness({storage:storedClass(),initialUid:'anotherIdentity'});await h.ready();
 h.node('classLocalBackup').click();assert.equal(h.backups.length,0);assert.equal(h.downloads.length,0);
 assert.doesNotMatch(h.node('classResumeText').textContent,/Student/);
});
test('an offline reload keeps a previously acknowledged case clean with its known revision',async()=>{
 const storage=storedClass();storage.set(draftKey+':queue',JSON.stringify({version:2,dirty:{},operations:{},revisions:{0:4}}));
 const h=harness({storage,handlers:{resume:async()=>{throw offline();}}});await h.ready();
 assert.equal(h.workspace()[0].ai,'saved local answer');assert.equal(h.ctx.AuditClassroom.hasPending(),false);
 h.edit(0,record('offline edit'));await h.flush();assert.equal(h.saves()[0].args[2].baseRevision,4);
});
test('a clean older display cache cannot overwrite a newer server revision on return',async()=>{
 const storage=storedClass();storage.set(draftKey+':queue',JSON.stringify({version:2,dirty:{},operations:{},revisions:{0:2}}));
 const h=harness({storage,handlers:{resume:async()=>({...credential,records:{0:{record:record('server current'),revision:3,savedAt:'2026-11-23T12:00:00Z'}}})}});
 await h.ready();assert.equal(h.workspace()[0].ai,'server current');await h.flush();assert.equal(h.saves().length,0);
});
test('checkbox-only drafts survive reboot and are saved',async()=>{
 const h=harness();await h.start();h.edit(0,{...record(''),tool:'',readConfirmed:true});await h.flush();
 assert.equal(h.saves().length,1);assert.equal(h.saves()[0].args[2].record.readConfirmed,true);
});

test('offline navigation serves the cached public shell and excludes all teacher and Firebase requests',async()=>{
 const worker=readFileSync(new URL('../pravni-audit-ai/offline-worker.js',import.meta.url),'utf8');
 const base='https://example.test/karierovy-poradce-29/pravni-audit-ai/';
 const stored=new Map(),events=new Map(),removed=[];
 const cache={addAll:async requests=>{for(const r of requests){assert.equal(r.credentials,'omit');stored.set(r.url,new Response(r.url));}},match:async key=>stored.get(key)?.clone()};
 let assetsAtActivation;
 const env={self:{location:new URL('offline-worker.js',base),clients:{claim:async()=>{}},skipWaiting:async()=>{assetsAtActivation=stored.size;},addEventListener:(name,fn)=>events.set(name,fn)},URL,Request,Promise,
   caches:{open:async()=>cache,keys:async()=>['pravni-audit-ai-public-shell:/karierovy-poradce-29/pravni-audit-ai/:old','jinypredmet'],delete:async name=>removed.push(name)},
   fetch:async()=>{throw new TypeError('offline');}};
 vm.runInNewContext(worker,env);
 async function run(name,parts){let result;events.get(name)({...parts,waitUntil:r=>{result=r;},respondWith:r=>{result=r;}});return result;}
 await run('install');assert.equal(assetsAtActivation,20);await run('activate');
 assert.equal(stored.size,20);assert.deepEqual(removed,['pravni-audit-ai-public-shell:/karierovy-poradce-29/pravni-audit-ai/:old']);
 const cached=await run('fetch',{request:new Request(base)});assert.equal(await cached.text(),base+'index.html');
 assert.equal(await (await run('fetch',{request:new Request(base+'#moje-prace')})).text(),base+'index.html');
 for(const url of [base+'ucitel/',base+'ucitel/teacher.js',base+'unknown',base+'../','https://firestore.googleapis.com/v1/projects/model'])assert.equal(await run('fetch',{request:new Request(url)}),undefined);
 env.fetch=async()=>new Response('forbidden',{status:403});
 const denied=await run('fetch',{request:new Request(base)});assert.equal(denied.status,403);
 env.fetch=async()=>new Response('temporary failure',{status:503});
 assert.equal(await (await run('fetch',{request:new Request(base)})).text(),base+'index.html');
});

test('returning online submits the edited offline worksheet and shows success only after acknowledgement',async()=>{
 let online=false,ack;
 const h=harness({storage:storedClass(),handlers:{
   resume:async()=>{if(!online)throw offline();return credential;},
   save:async()=>new Promise(resolve=>{ack=resolve;}),
 }});
 await h.ready();h.edit(0,record('written offline'));assert.equal(h.saves().length,0);
 online=true;h.ctx.dispatchEvent({type:'online'});
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(h.saves().length,1);assert.equal(h.saves()[0].args[2].record.ai,'written offline');
 assert.doesNotMatch(h.ctx.AuditClassroom.getState().message,/Uloženo pro vyučující/);
 ack({revision:1,savedAt:'2026-11-23T12:00:00Z'});await new Promise(resolve=>setImmediate(resolve));
 assert.equal(h.ctx.AuditClassroom.hasPending(),false);assert.match(h.ctx.AuditClassroom.getState().message,/Uloženo pro vyučující/);
});


test('a deliberate case selection is separate from answers and the first displayed case is never inferred',async()=>{
 const h=harness();await h.start();assert.equal(h.calls.some(c=>c.method==='selectCase'),false);
 h.ctx.dispatchEvent({type:'audit:case-selected',detail:{caseId:0}});await new Promise(r=>setImmediate(r));
 assert.deepEqual(h.calls.find(c=>c.method==='selectCase').args,[uid,'0']);assert.equal(h.saves().length,0);
});
test('offline selections coalesce to the last choice after reconnect and do not create answer revisions',async()=>{
 const h=harness();await h.start();h.ctx.navigator.onLine=false;
 for(const id of [0,2,5])h.ctx.dispatchEvent({type:'audit:case-selected',detail:{caseId:id}});
 assert.equal(h.calls.some(c=>c.method==='selectCase'),false);
 assert.equal(JSON.parse(h.storage.get(draftKey+':selection')).pending,'5');
 h.ctx.navigator.onLine=true;h.ctx.dispatchEvent({type:'online'});await new Promise(r=>setImmediate(r));
 assert.deepEqual(h.calls.filter(c=>c.method==='selectCase').map(c=>c.args[1]),['5']);assert.equal(h.saves().length,0);
 assert.equal(JSON.parse(h.storage.get(draftKey+':selection')).pending,null);
});
test('an older rules version can deny selection while answers still save',async()=>{
 const h=harness({handlers:{selectCase:async()=>{throw failure(403,'PERMISSION_DENIED');}}});await h.start();
 h.ctx.dispatchEvent({type:'audit:case-selected',detail:{caseId:4}});await new Promise(r=>setImmediate(r));
 assert.equal(h.node('classSelectionNote').hidden,false);h.edit(4,record('actual work'));await h.flush();
 assert.equal(h.saves().length,1);assert.match(h.ctx.AuditClassroom.getState().message,/Uloženo pro vyučující/);
});
