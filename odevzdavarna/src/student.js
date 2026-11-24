import { createAuditStore } from './store.js';
import { parseBackup, MAX_BYTES, createDelivery } from './core.js';
import { renderRecords, date, download } from './ui.js';
const $=id=>document.getElementById(id), store=createAuditStore(window.AUDIT_FIREBASE_CONFIG);
let payload=null, delivery=null, receipt=null, busy=false, fileSequence=0;
function message(text,error=false){$('status').textContent=text;$('status').className='status'+(error?' error':'');}
function ready(){ $('submit').disabled=!payload||!$('surname').value.trim()||busy; }
$('surname').addEventListener('input',ready);
$('file').addEventListener('change',async()=>{
  const sequence=++fileSequence;payload=null;$('preview').hidden=true;ready();
  const file=$('file').files[0];if(!file){message('');return;}
  try {
    if(file.size>MAX_BYTES)throw new Error('Záloha musí být menší než 4 MB.');
    const parsed=parseBackup(await file.text());if(sequence!==fileSequence)return;payload=parsed;
    $('filename').textContent=file.name;$('summary').textContent=`Případy se zápisem: ${payload.count}. Označené jako vyplněné: ${payload.complete}.`;
    renderRecords($('records'),payload.records);$('preview').hidden=false;message('Soubor je připravený. Zkontrolujte příjmení a náhled, potom práci odešlete.');ready();
  } catch(error){if(sequence!==fileSequence)return;message(error.message,true);ready();}
});
$('submissionForm').addEventListener('submit',async event=>{
  event.preventDefault();if(!payload||busy||receipt)return;
  try { delivery ||= createDelivery(store,payload,$('surname').value); } catch(error){message(error.message,true);return;}
  busy=true;$('surname').disabled=true;$('file').disabled=true;ready();$('submit').textContent='Odesílám…';
  message('Připojuji odevzdávárnu. Tuto stránku zatím nezavírejte.');
  let slow=setTimeout(()=>{if(busy)message('Připojení trvá déle. Počkejte na potvrzení; zálohu JSON máte stále u sebe.');},15000);
  try {
    receipt=await delivery.send((done,total)=>message(`Potvrzené případy: ${done} / ${total}. Počkejte na dokončení.`));
    $('receiptText').textContent=`${receipt.surname} · Počet případů: ${receipt.count} · ${date(receipt.savedAt)}`;
    $('receiptId').textContent=receipt.id;$('receipt').hidden=false;$('submissionForm').hidden=true;
    message('Odevzdání je potvrzené.');$('receiptTitle').focus();
  } catch(error) {
    message(`Celé odevzdání zatím není potvrzené (potvrzené případy: ${delivery.received} / ${payload.count}). Zkontrolujte připojení a stiskněte „Zkusit odeslat znovu“. Již potvrzené části se neodešlou podruhé. ${error.code==='QUOTA_EXCEEDED'?'Služba nyní omezuje počet požadavků; zkuste to později.':''}`,true);
    $('submit').textContent='Zkusit odeslat znovu';
  } finally {clearTimeout(slow);busy=false;ready();}
});
$('receiptDownload').addEventListener('click',()=>download(`POTVRZENÍ ODEVZDÁNÍ — PRÁVNÍ AUDIT AI\n\nPříjmení: ${receipt.surname}\nPočet případů: ${receipt.count}\nPotvrzeno: ${date(receipt.savedAt)}\nIdentifikátor: ${receipt.id}\n`,'potvrzeni_odevzdani.txt'));
window.addEventListener('beforeunload',event=>{if(busy||delivery&&!receipt){event.preventDefault();event.returnValue='';}});
ready();
