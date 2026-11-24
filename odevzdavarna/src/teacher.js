import { createAuditStore } from './store.js';
import { submissionInfo } from './core.js';
import { el, date, renderRecords, download } from './ui.js';
import { LABELS, CASES } from './data.js';
const $=id=>document.getElementById(id), store=createAuditStore(window.AUDIT_FIREBASE_CONFIG);
let rows=[], authorized=false, stop=()=>{}, generation=0, detail=null, detailRequest=0;
function message(text,error=false){$('status').textContent=text;$('status').className='status'+(error?' error':'');}
function clear(){stop();stop=()=>{};generation++;detailRequest++;rows=[];detail=null;$('roster').replaceChildren();$('records').replaceChildren();$('detail').hidden=true;$('dashboard').hidden=true;}
function render(){
  const q=$('search').value.trim().toLocaleLowerCase('cs');
  const filtered=rows.filter(r=>submissionInfo(r).surname.toLocaleLowerCase('cs').includes(q));
  $('count').textContent=`${rows.length} odevzdání`;$('roster').replaceChildren();
  if(!filtered.length)$('roster').append(el('p',rows.length?'Tomuto příjmení neodpovídá žádné odevzdání.':'Zatím nebyla odevzdána žádná práce.','empty'));
  for(const student of filtered){
    const info=submissionInfo(student), card=el('article',undefined,'submission');
    const heading=el('h3',info.surname), meta=el('p',`Případy: ${info.received} / ${info.expected} · ${date(student.lastSavedAt||student.joinedAt)}`,'muted');
    const state=el('span',info.complete?'Přenos dokončen':'Částečný přenos',info.complete?'badge success':'badge warning');
    const open=el('button','Prohlédnout práci','secondary');open.type='button';open.addEventListener('click',()=>show(student.id));
    card.append(heading,state,meta,open);$('roster').append(card);
  }
}
function watch(){
  stop();const mine=++generation;message('Načítám odevzdané práce…');
  stop=store.watchStudents((students,meta)=>{
    if(!authorized||mine!==generation)return;
    rows=students.filter(submissionInfo).sort((a,b)=>(b.lastSavedAt||b.joinedAt||'').localeCompare(a.lastSavedAt||a.joinedAt||''));render();
    message(meta.fromCache?'Čekám na aktuální potvrzení ze serveru…':'Přehled je aktuální. Nová odevzdání se zobrazují automaticky.');
  },error=>{if(mine===generation)message('Přehled se nepodařilo načíst. '+error.message,true);});
}
async function show(id){
  const mine=++detailRequest,epoch=generation;detail=null;$('records').replaceChildren();$('detail').hidden=false;$('detailName').textContent='Načítám práci…';$('detailStatus').textContent='';$('download').disabled=true;
  $('detailName').focus();$('detail').scrollIntoView({block:'start'});
  try {
    const value=await store.studentDetails(id);if(!authorized||mine!==detailRequest||epoch!==generation)return;
    const info=submissionInfo(value.student);if(!info)throw new Error('Tento záznam nepatří do odevzdávárny.');
    detail=value;$('detailName').textContent=info.surname;$('detailStatus').textContent=`Případy: ${info.received} / ${info.expected} · ${info.complete?'Přenos dokončen':'Přenos zatím není kompletní'} · ${date(value.student.lastSavedAt)}`;
    renderRecords($('records'),value.records);$('download').disabled=false;
  } catch(error){if(mine===detailRequest&&epoch===generation){$('detailName').textContent='Práci nelze načíst';$('detailStatus').textContent=error.message;}}
}
$('signIn').addEventListener('click',async()=>{$('signIn').disabled=true;try{await store.teacherSignIn();}catch(error){message(error.message,true);}finally{$('signIn').disabled=false;}});
$('signOut').addEventListener('click',async()=>{try{await store.teacherSignOut();}catch(error){message('Odhlášení se nepodařilo: '+error.message,true);}});
$('refresh').addEventListener('click',()=>{if(authorized){const id=detail?.student.id;watch();if(id)void show(id);}});
$('search').addEventListener('input',render);
$('close').addEventListener('click',()=>{detailRequest++;detail=null;$('records').replaceChildren();$('detail').hidden=true;});
$('download').addEventListener('click',()=>{
  if(!authorized||!detail)return;
  const info=submissionInfo(detail.student);let text=`PRÁVNÍ AUDIT AI — ODEVZDANÁ PRÁCE\n${info.surname}\nPřijato: ${date(detail.student.lastSavedAt)}\nIdentifikátor: ${detail.student.id}\n`;
  for(const [id,item] of Object.entries(detail.records)){text+=`\n${Number(id)+1}. ${CASES[Number(id)].title}\n`;for(const [key,label] of Object.entries(LABELS))text+=`\n${label}\n${item.record[key]||'—'}\n`;}
  download('\uFEFF'+text,'odevzdana_prace.txt');
});
store.teacherOnAuth(auth=>{
  authorized=auth.authorized===true;clear();$('login').hidden=authorized;$('account').hidden=!authorized;
  if(!authorized){message(auth.error?.message||'Přihlaste se svým učitelským Google účtem.',!!auth.error);return;}
  $('email').textContent=auth.user.email;$('dashboard').hidden=false;watch();
});
