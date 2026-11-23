'use strict';
(() => {
  const CASES = [
  {
    "title": "Dvě dohody o provedení práce",
    "situation": "Petra pracuje v jedné kavárně na DPP. Od ledna do června odpracovala 240 hodin. Zaměstnavatel jí nabízí další DPP na 110 hodin do konce roku 2026. Tvrdí, že na novou dohodu má nový limit 300 hodin.",
    "task": "Rozhodněte, zda může Petra na druhou DPP odpracovat dalších 110 hodin u stejného zaměstnavatele. Vypočítejte zbývající rozsah."
  },
  {
    "title": "Dohoda o pracovní činnosti",
    "situation": "Tomáš chce při studiu pracovat dlouhodobě 30 hodin týdně na DPČ. Zaměstnavatel má stanovenou týdenní pracovní dobu 40 hodin a nabízí mu rozvrh 30 hodin v každém týdnu po celou dobu dohody, bez týdnů s menším rozsahem.",
    "task": "Zjistěte, zda je takový pravidelný rozsah na DPČ přípustný a za jaké období se rozsah posuzuje."
  },
  {
    "title": "Zkušební doba",
    "situation": "Jana nastupuje 1. prosince 2026 jako administrativní pracovnice na pracovní poměr na dobu neurčitou. Pracovní smlouvu i zkušební dobu sjednávají v listopadu 2026. Zaměstnavatel chce sjednat sedmiměsíční zkušební dobu. Nejde o vedoucí pracovní místo.",
    "task": "Ověřte nejdelší zkušební dobu, kterou lze při vzniku tohoto pracovního poměru sjednat, a kdy a jak musí být sjednána."
  },
  {
    "title": "Pracovní smlouva",
    "situation": "Adam dostal návrh pracovní smlouvy, kde je uvedeno pouze „administrativní pracovník“ a mzda 32 000 Kč. Není zde místo výkonu práce ani den nástupu. Zaměstnavatel tvrdí, že ostatní údaje nejsou důležité.",
    "task": "Zjistěte povinné náležitosti pracovní smlouvy a rozlište je od dalších informací o pracovních podmínkách."
  },
  {
    "title": "Výpověď zaměstnance",
    "situation": "Lucie má pracovní poměr na dobu neurčitou. Chce odejít, protože dostala lepší nabídku. Zaměstnavatel jí říká, že výpověď přijme pouze tehdy, pokud uvede vážný důvod.",
    "task": "Ověřte, zda zaměstnanec musí uvádět důvod, jakou formu má výpověď mít a jak se určuje výpovědní doba. Které další údaje a dokumenty potřebujete k určení konkrétního dne skončení?"
  },
  {
    "title": "Skončení ve zkušební době",
    "situation": "Martin má platně sjednanou zkušební dobu, která ještě běží. Zjistil, že mu práce nevyhovuje. Zaměstnavatel tvrdí, že musí podat klasickou výpověď a zůstat další dva měsíce.",
    "task": "Zjistěte správný způsob skončení pracovního poměru ve zkušební době, formu a okamžik skončení."
  },
  {
    "title": "Dovolená při práci na DPP",
    "situation": "Eva má DPP uzavřenou od 1. září do 30. listopadu 2026. Ke dni 24. listopadu dohoda nepřetržitě trvá od 1. září a Eva již skutečně odpracovala 100 hodin. Zaměstnavatel tvrdí, že pracovníci na DPP nikdy nemají nárok na dovolenou.",
    "task": "Ověřte podmínky vzniku práva na dovolenou u DPP a rozhodněte, zda je tvrzení zaměstnavatele správné."
  },
  {
    "title": "Přestávka během směny",
    "situation": "Dospělý Karel (28 let) pracuje v obchodě osm hodin denně. Zaměstnavatel mu říká, že přestávku na jídlo a oddech nepotřebuje, protože má klidnější práci. Nejde o práci, kterou nelze přerušit.",
    "task": "Zjistěte, nejpozději po jaké době musí zaměstnanec dostat přestávku, jak dlouhou a zda se započítává do pracovní doby."
  },
  {
    "title": "Rodič a kratší pracovní doba",
    "situation": "Klientka pečuje o osmileté dítě. Po návratu do zaměstnání písemně žádá o kratší pracovní dobu. Zaměstnavatel její žádost bez vysvětlení zamítá s tím, že zkrácený úvazek je vždy pouze jeho dobrovolné rozhodnutí.",
    "task": "Ověřte, zda existuje zvláštní ochrana zaměstnance pečujícího o dítě a kdy zaměstnavatel může žádosti nevyhovět."
  },
  {
    "title": "Odstupné při organizační změně",
    "situation": "Pavel pracuje u zaměstnavatele nepřetržitě tři roky. Jeho pracovní doba není rozvržena v kontu pracovní doby. Zaměstnavatel ruší jeho pracovní místo a chce mu dát výpověď pro nadbytečnost. Současně tvrdí, že při takovém skončení nemá Pavel právo na žádné odstupné.",
    "task": "Najděte právní podmínky výpovědi pro nadbytečnost a minimální odstupné podle délky pracovního poměru."
  }
];
  const FIELD_LABELS = {
  "tool": "AI nástroj a model",
  "checkedAt": "Datum Vašeho ověření",
  "ai": "Skutečná odpověď AI",
  "law": "Předpis, paragraf a odstavec",
  "effective": "Použité znění účinné od",
  "source": "Přesný odkaz na přečtený zdroj",
  "quote": "Krátká přesná citace z ustanovení",
  "meaning": "Co pravidlo znamená pro tento případ?",
  "verdict": "Jak hodnotíte odpověď AI?",
  "assessment": "Proč ji potvrzujete, nebo opravujete?",
  "advice": "Vaše doporučení klientovi"
};
  const FIELD_KEYS = Object.keys(FIELD_LABELS);
  const $ = id => document.getElementById(id);
  const state = { authorized:false, user:null, students:[], rosterLoaded:false, rosterFresh:false, selectedId:'', selectedCase:'0', selectedData:null, history:[], snapshotId:'', selectedSnapshot:null, historyLoadedKey:'' };
  let store=null, authGeneration=0, watchGeneration=0, detailGeneration=0, historyGeneration=0;
  let stopWatching=()=>{}, stopAuth=()=>{}, authBusy=false, lastDetailFingerprint='';
  const element = (tag,text='',className='') => { const el=document.createElement(tag); if(text!==null)el.textContent=String(text);if(className)el.className=className;return el; };
  const write=(id,text)=>{const el=$(id),next=String(text??'');if(el.textContent!==next)el.textContent=next;};
  const message=(id,text)=>{write(id,text);$(id).hidden=!text;};
  const hasContent=record=>!!record&&FIELD_KEYS.some(key=>typeof record[key]==='string'&&record[key].trim());
  const present=value=>typeof value==='string'&&value.trim().length>0;
  const timestamp=value=>typeof value==='string'&&!Number.isNaN(Date.parse(value))?value:null;
  function formatDate(value){return timestamp(value)?new Intl.DateTimeFormat('cs-CZ',{timeZone:'Europe/Prague',day:'numeric',month:'numeric',year:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit'}).format(new Date(value)):'Zatím bez potvrzeného uložení';}
  function pragueDate(value){if(!timestamp(value))return '';const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Prague',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(value));return ['year','month','day'].map(key=>parts.find(part=>part.type===key)?.value||'').join('-');}
  function safeUrl(value){try{const url=new URL(value);return ['https:','http:'].includes(url.protocol)&&url.hostname?url.href:null;}catch{return null;}}
  function validDate(value){return typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&timestamp(value)&&new Date(value).toISOString().slice(0,10)===value;}
  function complete(record){return !!record&&record.complete===true&&record.readConfirmed===true&&FIELD_KEYS.every(key=>present(record[key]))&&validDate(record.checkedAt)&&validDate(record.effective)&&!!safeUrl(record.source)&&['Správná','Částečně správná','Nesprávná','Nelze rozhodnout bez dalších údajů'].includes(record.verdict);}
  function status(summary){if(!summary||!summary.hasContent)return {label:'Bez vyplněného zápisu',kind:'empty'};if(summary.complete)return {label:'Audit vyplněn',kind:'complete'};if(summary.hasConclusion)return {label:'Zapsán vlastní závěr',kind:'progress'};if(summary.hasEvidence)return {label:'Zapsán právní důkaz',kind:'progress'};if(summary.hasAi)return {label:'Vložena odpověď AI',kind:'progress'};return {label:'Rozpracováno',kind:'progress'};}
  function recordStatus(record){return status({hasContent:hasContent(record),complete:complete(record),hasConclusion:present(record?.assessment)&&present(record?.advice),hasEvidence:present(record?.law)&&present(record?.source)&&present(record?.quote),hasAi:present(record?.ai)});}
  function errorText(error){const codes={MODEL_ACCESS_REQUIRED:"Tento zápis není mezi modelovými profily ověřenými pro toto přihlášení.",COURSE_NOT_CONFIGURED:'Nastavení ukládání a přístupu vyučující zatím není dokončené.',TEACHER_NOT_ALLOWED:'Tento účet nemá přístup k práci studentů. Přihlaste se určeným účtem vyučující.',AUTH_CANCELLED:'Přihlášení bylo zrušeno. Až budete chtít pokračovat, zkuste je znovu.',AUTH_POPUP_BLOCKED:'Prohlížeč zablokoval přihlašovací okno. Povolte pro tuto stránku vyskakovací okno a zkuste přihlášení znovu.'};return codes[error?.code]||error?.message||'Připojení se nepodařilo. Zkuste to znovu.';}
  function denied(error){return error?.status===401||error?.status===403||['TEACHER_NOT_ALLOWED','permission-denied','firestore/permission-denied','unauthenticated'].includes(error?.code);}
  function sameAuth(generation){return state.authorized&&generation===authGeneration;}
  function clearPrivateData(){
    authGeneration++;watchGeneration++;detailGeneration++;historyGeneration++;stopWatching();stopWatching=()=>{};
    state.authorized=false;state.user=null;state.students=[];state.rosterLoaded=false;state.rosterFresh=false;state.selectedId='';state.selectedData=null;state.history=[];state.snapshotId='';state.selectedSnapshot=null;state.historyLoadedKey='';lastDetailFingerprint='';
    $('dashboard').hidden=true;$('studentDetail').hidden=true;$('detailBody').hidden=true;$('teacherIdentity').hidden=true;$('signOutButton').hidden=true;
    for(const id of ['rosterBody','recordFields','recordMeta','teacherPrint','detailTitle','detailJoined','teacherIdentity','historicalText','caseSituation','caseTask','readingConfirmation'])$(id).replaceChildren();
    $('historySelect').replaceChildren(element('option','Aktuální zápis'));$('historyPanel').open=false;$('historicalNotice').hidden=true;
    $('nameFilter').value='';
    $('dateFilter').value='';
    $('caseFilter').value='all';
    $('resetFilters').hidden=true;
    for(const option of $('detailCase').options)option.textContent=`${Number(option.value)+1}. ${CASES[Number(option.value)].title}`;
    write('studentCount','0');write('completionSummary','');write('filterResult','');
    for(const id of ['rosterError','detailError','historyError'])message(id,'');
  }
  function showEntry(text=''){$('entry').hidden=false;$('loadingState').hidden=true;$('setupState').hidden=true;$('authState').hidden=false;message('authMessage',text);$('signInButton').disabled=authBusy;}
  function showSetup(){clearPrivateData();$('entry').hidden=false;$('loadingState').hidden=true;$('authState').hidden=true;$('setupState').hidden=false;message('authMessage','');}
  function blockAccess(error){clearPrivateData();showEntry(errorText(error));}
  function selectedFingerprint(student){return JSON.stringify([student?.lastSavedAt||null,Object.entries(student?.caseSummaries||{}).sort(([a],[b])=>Number(a)-Number(b)).map(([id,s])=>[id,s.revision,s.savedAt,s.hasContent,s.complete])]);}

  function watchStudents(){
    if(!state.authorized)return;stopWatching();const token=++watchGeneration,generation=authGeneration;write('liveStatus',state.rosterLoaded?'Obnovuji přehled…':'Načítám přehled…');
    try{
      const unsubscribe=store.watchStudents((students,metadata)=>{
        if(!sameAuth(generation)||token!==watchGeneration)return;
        if(!Array.isArray(students)){message('rosterError','Server nevrátil platný seznam studentů. Zkuste přehled obnovit.');return;}
        state.rosterFresh=metadata?.fromCache===false;
        if(state.rosterFresh){
          state.students=students;
          state.rosterLoaded=true;
        }else if(!state.rosterLoaded){
          write('liveStatus','Čeká na potvrzení serverem');
          message('rosterError','Přehled čeká na ověření přístupu k záznamům na serveru.');
          $('liveStatus').parentElement.classList.add('is-stale');
          return;
        }
        message('rosterError',state.rosterFresh?'':'Zobrazený přehled zatím není potvrzený serverem. Může obsahovat starší údaje nebo být neúplný. Po připojení se automaticky obnoví.');write('liveStatus',state.rosterFresh?'Přehled je aktuální':'Čeká na potvrzení serverem');$('liveStatus').parentElement.classList.toggle('is-stale',!state.rosterFresh);renderRoster();
        if(state.selectedId){const summary=state.students.find(item=>item.id===state.selectedId);if(!summary)closeDetail(false);else if(selectedFingerprint(summary)!==lastDetailFingerprint)void loadDetail(state.selectedId,false);}
      },error=>{
        if(!sameAuth(generation)||token!==watchGeneration)return;
        if(denied(error)){blockAccess(error);return;}
        message('rosterError',errorText(error)+(state.rosterLoaded?' Zobrazené údaje mohou být starší.':''));write('liveStatus','Přehled se neobnovuje');$('liveStatus').parentElement.classList.add('is-stale');
        if(!state.rosterLoaded){$('rosterEmpty').replaceChildren(element('h3','Přehled se nepodařilo načíst'),element('p','Zkuste tlačítko „Obnovit přehled“.'))}
      });
      if(sameAuth(generation)&&token===watchGeneration)stopWatching=typeof unsubscribe==='function'?unsubscribe:()=>{};else if(typeof unsubscribe==='function')unsubscribe();
    }catch(error){if(sameAuth(generation)){if(denied(error))blockAccess(error);else message('rosterError',errorText(error));}}
  }
  function onTeacherAuth(auth){
    if(auth?.authorized===true&&auth?.user?.emailVerified===true&&state.authorized&&state.user?.uid===auth.user.uid){state.user=auth.user;write('teacherIdentity',auth.user.email||auth.user.displayName||'Přihlášená vyučující');return;}
    clearPrivateData();
    if(auth?.error?.code==='COURSE_NOT_CONFIGURED'){showSetup();return;}
    if(auth?.authorized!==true||auth?.user?.emailVerified!==true){showEntry(auth?.error?errorText(auth.error):auth?.user?'Tento účet nemá přístup k práci studentů. Pro přehled použijte určený účet vyučující.':'');$('signOutButton').hidden=!auth?.user;return;}
    state.authorized=true;state.user=auth.user;$('entry').hidden=true;$('dashboard').hidden=false;$('teacherIdentity').hidden=false;$('signOutButton').hidden=false;
    write('teacherIdentity',auth.user.email||auth.user.displayName||'Přihlášená vyučující');message('authMessage','');renderRoster();watchStudents();
  }
  function filteredRows(){
    const search=$('nameFilter').value.trim().toLocaleLowerCase('cs-CZ'),caseId=$('caseFilter').value,date=$('dateFilter').value;
    return state.students.flatMap(student=>{
      if(!String(student.displayName||'').toLocaleLowerCase('cs-CZ').includes(search))return [];
      const matches=Object.entries(student.caseSummaries||{}).filter(([id,summary])=>(caseId==='all'||caseId===id)&&(!date||pragueDate(summary.savedAt)===date)).sort((a,b)=>Date.parse(b[1].savedAt||'')-Date.parse(a[1].savedAt||''));
      if(date&&!matches.length)return [];
      const selectedCase=caseId==='all'?matches[0]?.[0]||'0':caseId;
      return [{student,caseId:selectedCase,summary:student.caseSummaries?.[selectedCase]}];
    }).sort((a,b)=>String(a.student.displayName).localeCompare(String(b.student.displayName),'cs'));
  }
  function studentButton(label,id,caseId,className,action){const button=element('button',label,className);button.type='button';button.dataset.studentId=id;button.dataset.action=action;button.addEventListener('click',()=>selectStudent(id,caseId));return button;}
  function renderRoster(){
    if(!state.authorized)return;const rows=filteredRows();const focused=document.activeElement?.dataset?.studentId?{id:document.activeElement.dataset.studentId,action:document.activeElement.dataset.action}:null;
    write('studentCount',state.students.length);const done=state.students.filter(student=>Object.values(student.caseSummaries||{}).some(s=>s.hasContent&&s.complete)).length;
    write('completionSummary',state.rosterLoaded?`${done} z ${state.students.length} má alespoň jeden audit označený jako vyplněný.`:'');
    write('caseColumn',$('caseFilter').value==='all'?'Poslední uložený případ':'Případ podle filtru');$('resetFilters').hidden=!$('nameFilter').value&&!$('dateFilter').value&&$('caseFilter').value==='all';
    write('filterResult',state.rosterLoaded?`Zobrazeno ${rows.length} z ${state.students.length} studentů.`:'');
    $('rosterTableWrap').hidden=!rows.length;$('rosterEmpty').hidden=!!rows.length;const body=document.createDocumentFragment();
    if(!rows.length){let title='Načítám uloženou práci…',description='';if(state.rosterLoaded){title=state.students.length?'Filtrům neodpovídá žádný student':state.rosterFresh?'Zatím tu není žádný modelový profil':'Čekám na potvrzení přehledu';description=state.students.length?'Změňte datum, případ nebo hledané jméno.':state.rosterFresh?'Server nepotvrdil žádný z hledaných modelových profilů Alfa a Beta.':'Zatím nelze určit, zda jsou v kurzu uložení studenti. Obnovte připojení k internetu.';}$('rosterEmpty').replaceChildren(element('h3',title),element('p',description));}
    for(const {student,caseId,summary} of rows){
      const row=element('tr',null,state.selectedId===student.id?'selected':'');const name=element('th',null);name.scope='row';const button=studentButton(student.displayName,student.id,caseId,'student-name','name');button.setAttribute('aria-expanded',String(state.selectedId===student.id));button.setAttribute('aria-controls','studentDetail');name.append(button,element('small',`${Object.values(student.caseSummaries||{}).filter(s=>s.hasContent&&s.complete).length} / 10 auditů vyplněno`));
      const choice=student.selectedCaseId;
      const selection=element('small');
      if(typeof choice==='string'&&/^[0-9]$/.test(choice)){
        const title=`${Number(choice)+1}. ${CASES[Number(choice)].title}`;
        const openChoice=studentButton(title,student.id,choice,'text-button','choice');
        openChoice.setAttribute('aria-label',`Otevřít poslední volbu studenta ${student.displayName}: ${title}`);
        selection.append(element('span','Poslední volba studenta: '),openChoice);
      }else{
        selection.textContent='Volba případu zatím nezaznamenána.';
      }
      name.append(selection);
      const caseCell=element('td',null);caseCell.append(element('span',summary||$('caseFilter').value!=='all'?`${Number(caseId)+1}. ${CASES[Number(caseId)]?.title||'Případ'}`:'Zatím bez zápisu','case-title'));const currentStatus=status(summary);caseCell.append(element('span',currentStatus.label,`badge ${currentStatus.kind}`));
      const stages=element('td',null),stageList=element('div',null,'saved-stages');
      for(const stage of [{label:'AI',full:'Odpověď AI',done:summary?.hasAi},{label:'Důkaz',full:'Právní důkaz',done:summary?.hasEvidence},{label:'Závěr',full:'Vlastní závěr',done:summary?.hasConclusion}]){const saved=!!summary?.hasContent&&!!stage.done;const chip=element('span',null,`saved-stage ${saved?'is-done':'is-empty'}`);const visible=element('span',`${saved?'✓':'–'} ${stage.label}`);visible.setAttribute('aria-hidden','true');chip.append(visible,element('span',`${stage.full}: ${saved?'vyplněno':'zatím nevyplněno'}`,'sr-only'));stageList.append(chip);}stages.append(stageList);
      const time=element('td',null,'time-cell');if(timestamp(summary?.savedAt)){const timeEl=element('time',formatDate(summary.savedAt));timeEl.dateTime=summary.savedAt;time.append(timeEl);}else time.textContent='Zatím bez potvrzeného uložení';
      const action=element('td',null),open=studentButton('Prohlédnout',student.id,caseId,'button secondary small','open');open.setAttribute('aria-label',`Prohlédnout práci: ${student.displayName}`);action.append(open);row.append(name,caseCell,stages,time,action);body.append(row);
    }
    $('rosterBody').replaceChildren(body);
    if(focused)for(const button of $('rosterBody').querySelectorAll('[data-student-id]'))if(button.dataset.studentId===focused.id&&button.dataset.action===focused.action){button.focus({preventScroll:true});break;}
  }
  function selectStudent(id,caseId){
    if(!state.authorized)return;detailGeneration++;historyGeneration++;state.selectedId=id;state.selectedCase=caseId;state.selectedData=null;state.history=[];state.snapshotId='';state.selectedSnapshot=null;state.historyLoadedKey='';lastDetailFingerprint='';
    $('studentDetail').hidden=false;$('detailBody').hidden=true;$('detailLoading').hidden=false;$('historyPanel').open=false;message('detailError','');message('historyError','');
    const summary=state.students.find(student=>student.id===id);write('detailTitle',summary?.displayName||'Zápis studenta');write('detailJoined',summary?.joinedAt?`Vstup do auditu: ${formatDate(summary.joinedAt)}`:'');$('detailCase').value=caseId;renderRoster();$('detailTitle').focus({preventScroll:true});$('studentDetail').scrollIntoView({block:'start',behavior:'auto'});void loadDetail(id,true);
  }
  function closeDetail(restoreFocus=true){const previous=state.selectedId;detailGeneration++;historyGeneration++;state.selectedId='';state.selectedData=null;state.history=[];state.snapshotId='';state.selectedSnapshot=null;state.historyLoadedKey='';lastDetailFingerprint='';$('studentDetail').hidden=true;$('recordFields').replaceChildren();$('teacherPrint').replaceChildren();renderRoster();if(restoreFocus)for(const button of $('rosterBody').querySelectorAll('[data-student-id]'))if(button.dataset.studentId===previous&&button.dataset.action==='name'){button.focus({preventScroll:true});break;}}
  async function loadDetail(id,initial){
    if(!state.authorized||id!==state.selectedId)return;const generation=authGeneration,request=++detailGeneration;const before=state.students.find(student=>student.id===id);lastDetailFingerprint=selectedFingerprint(before);if(initial)$('detailLoading').hidden=false;
    try{
      const data=await store.studentDetails(id);if(!sameAuth(generation)||request!==detailGeneration||state.selectedId!==id)return;
      if(!data?.student||!data.records||typeof data.records!=='object')throw new Error('Zápisy studenta nemají očekávaný formát.');
      state.selectedData=data;write('detailTitle',data.student.displayName);write('detailJoined',data.student.joinedAt?`Vstup do auditu: ${formatDate(data.student.joinedAt)}`:'');message('detailError','');$('detailBody').hidden=false;$('detailLoading').hidden=true;renderDetail();if($('historyPanel').open)void loadHistory();
    }catch(error){if(!sameAuth(generation)||request!==detailGeneration||state.selectedId!==id)return;if(denied(error)){blockAccess(error);return;}lastDetailFingerprint='';message('detailError',errorText(error)+(state.selectedData?' Zobrazený zápis může být starší.':''));$('detailLoading').hidden=true;}
  }
  function field(key,record){const box=element('div',null,`audit-field ${key==='ai'?'ai-field':''}`);const label=element('dt',FIELD_LABELS[key]);const value=typeof record[key]==='string'?record[key]:'',content=element('dd',null,value.trim()?'':'not-filled');const href=key==='source'?safeUrl(value.trim()):null;if(!value.trim())content.textContent='Zatím nevyplněno';else if(href){const link=element('a',value);link.href=href;link.target='_blank';link.rel='noopener noreferrer';content.append(link);}else content.textContent=value;box.append(label,content);return box;}
  function group(title,keys,record,pair=false){const section=element('section',null,'record-group'),list=element('dl',null);section.append(element('h3',title));if(pair){const row=element('div',null,'field-pair');row.append(field(keys[0],record),field(keys[1],record));list.append(row);keys=keys.slice(2);}for(const key of keys)list.append(field(key,record));section.append(list);return section;}
  function renderDetail(){
    if(!state.authorized||!state.selectedData)return;
    const records=state.selectedData.records,current=records[state.selectedCase],snapshot=state.selectedSnapshot,saved=snapshot||current;
    for(const option of $('detailCase').options){const record=records[option.value]?.record;option.textContent=`${Number(option.value)+1}. ${CASES[Number(option.value)].title}${hasContent(record)?complete(record)?' — vyplněno':' — rozpracováno':' — bez zápisu'}`;}
    $('detailCase').value=state.selectedCase;write('caseSituation',CASES[Number(state.selectedCase)]?.situation||'');write('caseTask',CASES[Number(state.selectedCase)]?.task||'');
    $('historicalNotice').hidden=!snapshot;if(snapshot)write('historicalText',`Prohlížíte uloženou verzi ${snapshot.revision} z ${formatDate(snapshot.savedAt)}. Aktuální zápis tím neměníte.`);
    const meta=$('recordMeta');meta.replaceChildren();if(saved){const currentStatus=recordStatus(saved.record);meta.append(element('span',currentStatus.label,`badge ${currentStatus.kind}`),element('span',`Verze ${saved.revision} · Potvrzené uložení: ${formatDate(saved.savedAt)}`));}
    const content=hasContent(saved?.record);$('recordEmpty').hidden=content;$('readingConfirmation').hidden=!content;$('recordFields').replaceChildren();
    if(!content){$('recordEmpty').replaceChildren(element('h3',saved?'Tato uložená verze je prázdná':'Tento případ zatím nemá uložený zápis'),element('p',saved?'Případné dřívější zápisy najdete v uložených verzích.':'Jakmile student v auditu uloží změnu, objeví se zde.'));return;}
    const record=saved.record;$('recordFields').append(group('Odpověď AI',['tool','checkedAt','ai'],record,true),group('Právní důkaz',['law','effective','source','quote','meaning'],record,true),group('Vlastní závěr studenta',['verdict','assessment','advice'],record));
    write('readingConfirmation',`Student potvrdil vlastní přečtení a ověření ustanovení: ${record.readConfirmed?'ano':'zatím ne'}. Samotné zaškrtnutí ani čas uložení nejsou důkazem právní správnosti.`);
  }
  async function loadHistory(force=false){
    if(!state.authorized||!state.selectedData||!$('historyPanel').open)return;
    const uid=state.selectedId,caseId=state.selectedCase,key=`${uid}:${caseId}:${state.selectedData.records[caseId]?.revision||0}`;
    if(!force&&key===state.historyLoadedKey)return;
    const generation=authGeneration,request=++historyGeneration;$('historyLoading').hidden=false;message('historyError','');$('historySelectWrap').hidden=true;
    try{
      const history=await store.caseHistory(uid,caseId);if(!sameAuth(generation)||request!==historyGeneration||state.selectedId!==uid||state.selectedCase!==caseId)return;
      if(!Array.isArray(history))throw new Error('Historii se nepodařilo načíst v očekávaném formátu.');
      state.history=history.slice().sort((a,b)=>b.revision-a.revision).slice(0,40);state.historyLoadedKey=key;
      const options=document.createDocumentFragment(),latest=element('option',`Aktuální zápis${state.selectedData.records[caseId]?` — verze ${state.selectedData.records[caseId].revision}`:''}`);latest.value='';options.append(latest);
      for(const saved of state.history){const option=element('option',`Verze ${saved.revision} — ${formatDate(saved.savedAt)}`);option.value=saved.id;options.append(option);}
      if(state.selectedSnapshot&&!state.history.some(item=>item.id===state.snapshotId)){const saved=state.selectedSnapshot,option=element('option',`Ponechaná otevřená verze ${saved.revision} — ${formatDate(saved.savedAt)}`);option.value=saved.id;options.append(option);}
      $('historySelect').replaceChildren(options);$('historySelect').value=state.snapshotId;$('historySelectWrap').hidden=false;renderDetail();
    }catch(error){if(!sameAuth(generation)||request!==historyGeneration||state.selectedId!==uid||state.selectedCase!==caseId)return;if(denied(error)){blockAccess(error);return;}message('historyError',errorText(error));}
    finally{if(sameAuth(generation)&&request===historyGeneration)$('historyLoading').hidden=true;}
  }
  function resetHistory(){historyGeneration++;state.history=[];state.snapshotId='';state.selectedSnapshot=null;state.historyLoadedKey='';$('historySelect').replaceChildren(element('option','Aktuální zápis'));$('historySelect').options[0].value='';message('historyError','');$('historyLoading').hidden=true;}
  function exportStudent(){
    if(!state.authorized||!state.selectedData)return;
    const data={app:'pravni-audit-ai-teacher-export',version:1,exportedAt:new Date().toISOString(),student:state.selectedData.student,records:state.selectedData.records,note:'Aktuální zápisy. Jméno je zadáno studentem; vyplnění není hodnocením právní správnosti.'};
    const name=String(data.student.displayName||'student').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,60)||'student';
    const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json;charset=utf-8'}));const link=element('a',null);link.href=url;link.download=`pravni-audit-${name}.json`;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
  }
  function preparePrint(){
    const report=$('teacherPrint');report.replaceChildren();if(!state.authorized||!state.selectedData){report.append(element('p','Pro tisk zápisů otevřete detail studenta v přehledu vyučující.'));return;}
    const {student,records}=state.selectedData;report.append(element('h1','Právní audit AI — zápisy studenta'),element('p',student.displayName),element('p',`Připraveno k tisku: ${formatDate(new Date().toISOString())}. Jméno zadal student. Vyplnění nepotvrzuje právní správnost.`,'print-meta'));
    for(const [id,saved] of Object.entries(records).sort(([a],[b])=>Number(a)-Number(b))){const section=element('section',null,'print-case');section.append(element('h2',`${Number(id)+1}. ${CASES[Number(id)]?.title||'Případ'}`),element('p',`Verze ${saved.revision} · Potvrzené uložení ${formatDate(saved.savedAt)} · ${recordStatus(saved.record).label}`,'print-meta'));for(const key of FIELD_KEYS){const box=element('div',null,'print-field');box.append(element('h3',FIELD_LABELS[key]),element('p',saved.record[key]||'—'));section.append(box);}section.append(element('p',`Student potvrdil vlastní přečtení a ověření: ${saved.record.readConfirmed?'ano':'ne'}.`));report.append(section);}
    if(!Object.keys(records).length)report.append(element('p','Student zatím nemá uložený zápis.'));
  }
  async function signIn(){if(!store||authBusy)return;authBusy=true;$('signInButton').disabled=true;write('signInLabel','Otevírám přihlášení…');message('authMessage','');try{await store.teacherSignIn();}catch(error){if(!state.authorized){showEntry(errorText(error));}}finally{authBusy=false;$('signInButton').disabled=false;write('signInLabel','Přihlásit se účtem Google');}}
  async function signOut(){if(!store||authBusy)return;authBusy=true;clearPrivateData();showEntry();write('signInLabel','Odhlášení…');try{await store.teacherSignOut();}catch(error){showEntry(`Odhlášení se nepodařilo dokončit. Přehled je skrytý. ${errorText(error)}`);}finally{authBusy=false;$('signInButton').disabled=false;write('signInLabel','Přihlásit se účtem Google');}}

  for(let i=0;i<CASES.length;i++){const option=element('option',`${i+1}. ${CASES[i].title}`);option.value=String(i);$('caseFilter').append(option);$('detailCase').append(option.cloneNode(true));}
  for(const id of ['nameFilter','caseFilter','dateFilter'])$(id).addEventListener(id==='nameFilter'?'input':'change',()=>{closeDetail(false);renderRoster();});
  $('resetFilters').addEventListener('click',()=>{$('nameFilter').value='';$('caseFilter').value='all';$('dateFilter').value='';closeDetail(false);renderRoster();});
  $('refreshButton').addEventListener('click',()=>{
    closeDetail(false);
    watchStudents();
  });
  $('closeDetail').addEventListener('click',()=>closeDetail());
  $('detailCase').addEventListener('change',()=>{state.selectedCase=$('detailCase').value;resetHistory();renderDetail();if($('historyPanel').open)void loadHistory();});
  $('historyPanel').addEventListener('toggle',()=>{if($('historyPanel').open)void loadHistory();});
  $('historySelect').addEventListener('change',()=>{state.snapshotId=$('historySelect').value;state.selectedSnapshot=state.snapshotId?state.history.find(item=>item.id===state.snapshotId)||state.selectedSnapshot:null;renderDetail();});
  $('backToCurrent').addEventListener('click',()=>{state.snapshotId='';state.selectedSnapshot=null;$('historySelect').value='';renderDetail();});
  $('downloadStudent').addEventListener('click',exportStudent);$('printStudent').addEventListener('click',()=>{preparePrint();window.print();});window.addEventListener('beforeprint',preparePrint);
  $('signInButton').addEventListener('click',signIn);$('signOutButton').addEventListener('click',signOut);
  window.addEventListener('pagehide',()=>{clearPrivateData();stopAuth();stopAuth=()=>{};});
  window.addEventListener('pageshow',event=>{if(event.persisted)window.location.reload();});
  function initialize(){
    store=window.AuditStore;if(!store||!store.configured||store.scope!=='two-models-20261123'){showSetup();return;}
    try{stopAuth=store.teacherOnAuth(onTeacherAuth);}catch(error){if(error?.code==='COURSE_NOT_CONFIGURED'){showSetup();return;}$('loadingState').hidden=true;showEntry(errorText(error));}
  }
  void initialize();
})();
