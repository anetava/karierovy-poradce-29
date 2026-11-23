'use strict';
(() => {
  const data = window.AuditLearningContent;
  const work = document.getElementById('learning-work');
  if (!data || !work) return;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const icons = {
    book:'<path d="M12 7v14m0-14C9 4 5 4 2 5v15c3-1 7-1 10 1 3-2 7-2 10-1V5c-3-1-7-1-10 2Z"/>',
    search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
    pen:'<path d="m16 3 5 5-12 12-6 1 1-6Z"/><path d="m13 6 5 5"/>',
    expand:'<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>',
    copy:'<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V3H3v13h5"/>',
    check:'<path d="m5 12 4 4 10-10"/>',
    info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v1"/>'
  };
  const icon = name => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(icons[name] || icons.info)+'</svg>';
  const assetBase = 'learning-assets/';
  let slide = 0, exampleStep = 0, selected = 'work';
  const sourceNames = {law:'Text zákona na MPSV',esbirka:'Zákoník práce v e-Sbírce',app:'Moje práce v auditu',contract:'MPSV: pracovní smlouva',dpp:'MPSV: DPP',dpc:'MPSV: DPČ',trial:'MPSV: zkušební doba',trialEnd:'MPSV: zrušení ve zkušební době',breaks:'MPSV: přestávky',leave:'MPSV: dovolená',notice:'MPSV: výpověď',parents:'MPSV: úprava pracovní doby',severance:'MPSV: odstupné'};
  function sourceLink(key) {
    if(key==='app') return '<button type="button" class="learning-button" data-learning-go="work">Moje práce v auditu</button>';
    const url = data.sources[key]; if(!url || !/^https:\/\//.test(url)) return '';
    return '<a href="'+esc(url)+'" target="_blank" rel="noopener noreferrer">'+esc(sourceNames[key] || key)+'</a>';
  }
  const tabs = document.createElement('div');
  tabs.className='learning-tabs'; tabs.id='learning-tabs'; tabs.tabIndex=-1; tabs.setAttribute('role','tablist'); tabs.setAttribute('aria-label','Části Právního auditu AI');
  tabs.innerHTML=[['lesson','book','Výklad zákoníku práce','Prezentace a právní zdroje'],['example','search','Vzorový audit','Celý postup na příkladu Petry'],['work','pen','Moje práce','Deset vlastních auditů']].map(([key,ico,title,desc])=>'<button type="button" class="learning-tab" role="tab" id="learning-tab-'+key+'" aria-controls="learning-'+key+'" aria-selected="'+(key===selected)+'" tabindex="'+(key===selected?'0':'-1')+'" data-learning-go="'+key+'">'+icon(ico)+'<span>'+title+'<small>'+desc+'</small></span></button>').join('');
  work.before(tabs);
  const lesson=document.createElement('section'); lesson.id='learning-lesson'; lesson.className='learning-panel'; lesson.hidden=true;
  lesson.innerHTML='<div class="learning-heading"><div><div class="learning-kicker">VÝKLAD A PRÁCE SE ZDROJI</div><h2>Zákoník práce v souvislostech</h2><p>Projděte si výklad, otevřete právní předpis a vraťte se k tématu, které potřebujete. Prezentace zůstává dostupná během celého auditu.</p></div></div><div class="slide-player" id="slidePlayer"><div class="slide-tools"><label for="slideSelect">Téma<select id="slideSelect">'+data.slides.map((s,i)=>'<option value="'+i+'">'+(i+1)+'. '+esc(s.title.replace(/\n/g,' '))+'</option>').join('')+'</select></label><button type="button" class="learning-button" id="slideFullscreen">'+icon('expand')+'Promítat na celou obrazovku</button></div><div class="slide-progress" aria-hidden="true"><div id="slideProgress"></div></div><article class="slide-stage" id="slideStage" tabindex="-1" aria-label="Obsah snímku"></article><div class="slide-sourcebar" id="slideSources"></div><details class="slide-explanation" id="slideExplanation"><summary>Vysvětlení k tomuto snímku</summary><div id="slideNote"></div></details><div class="slide-pagination"><button type="button" class="learning-button" id="slidePrevious">Předchozí snímek</button><span class="slide-count" id="slideCount" aria-live="polite"></span><button type="button" class="learning-button primary" id="slideNext">Další snímek</button></div></div><p id="slideMessage" class="example-copy-status" role="status"></p><div class="learning-next"><div><strong>Teď si projděte jeden vyřešený audit.</strong><p>Na Petřině situaci uvidíte, jak se výklad používá v praxi.</p></div><button type="button" class="learning-button primary" data-learning-go="example">Otevřít vzorový audit</button></div><details class="learning-credits"><summary>Datum podkladů a fotografie</summary><p>Výuka '+esc(data.classDate)+'. Právní podklady ověřeny '+esc(data.checkedDate)+'. Při pozdějším použití zkontrolujte časové znění zákona.</p>'+data.credits.map(c=>'<a href="'+esc(c.url)+'" target="_blank" rel="noopener noreferrer">'+esc(c.label)+'</a>').join('')+'</details>';
  work.before(lesson);
  const example=document.createElement('section'); example.id='learning-example'; example.className='learning-panel'; example.hidden=true;
  example.innerHTML='<div class="learning-heading"><div><div class="learning-kicker">VYŘEŠENÝ VZOR KROK ZA KROKEM</div><h2>Petra a dvě dohody o provedení práce</h2><p>Podívejte se na celý postup, včetně ukázkově vyplněných polí. Vzor slouží ke čtení a vysvětlení. Vaše vlastní odpovědi zůstávají v záložce „Moje práce“.</p></div></div><div class="learning-notice simulation">'+icon('info')+'<strong>Výuková simulace se záměrnou chybou</strong><p>Ukázková odpověď AI níže byla vytvořena pro nácvik. Nejde o skutečný výstup konkrétního modelu. Ve vlastním auditu budete pracovat se svou skutečně získanou odpovědí.</p></div><nav class="example-steps" aria-label="Kroky vzorového auditu" id="exampleSteps"></nav><article class="example-card" id="exampleContent" tabindex="-1"></article><div class="example-nav"><button type="button" class="learning-button" id="examplePrevious">Předchozí krok</button><button type="button" class="learning-button primary" id="exampleNext">Další krok</button></div><div class="learning-next"><div><strong>Vyberte si další případ a zkuste vlastní audit.</strong><p>Vzor se nezapisuje do Vašich odpovědí ani do počtu vyplněných auditů.</p></div><button type="button" class="learning-button primary" data-learning-go="work">Přejít k vlastní práci</button></div>';
  work.before(example);
  const panels={lesson,example,work};
  for(const [key,panel] of Object.entries(panels)){panel.setAttribute('role','tabpanel');panel.setAttribute('aria-labelledby','learning-tab-'+key);}
  function selectPanel(key,focus=false) {
    if(!panels[key])return; selected=key;
    for(const [name,panel] of Object.entries(panels)){panel.hidden=name!==key;const button=document.getElementById('learning-tab-'+name);button.setAttribute('aria-selected',String(name===key));button.tabIndex=name===key?0:-1;}
    if(focus)document.getElementById('learning-tab-'+key).focus();
  }
  tabs.addEventListener('keydown',event=>{
    const order=['lesson','example','work'];let i=order.indexOf(selected);
    if(event.key==='ArrowRight')i=(i+1)%3;else if(event.key==='ArrowLeft')i=(i+2)%3;else if(event.key==='Home')i=0;else if(event.key==='End')i=2;else return;
    event.preventDefault();selectPanel(order[i],true);
  });
  document.addEventListener('click',event=>{const button=event.target.closest('[data-learning-go]');if(!button)return;selectPanel(button.dataset.learningGo,true);if(!button.closest('.learning-tabs'))tabs.scrollIntoView({block:'start',behavior:'auto'});});
  window.addEventListener('audit-session-ready',()=>selectPanel('work'));
  function paragraphs(value){return String(value || '').split('\n\n').map(p=>'<p>'+esc(p)+'</p>').join('');}
  function table(rows,headers){
    return '<table class="slide-table">'+(headers?'<thead><tr>'+headers.map(h=>'<th scope="col">'+esc(h)+'</th>').join('')+'</tr></thead>':'')+'<tbody>'+rows.map(row=>'<tr><th scope="row">'+esc(row[0])+'</th><td>'+esc(row[1])+'</td></tr>').join('')+'</tbody></table>';
  }
  function renderSlide() {
    const s=data.slides[slide];let body='';
    if(s.kind==='cover')body='<div class="slide-cover"><div><h3>'+esc(s.title)+'</h3><p class="slide-subtitle">'+esc(s.subtitle)+'</p><p>Výklad, ukázka a vlastní ověření.<br>Výuka '+esc(data.classDate)+'.</p></div><img src="'+esc(assetBase+'cover.jpg')+'" alt="Studentka pracuje s notebookem a studijními podklady" loading="lazy"></div>';
    else{
      body='<h3>'+esc(s.title)+'</h3>';
      if(s.items)body+='<ol class="slide-list">'+s.items.map((item,i)=>'<li><span class="slide-item-icon">'+(i+1)+'</span><div><strong>'+esc(item[0])+'</strong><p>'+esc(item[1])+'</p></div></li>').join('')+'</ol>';
      else if(s.kind==='comparison')body+='<div class="slide-compare"><div><h4>'+esc(s.leftTitle)+'</h4><strong>'+esc(s.leftBig)+'</strong><p>'+esc(s.leftText)+'</p></div><div><h4>'+esc(s.rightTitle)+'</h4><strong>'+esc(s.rightBig)+'</strong><p>'+esc(s.rightText)+'</p></div></div>';
      else if(s.rows)body+=table(s.rows,s.headers);
      else if(s.kind==='calculation')body+='<div class="slide-calculation-main">'+esc(s.main)+'</div><div class="slide-calculation-grid">'+s.equations.map(x=>'<div><small>'+esc(x[0])+'</small><strong>'+esc(x[1])+'</strong></div>').join('')+'</div>';
      else if(s.kind==='simulation')body+='<div class="slide-simulation"><div class="simulation-label">Záměrně chybná výuková simulace</div>'+paragraphs(s.body)+'</div>';
      else if(s.kind==='case')body+='<div class="slide-cover"><div>'+paragraphs(s.body)+'</div><img src="'+esc(assetBase+'cafe.jpg')+'" alt="Ilustrační fotografie práce v kavárně" loading="lazy"></div>';
      else if(s.kind==='verdict')body+='<span class="slide-verdict">'+esc(s.verdict)+'</span>'+paragraphs(s.body);
      else if(s.links)body+='<div class="learning-actions">'+s.links.map(x=>sourceLink(x[1])).join('')+'</div>';
      else body+=paragraphs(s.body);
    }
    if(s.bottom)body+='<div class="slide-bottom">'+esc(s.bottom)+'</div>';
    document.getElementById('slideStage').innerHTML=body;
    const sourcebar=document.getElementById('slideSources');
    sourcebar.innerHTML=(s.sourceLabel?'<strong>'+esc(s.sourceLabel)+'</strong>':'')+(s.sources || []).map(sourceLink).join('');
    sourcebar.hidden=!sourcebar.innerHTML;
    document.getElementById('slideNote').innerHTML=paragraphs(s.note)+(s.includePrompt?'<pre>'+esc(data.prompt)+'</pre>':'');
    document.getElementById('slideExplanation').open=false;
    document.getElementById('slideCount').textContent=(slide+1)+' / '+data.slides.length;
    document.getElementById('slideSelect').value=String(slide);
    document.getElementById('slidePrevious').disabled=slide===0;
    document.getElementById('slideNext').disabled=slide===data.slides.length-1;
    document.getElementById('slideProgress').style.width=((slide+1)/data.slides.length*100)+'%';
  }
  document.getElementById('slidePrevious').addEventListener('click',()=>{if(slide>0){slide--;renderSlide();}});
  document.getElementById('slideNext').addEventListener('click',()=>{if(slide<data.slides.length-1){slide++;renderSlide();}});
  document.getElementById('slideSelect').addEventListener('change',event=>{const next=Number(event.target.value);if(Number.isInteger(next)&&next>=0&&next<data.slides.length){slide=next;renderSlide();}});
  document.getElementById('slideFullscreen').addEventListener('click',async()=>{const player=document.getElementById('slidePlayer');try{if(document.fullscreenElement)await document.exitFullscreen();else if(player.requestFullscreen)await player.requestFullscreen();else document.getElementById('slideMessage').textContent='Tento prohlížeč nepodporuje celou obrazovku. Prezentaci můžete dál ovládat zde.';}catch{document.getElementById('slideMessage').textContent='Celou obrazovku se nepodařilo zapnout. Prezentace je dostupná zde.';}});
  document.addEventListener('fullscreenchange',()=>{document.getElementById('slideFullscreen').innerHTML=icon('expand')+(document.fullscreenElement?'Ukončit celou obrazovku':'Promítat na celou obrazovku');});
  document.getElementById('slidePlayer').addEventListener('keydown',event=>{if(event.target.closest('input,select,textarea'))return;if(event.key==='ArrowRight'&&slide<data.slides.length-1){event.preventDefault();slide++;renderSlide();}if(event.key==='ArrowLeft'&&slide>0){event.preventDefault();slide--;renderSlide();}});
  const field=(label,value)=>'<dl class="example-field"><dt>'+esc(label)+'</dt><dd>'+esc(value)+'</dd></dl>';
  const why=text=>'<div class="example-why"><strong>Proč tento krok děláte</strong>'+esc(text)+'</div>';
  const titles=['Právní problém','Dotaz do AI','Odpověď AI','Vyhledání § 75','Použití odstavců','Výpočet','Hodnocení AI','Rada klientce'];
  const rationale='Cvičná odpověď tvrdí, že druhá DPP zakládá nový limit 300 hodin. Podle § 75 odst. 2 se ale další DPP u stejného zaměstnavatele ve stejném roce započítává do společného rozsahu. Odstavec 1 stanoví maximum 300 hodin za rok. Nabízených 110 hodin by vedlo k součtu 350 hodin. Odpověď proto opravuji: Petře zbývá nejvýše 60 hodin.';
  const advice='Petře doporučuji ověřit evidenci odpracovaných hodin a před podpisem upozornit zaměstnavatele, že nová DPP roční limit neobnovuje. Pokud už odpracovala 240 hodin a žádné další hodiny na DPP u něj nepřibyly, může do konce roku 2026 odpracovat na DPP nejvýše dalších 60 hodin. Dohodu na 110 hodin je potřeba upravit. Pro delší spolupráci je nutné zvolit vhodný pracovněprávní vztah a ověřit jeho podmínky.';
  const evidence='Hodiny z obou DPP u stejného zaměstnavatele se za rok 2026 sčítají. Druhá DPP neotevírá nový limit. Do ročního maxima se musí vejít již odpracovaných 240 hodin i další práce.';
  const quote='§ 75 odst. 2: „… se započítává také doba práce … na základě jiné dohody o provedení práce.“';
  function exampleBody(){
    switch(exampleStep){
      case 0:return '<h3>Nejdřív si ujasněte, co řešíte</h3><p>Petra pracuje v jedné kavárně na DPP. Od ledna do června 2026 odpracovala 240 hodin. Zaměstnavatel jí nabízí dalších 110 hodin do konce roku a tvrdí, že nová dohoda znamená nový limit 300 hodin.</p><div class="example-facts"><div><small>Již odpracováno</small><strong>240 hodin</strong></div><div><small>Další nabídka</small><strong>110 hodin</strong></div><div><small>Stejný rok</small><strong>2026</strong></div></div><div class="learning-notice"><strong>Otázka:</strong> Může Petra u stejného zaměstnavatele odpracovat všech dalších 110 hodin na druhou DPP? Kolik hodin jí zbývá?</div>'+why('Pro právní posouzení jsou rozhodující stejný zaměstnavatel, stejný kalendářní rok a skutečně odpracované hodiny. Samotný počet podepsaných dohod odpověď neurčuje.');
      case 1:return '<h3>Pošlete celé zadání do své AI</h3><p>Ve vlastní práci kliknete na „Kopírovat zadání pro AI“, otevřete svůj AI nástroj v jiné kartě, vložíte text a odešlete zprávu. Tlačítko v auditu samo žádnou zprávu do AI neposílá.</p><button type="button" id="exampleCopy" class="learning-button primary">'+icon('copy')+'Kopírovat ukázkové zadání</button><p id="exampleCopyStatus" class="example-copy-status" role="status"></p><details><summary>Přečíst celé ukázkové zadání</summary><pre class="example-prompt" id="examplePrompt">'+esc(data.prompt)+'</pre></details>'+why('Přesné zadání zachovává fakta a žádá o právní oporu. Ani dobré zadání ale nezaručuje správnou odpověď; proto následuje ověření v předpisu.');
      case 2:return '<h3>Uchovejte původní odpověď</h3>'+field('AI nástroj a model','Výuková simulace. Ve vlastním auditu uveďte použitý nástroj a model, pokud jej rozhraní zobrazuje.')+field('Datum Vašeho ověření','23. 11. 2026 – den přípravy tohoto vzoru. Ve vlastní práci uveďte svůj skutečný den ověření.')+field('Text výukové simulace','MODELOVÝ TEXT PRO VÝUKU, ZÁMĚRNĚ CHYBNÝ:\n\n'+data.simulation)+why('Původní odpověď neopravujte. Jinak by nebylo zřejmé, co jste kontrolovali. Vlastní opravu zapíšete do hodnocení a doporučení. Správnou odpověď AI také ověříte a můžete ji potvrdit.');
      case 3:
        return '<h3>Vyhledejte § 75 zákoníku práce</h3>'
          + '<p>V e-Sbírce otevřete zákon č. 262/2006 Sb. Vyberte znění účinné pro posuzovanou situaci a v zákoně vyhledejte „Dohoda o provedení práce“. Otevřete § 75.</p>'
          + '<div class="learning-actions">'+sourceLink('esbirka')+sourceLink('law')+'</div>'
          + field('Předpis a ustanovení', 'Zákon č. 262/2006 Sb., zákoník práce, § 75 odst. 1 a 2.')
          + field('Použité znění účinné od', '1. 11. 2026. Toto datum označuje začátek použitého znění celého zákona v e-Sbírce.')
          + field('Odkaz na znění použité ve vzoru', data.sources.esbirka)
          + why('Datum situace určuje, které znění zákona potřebujete. Do pole s datem ověření zapište den, kdy jste sami otevřeli předpis.');
      case 4:
        return '<h3>Přečtěte oba odstavce a přiřaďte je k faktům</h3>'
          + field('§ 75 odst. 1 · Jaký je limit?', 'Za kalendářní rok může rozsah práce na DPP činit nejvýše 300 hodin.')
          + field('§ 75 odst. 2 · Které hodiny se sčítají?', 'Do společného rozsahu vstupuje také práce na jiné DPP u stejného zaměstnavatele v témže roce. Doby podle § 348 odst. 1 se nezapočítávají. V zadání jde výslovně o odpracované hodiny.')
          + field('Krátká citace z ustanovení', quote)
          + field('Použití na Petřin případ', evidence)
          + why('První odstavec dává hranici pro výpočet. Teprve druhý říká, jak naložit s tím, že Petra pracuje podle dvou dohod.')
          + '<div class="learning-actions">'+sourceLink('esbirka')+sourceLink('dpp')+'</div>';
      case 5:
        return '<h3>Spočítejte, kolik práce ještě zbývá</h3>'
          + '<div class="slide-calculation-main">300 − 240 = 60 hodin</div><div class="slide-calculation-grid"><div><small>Nabízený součet</small><strong>240 + 110 = 350 hodin</strong></div><div><small>Překročení limitu</small><strong>350 − 300 = 50 hodin</strong></div></div>'
          + why('Petře zbývá 60 hodin. Pokud by odpracovala celou nabídku, překročila by roční limit o 50 hodin.');
      case 6:
        return '<h3>Porovnejte tvrzení AI se zákonem</h3>'
          + field('Hodnocení simulované odpovědi', 'Nesprávná')
          + field('Vlastní odůvodnění', rationale)
          + why('U vlastní odpovědi AI rozhodněte podle toho, co model opravdu napsal. Pokud hodiny sečetl správně, svůj souhlas doložte oběma odstavci.');
      case 7:
        return '<h3>Doporučte Petře další krok</h3>'
          + field('Doporučení klientce', advice)
          + '<div class="learning-notice"><strong>Co ještě ověřit?</strong> Přibyly od června další odpracované hodiny na DPP u téže kavárny? Pokud ano, odečtěte je také.</div>'
          + '<details><summary>Kontrola vlastního zápisu</summary><p>Uchovejte původní odpověď AI, doložte rozhodné ustanovení a vysvětlete výpočet i radu klientce. Prohlášení o přečtení zaškrtněte po vlastní kontrole předpisu. Zelená značka vyjadřuje úplnost záznamu. Správnost závěru posuzuje vyučující.</p></details>';

    }
  }
  function renderExample(){
    document.getElementById('exampleSteps').innerHTML=titles.map((t,i)=>'<button type="button" class="example-step-button" data-example-step="'+i+'" aria-current="'+(i===exampleStep?'step':'false')+'">'+(i+1)+'. '+t+'</button>').join('');
    document.getElementById('exampleContent').innerHTML=exampleBody();
    document.getElementById('examplePrevious').disabled=exampleStep===0;
    document.getElementById('exampleNext').disabled=exampleStep===titles.length-1;
    const copy=document.getElementById('exampleCopy');
    if(copy)copy.addEventListener('click',async()=>{const status=document.getElementById('exampleCopyStatus');try{if(!navigator.clipboard?.writeText)throw new Error();await navigator.clipboard.writeText(data.prompt);status.textContent='Zadání je zkopírované. Ve své AI je vložte a odešlete.';}catch{status.textContent='Automatické kopírování není dostupné. Otevřete celé zadání níže, označte je a zkopírujte ručně.';const prompt=document.getElementById('examplePrompt');if(prompt)prompt.parentElement.open=true;}});
  }
  document.getElementById('exampleSteps').addEventListener('click',event=>{const button=event.target.closest('[data-example-step]');if(button){exampleStep=Number(button.dataset.exampleStep);renderExample();document.getElementById('exampleContent').focus();}});
  document.getElementById('examplePrevious').addEventListener('click',()=>{if(exampleStep>0){exampleStep--;renderExample();document.getElementById('exampleContent').focus({preventScroll:true});document.getElementById('exampleContent').scrollIntoView({block:'start',behavior:'auto'});}});
  document.getElementById('exampleNext').addEventListener('click',()=>{if(exampleStep<titles.length-1){exampleStep++;renderExample();document.getElementById('exampleContent').focus({preventScroll:true});document.getElementById('exampleContent').scrollIntoView({block:'start',behavior:'auto'});}});
  window.AuditLearning={selectPanel,getPanel:()=>selected};
  renderSlide();renderExample();selectPanel('work');
})();
