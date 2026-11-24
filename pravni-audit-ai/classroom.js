'use strict';
(() => {
  const remote = window.AuditStore;
  const SYNC_INTERVAL = 30000;
  const IDLE_DELAY = 1500;
  let idleTimer = null;
  let closing = false;
  let ownsEditor = false;
  let selectedCase = null, pendingSelection = null, sendingSelection = false, selectionDenied = false;
  let selectionTimer = null;
  const SESSION_KEY = 'pravni-audit-firebase-session-v1';
  const ENTRY_KEY = 'pravni-audit-firebase-entry-v1';
  if(globalThis.navigator?.serviceWorker && globalThis.isSecureContext){
    navigator.serviceWorker.register('./offline-worker.js').catch(()=>{
      // An open worksheet still uses its own local draft when the static cache
      // is unavailable (for example a policy disabling service workers).
    });
  }
  const $ = id => document.getElementById(id);
  const bridge = window.AuditBridge;
  let session = null, savedSession = null, room = null, generation = 0;
  let revisions = {}, dirty = {}, operations = {}, conflicts = new Set(), rejected = new Map();
  let timer = null, inFlight = false, starting = false, restoring = false, initializing = true, authReady = false;
  let lastSavedAt = null, networkError = '', localError = false, pendingEntry = null;
  const clone = value => JSON.parse(JSON.stringify(value));
  const stable = value => value && typeof value === 'object' && !Array.isArray(value) ? JSON.stringify(Object.fromEntries(Object.keys(value).sort().map(k=>[k,value[k]]))) : JSON.stringify(value);
  const same = (a,b) => stable(a) === stable(b);
  const hasWork = record => record?.readConfirmed === true || (record && Object.entries(record).some(([key,value]) => !['complete','completedAt','readConfirmed'].includes(key) && typeof value === 'string' && value.length>0));
  function read(key, fallback) { try { const value=localStorage.getItem(key);return value ? JSON.parse(value) : fallback; } catch { return fallback; } }
  function write(key,value) { try { localStorage.setItem(key,JSON.stringify(value));return true; } catch { localError=true;return false; } }
  function remove(key){try{localStorage.removeItem(key);return localStorage.getItem(key)===null;}catch{return false;}}
  function roomKey(s=session) { return `pravni-audit-firebase-v1:${s.roomId}:${s.studentId}`; }
  function queueKey(s=session) { return `${roomKey(s)}:queue`; }
  function saveQueue() { if(session)write(queueKey(),{version:2,dirty,operations,revisions}); }
  function errorText(e) { return e?.message || 'Spojení není dostupné. Nezavírejte rozepsanou stránku.'; }
  function validCredential(value){return value&&value.roomId==='pravni-audit-ai'&&typeof value.studentId==='string'&&/^[A-Za-z0-9_-]{1,128}$/.test(value.studentId)&&value.token===value.studentId&&typeof value.displayName==='string';}
  async function remoteCall(method,args=[],myGeneration=generation){
    if(!remote?.configured){const error=new Error('Automatické ukládání ještě není připojené. Výklad a vzor můžete používat.');error.status=503;error.code='COURSE_NOT_CONFIGURED';throw error;}
    const data=await remote[method](...args);
    if(myGeneration!==generation){const error=new Error('Pracovní prostor se změnil.');error.code='WORKSPACE_CHANGED';throw error;}
    return data;
  }
  function pendingCount(){return new Set([...Object.keys(dirty),...Object.keys(operations)]).size;}
  function canRetry(){return [...new Set([...Object.keys(dirty),...Object.keys(operations)])].some(id=>!conflicts.has(id)&&!rejected.has(id));}
  function state(){
    if(!session)return null;
    let message='',level='';
    if(localError){message='Místní zálohu se nepodařilo uložit. Nezavírejte rozepsanou stránku; nejdřív stáhněte svou kopii. ';level='error';}
    if(conflicts.size){message+='Případ se změnil také v jiné kartě. Otevřete „Vyřešit rozdíl“. Ostatní případy se ukládají dál.';level='error';}
    else if(rejected.size){const [id,reason]=rejected.entries().next().value;message+=`Případ ${Number(id)+1} se neuložil: ${reason} Upravte uvedené pole. Rozepsané odpovědi jsou v této otevřené stránce.`;level='error';}
    else if(room?.status!=='open'){message+='Ukládání je pozastavené. Nové změny jsou zatím jen v tomto prohlížeči.';level='warning';}
    else if(networkError){message+='Čeká na připojení. '+networkError+' Poslední změny vyučující zatím nemusí vidět.';level='warning';}
    else if(inFlight){message+='Ukládání pro vyučující…';level='warning';}
    else if(pendingCount()){message+=localError?'Odeslání pro vyučující čeká, znovu se pokusíme přibližně do 30 sekund.':'Místně uloženo. Po krátké pauze v psaní odešleme změny pro vyučující.';level='warning';}
    else{message+=lastSavedAt?'Uloženo pro vyučující · '+new Date(lastSavedAt).toLocaleTimeString('cs-CZ'):'Připraveno. Jakmile začnete psát, odpovědi se automaticky uloží pro vyučující.';}
    return {message,level:localError?'error':level};
  }
  function render(){
    const s=state();
    document.body.classList.toggle('shared-mode',!!session);
    $('classJoin').hidden=!!session||!!savedSession;
    $('classActive').hidden=!session;
    $('classResume').hidden=!!session||!savedSession;
    $('auditFields').disabled=!session||closing;
    $('workGate').hidden=!!session;
    $('classJoinButton').disabled=starting||restoring||initializing||!authReady||!remote?.configured;
    $('className').disabled=starting||restoring||initializing||!authReady||!remote?.configured;
    $('classModeText').textContent=session?'Váš pracovní list':restoring||initializing?'Otevírám Váš pracovní list…':!remote?.configured?'Pracovní list čeká na připojení':'Začněte svým jménem';
    $('classJoinLead').textContent=remote?.configured?(session?'Před odchodem zkontrolujte, že vidíte zprávu „Uloženo pro vyučující“.':'Zadejte jméno a příjmení a zvolte „Začít pracovat“.'):'Výklad a vzor jsou dostupné. Sdílenou práci bude možné otevřít po dokončení připojení ukládání.';
    $('introMode').textContent=session?'Vyberte případ a pracujte. Rozpracované odpovědi se ukládají automaticky.':'Napište nahoře jméno a otevřete vlastní pracovní list. Výklad a vzor si můžete prohlédnout kdykoliv.';
    $('classLocalBackup').disabled=!session||closing;
    if(savedSession){$('classResumeText').textContent=restoring?'Ověřuji přístup k pracovnímu listu…':'Na tomto zařízení zůstal dřívější vstup.';$('classResumeButton').disabled=restoring;}
    if(!session){$('classIdentity').textContent='';$('classSync').textContent='';}
    if(session){
      $('classIdentity').textContent=session.displayName;
      $('classSync').textContent=s.message;$('classSync').className='classroom-status '+s.level;
    }
    $('classSelectionNote').hidden=!session||!selectionDenied;
    $('classConflict').hidden=!conflicts.size;
    $('importButton').disabled=!session;
    $('classForget').hidden=!session&&!savedSession;
    $('classForget').disabled=closing||restoring;
    bridge?.refreshSaveState(session?undefined:'Vlastní odpovědi začnete vyplňovat po zadání jména.');
  }
  window.AuditClassroom={getState:state,hasPending:()=>!!session&&pendingCount()>0,isReady:()=>!!session&&!closing,getIdentity:()=>session?.displayName||null,getWorkspaceId:()=>session?.studentId||null};
  function mutationId(){
    if(typeof crypto.randomUUID==='function')return crypto.randomUUID();
    return Array.from(crypto.getRandomValues(new Uint8Array(16)),byte=>byte.toString(16).padStart(2,'0')).join('');
  }
  function selectionKey(credential){return roomKey(credential)+':selection';}
  function persistSelection(){
    if(!session)return;
    write(selectionKey(session),{current:selectedCase,pending:pendingSelection});
  }
  function selected(event){
    const id=String(event.detail?.caseId);
    if(!session||closing||!ownsEditor||!/^[0-9]$/.test(id))return;
    if(selectedCase===id&&pendingSelection===null)return;
    selectedCase=id;
    if(!selectionDenied)pendingSelection=id;
    persistSelection();
    if(!selectionDenied)sendSelection();
  }
  async function sendSelection(){
    clearTimeout(selectionTimer);selectionTimer=null;
    if(!session||closing||sendingSelection||pendingSelection===null||selectionDenied||globalThis.navigator?.onLine===false)return;
    const mine=generation,id=pendingSelection,uid=session.studentId;
    sendingSelection=true;
    try{
      await remoteCall('selectCase',[uid,id],mine);
      if(mine!==generation)return;
      if(pendingSelection===id)pendingSelection=null;
      persistSelection();
    }catch(error){
      if(mine!==generation)return;
      if(error.status===403||error.status===401){
        selectionDenied=true;pendingSelection=null;persistSelection();render();
      }else{
        selectionTimer=setTimeout(sendSelection,SYNC_INTERVAL);
      }
    }finally{
      if(mine===generation){
        sendingSelection=false;
        if(pendingSelection!==null&&!selectionDenied&&!selectionTimer)sendSelection();
      }
    }
  }
  function schedule(afterEdit=false){
    if(!session)return;
    // Local drafts are immediate. One fixed window coalesces continuous typing;
    // resetting a debounce on every key would postpone a long answer indefinitely.
    if(!timer)timer=setTimeout(flush,SYNC_INTERVAL);
    if(afterEdit&&!networkError){
      clearTimeout(idleTimer);
      idleTimer=setTimeout(flush,IDLE_DELAY);
    }
    render();
  }
  function changed(event){
    if(!session||closing)return;
    const {caseId,record}=event.detail;
    const id=String(caseId);
    if(!/^[0-9]$/.test(id)||!record||typeof record!=='object')return;
    if(rejected.has(id)){rejected.delete(id);delete operations[id];networkError='';}
    if(!hasWork(record)&&!revisions[id]&&!operations[id]){delete dirty[id];saveQueue();render();return;}
    if(revisions[id]===undefined)revisions[id]=0;
    dirty[id]=clone(record);saveQueue();schedule(true);
  }
  async function flush(){
    clearTimeout(timer);timer=null;clearTimeout(idleTimer);idleTimer=null;
    if(!session||closing||inFlight||room?.status!=='open')return;
    const myGeneration=generation,s=session;
    inFlight=true;render();
    try{
      for(const id of new Set([...Object.keys(operations),...Object.keys(dirty)])){
        if(myGeneration!==generation||session!==s)break;
        if(conflicts.has(id)||rejected.has(id))continue;
        if(!operations[id])operations[id]={record:clone(dirty[id]),baseRevision:revisions[id]||0,mutationId:mutationId()};
        saveQueue();const op=operations[id];
        try{
          const data=await remoteCall('save',[s.studentId,id,op],myGeneration);
          if(myGeneration!==generation)break;
          revisions[id]=data.revision;lastSavedAt=data.savedAt;
          if(same(dirty[id],op.record))delete dirty[id];
          delete operations[id];networkError='';saveQueue();
          session.lastSavedAt=lastSavedAt;savedSession=clone(session);write(SESSION_KEY,savedSession);
        }catch(e){
          if(myGeneration!==generation)break;
          if(e.status===409){conflicts.add(id);networkError='';}
          else if(e.status===401){pauseIdentity(errorText(e));}
          else if(e.status===403){rejected.set(id,errorText(e));networkError='';}
          else if([400,413,415,422].includes(e.status)){rejected.set(id,errorText(e));delete operations[id];networkError='';saveQueue();}
          else{networkError=errorText(e);}
          if(e.status===409||rejected.has(id))continue;
          break;
        }
      }
    }finally{
      if(myGeneration===generation){inFlight=false;render();if(canRetry())schedule();}
    }
  }
  function stop(){
    generation++;clearTimeout(selectionTimer);selectionTimer=null;sendingSelection=false;clearTimeout(timer);timer=null;clearTimeout(idleTimer);idleTimer=null;inFlight=false;
  }
  function pauseIdentity(message){
    saveQueue();stop();resetWorkspace();render();
    showError(message+' Pro otevření práce je potřeba původní anonymní přihlášení. Svou dříve staženou zálohu můžete načíst do nového listu.');
  }
  function activate(data,credential,{discardCases=new Set(),offline=false}={}){
    bridge.store();
    const nextSession={...credential,roomId:data.room.id,studentId:data.studentId,displayName:data.displayName||credential.displayName,title:data.room.title};
    if(!validCredential(nextSession))throw new Error('Pracovní list se nepodařilo bezpečně otevřít. Zkuste připojení znovu.');
    const nextRevisions={},records={};let nextSavedAt=credential.lastSavedAt||null;
    for(const [id,value] of Object.entries(data.records||{})){records[id]=value.record;nextRevisions[id]=value.revision;if(value.savedAt&&(!nextSavedAt||value.savedAt>nextSavedAt))nextSavedAt=value.savedAt;}
    const queue=read(queueKey(nextSession),{});
    const nextDirty=queue.dirty||{},nextOperations=queue.operations||{};
    const localDraft=read(roomKey(nextSession),{});
    for(const id of discardCases){delete nextDirty[id];delete nextOperations[id];}
    if(offline)Object.assign(nextRevisions,queue.revisions||{});
    for(const [id,record] of Object.entries(localDraft||{})){
      if(discardCases.has(id))continue;
      if(offline){records[id]=record;continue;}
      // From v2 onward the outbox is written before the display cache. A clean
      // cache can therefore be older than a newer acknowledged server revision.
      if(queue.version===2)continue;
      const knownSavedCase=Number.isSafeInteger(queue.revisions?.[id])&&queue.revisions[id]>0;
      // A blank draft can be an intentional erasure of a saved case. Recover it
      // with the last acknowledged revision, so a newer remote edit still conflicts.
      if(/^[0-9]$/.test(id)&&record&&typeof record==='object'&&!nextDirty[id]&&!nextOperations[id]&&!same(record,records[id])&&(hasWork(record)||knownSavedCase))nextDirty[id]=record;
    }
    for(const id of new Set([...Object.keys(nextDirty),...Object.keys(nextOperations)])){
      if(!/^[0-9]$/.test(id))throw new Error('Místní záloha obsahuje neplatný případ. Nejdřív stáhněte její kopii.');
      const op=nextOperations[id];
      if(op&&(!op.record||!Number.isSafeInteger(op.baseRevision)||op.baseRevision<0||typeof op.mutationId!=='string'))throw new Error('Místní frontu nelze obnovit. Nejdřív stáhněte svou kopii.');
      nextRevisions[id]=queue.revisions?.[id]??op?.baseRevision??0;
      records[id]=nextDirty[id]||op.record;
    }
    const selection=read(selectionKey(nextSession),{});
    const validSelection=id=>typeof id==='string'&&/^[0-9]$/.test(id);
    selectedCase=validSelection(selection?.current)?selection.current:null;
    pendingSelection=validSelection(selection?.pending)?selection.pending:null;
    selectionDenied=false;
    bridge.switchWorkspace(roomKey(nextSession),records);
    if(!session&&selectedCase!==null)bridge.restoreCase(Number(selectedCase));
    stop();
    session=nextSession;room=data.room;savedSession=clone(session);
    revisions=nextRevisions;dirty=nextDirty;operations=nextOperations;lastSavedAt=nextSavedAt;
    conflicts=new Set();rejected=new Map();networkError='';localError=false;
    write(SESSION_KEY,savedSession);saveQueue();render();
    $('classError').hidden=true;
    if(pendingCount())schedule(!offline);
    if(!offline&&pendingSelection!==null)sendSelection();
    window.dispatchEvent(new CustomEvent('audit-session-ready',{detail:{displayName:session.displayName}}));
  }
  async function refreshRoom(){
    if(!session||closing||document.hidden)return;
    const myGeneration=generation,s=session;
    try{
      const data=await remoteCall('resume',[s.studentId],myGeneration);
      if(myGeneration!==generation)return;
      const updates={};
      for(const [id,item] of Object.entries(data.records||{})){
        if(!dirty[id]&&!operations[id]&&!conflicts.has(id)&&item.revision>(revisions[id]||0)){
          revisions[id]=item.revision;updates[id]=item.record;
        }
        if(item.savedAt&&(!lastSavedAt||item.savedAt>lastSavedAt))lastSavedAt=item.savedAt;
      }
      if(Object.keys(updates).length){bridge.applyServerRecords(updates);saveQueue();}
      room=data.room;networkError='';render();
      if(pendingCount())schedule();
    }catch(e){if(myGeneration===generation){if(e.status===401)pauseIdentity(errorText(e));else{networkError=errorText(e);render();}}}
  }
  async function join(event){
    event?.preventDefault();if(!ownsEditor||starting||initializing||!authReady||session||savedSession||!remote?.configured)return;
    const displayName=$('className').value.trim();
    if(displayName.length<2||displayName.length>80){showError('Napište jméno a příjmení v délce 2 až 80 znaků.');return;}
    const stored=pendingEntry||read(ENTRY_KEY,null);
    if(stored&&stored.displayName!==displayName){showError('Předchozí připojení ještě není potvrzené. Použijte stejné jméno, nebo zvolte „Začít nový vstup“.');$('classResetEntry').hidden=false;return;}
    pendingEntry={displayName};write(ENTRY_KEY,pendingEntry);starting=true;render();const myGeneration=generation;
    try{
      // Firebase keeps the anonymous student identity. Retrying start does not
      // create a second identity or borrow the separate teacher's Google login.
      const data=await remoteCall('start',[displayName],myGeneration);
      if(myGeneration!==generation)return;
      activate(data,{token:data.studentId,displayName});pendingEntry=null;remove(ENTRY_KEY);$('classResetEntry').hidden=true;
    }catch(e){if(myGeneration===generation){showError(errorText(e));if(e.code==='ENTRY_NAME_MISMATCH')$('classResetEntry').hidden=false;}}
    finally{starting=false;render();}
  }
  function showError(message){$('classError').hidden=false;$('classError').textContent=message;}
  function sameSavedSession(a,b){return !!a&&!!b&&a.roomId===b.roomId&&a.studentId===b.studentId;}
  function downloadSavedClass(){
    if(!session||closing)return;
    bridge.exportBackup();
    $('classBackupStatus').textContent='Stažení Vaší kopie bylo zahájeno.';
  }
  async function forgetSavedClass(){
    const forgotten=session||savedSession;if(!forgotten||closing||restoring)return;
    if(session)bridge.store();
    const savedQueue=read(queueKey(forgotten),{});
    const pending=session?pendingCount():Object.keys({...savedQueue.dirty,...savedQueue.operations}).length;
    const message=`Ukončit práci na tomto zařízení?\n\nUložený vstup a jeho místní odpovědi se z tohoto prohlížeče odstraní. Záznamy už uložené u vyučující zůstanou zachované. Ke stejnému listu se nelze vrátit pouze zadáním jména.${pending?'\n\nNěkteré změny ještě nejsou odeslané. Zrušte přepnutí a nejdřív stáhněte svou kopii; jinak tyto změny ztratíte.':''}`;
    if(!confirm(message))return;
    closing=true;stop();render();
    try{const identity=await remoteCall('ready');if(identity.uid===forgotten.studentId)await remoteCall('forget');}catch(e){closing=false;render();if(canRetry())schedule();showError('Odhlášení studenta se nepodařilo. '+errorText(e));return;}
    stop();let failed=false;
    for(const key of [SESSION_KEY,roomKey(forgotten),queueKey(forgotten),selectionKey(forgotten)]){
      if(key===SESSION_KEY&&!sameSavedSession(read(SESSION_KEY,null),forgotten))continue;
      if(!remove(key))failed=true;
    }
    closing=false;resetWorkspace();savedSession=null;restoring=false;starting=false;pendingEntry=null;remove(ENTRY_KEY);$('className').value='';$('classError').hidden=true;render();
    if(failed)showError('Prohlížeč neumožnil vymazat všechny údaje. Před prací jiného studenta vymažte data této stránky v nastavení prohlížeče.');
    else $('className').focus();
  }
  function resetWorkspace(){
    selectedCase=null;pendingSelection=null;selectionDenied=false;
    session=null;room=null;dirty={};operations={};revisions={};conflicts=new Set();rejected=new Map();networkError='';lastSavedAt=null;
    bridge.switchWorkspace(null,{});
    window.dispatchEvent(new CustomEvent('audit-session-ended'));
  }
  function forgetFromOtherTab(event){
    if(event.key!==SESSION_KEY&&event.key!==null&&event.key!==roomKey(session||savedSession||{roomId:'',studentId:''}))return;
    const savedNow=read(SESSION_KEY,null);
    if(event.key===SESSION_KEY&&sameSavedSession(savedNow,session))return;
    if(event.key!==SESSION_KEY&&event.newValue!==null)return;
    stop();resetWorkspace();savedSession=null;restoring=false;starting=false;render();
    showError('Pracovní list se změnil v jiné kartě. Tuto stránku obnovte, nebo ji zavřete.');
  }
  async function resume(){
    if(!ownsEditor||!savedSession||restoring||!remote?.configured)return;restoring=true;render();
    const credential=clone(savedSession),myGeneration=generation;
    let confirmedUid=null;
    try{
      const identity=await remoteCall('ready',[],myGeneration);
      confirmedUid=identity.uid;
      if(confirmedUid!==credential.studentId){const error=new Error('V tomto prohlížeči už není přístup k původnímu pracovnímu listu. Původní zápisy má vyučující. Do nového pracovního listu můžete načíst dříve staženou zálohu JSON.');error.status=401;error.code='STUDENT_SESSION_EXPIRED';throw error;}
      if(globalThis.navigator?.onLine===false){
        const offlineError=new Error('Připojení k internetu není dostupné.');
        offlineError.code='STORAGE_UNAVAILABLE';throw offlineError;
      }
      const data=await remoteCall('resume',[credential.studentId],myGeneration);
      if(myGeneration!==generation)return;activate(data,credential);
    }catch(e){
      if(myGeneration!==generation)return;
      // Only a positively restored, matching student identity may edit offline.
      // Configuration, authentication and unknown errors never activate old data.
      if(e.code==='STORAGE_UNAVAILABLE'&&confirmedUid===credential.studentId){
        try{
          activate({room:{id:credential.roomId,title:credential.title||'Právní audit AI',status:'open',permanent:true},studentId:credential.studentId,displayName:credential.displayName,records:{}},credential,{offline:true});
          networkError=errorText(e);render();
        }catch(local){showError(errorText(local));}
      }else showError(errorText(e));
    }finally{restoring=false;render();}
  }
  async function resolveConflict(){
    if(!session||!conflicts.size)return;
    if(!confirm('Nejdřív se stáhne kopie Vaší místní práce. U případu s konfliktem se načte verze uložená pro vyučující. Ostatní rozepsané případy zůstanou v listu. Místní rozdíly najdete ve stažené kopii. Pokračovat?'))return;
    const myGeneration=generation,s=session;
    try{
      const data=await remoteCall('resume',[s.studentId],myGeneration);
      if(myGeneration!==generation)return;
      bridge.exportBackup();activate(data,s,{discardCases:new Set(conflicts)});
    }catch(e){showError(errorText(e));}
  }
  // An origin-scoped, browser-owned lock serializes the shared draft and
  // outbox, including an offline reload. The browser releases it on tab close.
  function claimEditor(){
    const locks=globalThis.navigator?.locks;
    if(!locks){showError('Tento prohlížeč neumí ochránit rozepsanou práci ve více kartách. Otevřete pracovní list v aktuálním prohlížeči.');return Promise.resolve(false);}
    return new Promise(resolve=>{
      locks.request('pravni-audit-ai:student-editor:v1',{ifAvailable:true},async lock=>{
        if(!lock){showError('Pracovní list je otevřený v jiné kartě tohoto prohlížeče. Pokračujte tam, nebo ji zavřete a obnovte tuto stránku.');resolve(false);return;}
        ownsEditor=true;resolve(true);
        await new Promise(release=>window.addEventListener('pagehide',release,{once:true}));
        ownsEditor=false;
      }).catch(()=>{showError('Prohlížeč neumožnil otevřít pracovní list pro bezpečný zápis. Zkuste stránku obnovit.');resolve(false);});
    });
  }
  async function init(){
    render();
    if(!bridge||!remote?.configured){initializing=false;render();showError('Automatické ukládání ještě není připojené. Výklad a vzor můžete používat. Vaše nové odpovědi by se zatím vyučující neukládaly.');return;}
    if(!await claimEditor()){initializing=false;render();return;}
    window.addEventListener('pageshow',event=>{if(event.persisted)location.reload();});
    const saved=read(SESSION_KEY,null);if(validCredential(saved))savedSession=saved;
    pendingEntry=read(ENTRY_KEY,null);if(!savedSession&&pendingEntry?.displayName)$('className').value=pendingEntry.displayName;
    $('classForm').addEventListener('submit',join);
    $('classResumeButton').addEventListener('click',resume);
    $('classLocalBackup').addEventListener('click',downloadSavedClass);
    $('classForget').addEventListener('click',forgetSavedClass);
    $('classConflict').addEventListener('click',resolveConflict);
    $('classResetEntry').addEventListener('click',async()=>{
      if(!confirm('Začít nový vstup? Pokud se předchozí připojení už uložilo, zůstane u vyučující jako samostatný pracovní list.'))return;
      try{await remoteCall('forget');pendingEntry=null;remove(ENTRY_KEY);$('classResetEntry').hidden=true;$('classError').hidden=true;}
      catch(e){showError(errorText(e));}
    });
    window.addEventListener('audit:changed',changed);
    window.addEventListener('audit:case-selected',selected);
    window.addEventListener('storage',forgetFromOtherTab);
    window.addEventListener('online',()=>{if(session){refreshRoom();sendSelection();if(pendingCount())flush();}else if(savedSession)resume();});
    window.addEventListener('offline',()=>{networkError='Připojení k internetu není dostupné.';render();});
    document.addEventListener('visibilitychange',()=>{if(!document.hidden&&session){refreshRoom();if(pendingCount())schedule();}});
    window.addEventListener('beforeunload',event=>{if(session&&pendingCount()){saveQueue();event.preventDefault();event.returnValue='';}});
    render();
    try{await remoteCall('ready');authReady=true;initializing=false;render();if(savedSession)return resume();}
    catch(e){initializing=false;render();$('classJoinButton').disabled=true;showError('Přístup k pracovnímu listu se nepodařilo ověřit. Obnovte stránku. '+errorText(e));}
  }
  init();
})();
