import { LABELS, CASES } from './data.js';
export function el(tag, text, cls) { const node=document.createElement(tag);if(text!==undefined)node.textContent=String(text);if(cls)node.className=cls;return node; }
export function date(value) { return value ? new Intl.DateTimeFormat('cs-CZ',{dateStyle:'medium',timeStyle:'short',timeZone:'Europe/Prague'}).format(new Date(value)) : '—'; }
export function renderRecords(container, records) {
  container.replaceChildren();
  for(const [id, item] of Object.entries(records)) {
    const r=item.record || item, details=el('details',undefined,'case');
    const summary=el('summary',`${Number(id)+1}. ${CASES[Number(id)].title}`);
    summary.append(el('span',r.complete?'Označeno jako vyplněné':'Rozpracovaný zápis','badge'));
    const body=el('div',undefined,'case-body');
    body.append(el('p',CASES[Number(id)].situation,'situation'));
    const dl=el('dl');
    for(const [key,label] of Object.entries(LABELS)) { dl.append(el('dt',label),el('dd',r[key] || 'Nevyplněno')); }
    dl.append(el('dt','Potvrzení vlastního přečtení předpisu'),el('dd',r.readConfirmed?'Ano':'Nepotvrzeno'));
    body.append(dl);if(item.savedAt)body.append(el('p','Přijato: '+date(item.savedAt),'muted'));
    details.append(summary,body);container.append(details);
  }
}
export function download(text,name,type='text/plain;charset=utf-8') {
  const url=URL.createObjectURL(new Blob([text],{type})),link=el('a');link.href=url;link.download=name;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
}
