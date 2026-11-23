# Právní audit AI na GitHub Pages

## Stav k 23. listopadu 2026

Celá integrace je v [návrhu změn č. 1](https://github.com/anetava/karierovy-poradce-29/pull/1). Majitelka 23. listopadu opravila přístup k repozitáři a zápis na GitHub byl ověřen. Pro živé ověření vyučující byly v [samostatném vydání č. 2](https://github.com/anetava/karierovy-poradce-29/pull/2) přidány výhradně soubory vstupu pro ověření dvou modelových prací. Původních 20 karet a původní lokální studentský audit při tomto dílčím vydání zůstávají na své adrese. Návrh č. 1 po dokončení kontrol nahradí dvouzáznamový režim úplným přehledem a připojí studentskou část.

| Co bylo ověřeno | Výsledek |
| --- | --- |
| Produkční Firebase `pravni-audit-ai` | Vznikly dvě modelové studentské práce. Firestore potvrdil první revizi a serverový čas obou odpovědí. Opakované čtení pod příslušnou identitou vrátilo v obou případech původní text. |
| Oddělení dat v produkci | Samostatná anonymní identita bez pracovního listu i nepřihlášený návštěvník obdrželi při čtení odpovědi Alfa HTTP 403. Celkem test vytvořil tři anonymní identity, dva profily, dvě odpovědi a dvě revize historie. |
| Vývojové testy | Testy klientské logiky pokrývají čekající odpovědi, obnovení fronty a konflikty. Emulátory ověřují pravidla včetně cizího zápisu a učitelský odběr změn dvou modelových studentů. |
| Co zbývá ověřit v produkci | Dokončení přihlášení oprávněné vyučující přes Google a zobrazení obou uložených odpovědí. V prohlížeči také obnovení stránky a celý cyklus odpojení a opětovného odeslání z kandidátního rozhraní. Dále aktuální obsah nasazených Rules, parametry databáze a stav všech tří výjimek indexace. |

### Funkční průchod v kandidátní aplikaci

Ve skutečném jádře Chromium a s lokálními emulátory Auth a Firestore prošlo zadání jména, automatické uložení, obnovení identity po načtení nové stránky a práce při odpojení. Po přerušení spojení se statickým serverem i Firebase se otevřela nová stránka s místní odpovědí. Po obnovení spojení server potvrdil změnu a další načtení vrátilo její text. Druhý současně otevřený dokument nezískal přístup k psaní do stejného listu.

V šířkách 1440, 820 a 390 px prošlo všech 28 snímků, osm kroků vzoru, deset auditních zadání a všech 140 kroků původních dvaceti kazuistik. Při kontrole se načetly fotografie a ovládací prvky nepřekrývaly obsah. Fyzický iPad se Safari ani přihlášení skutečné vyučující přes Google nejsou součástí této zkoušky.

Přiložený původní soubor `index(1).html` byl po bajtech totožný s veřejným kořenovým HTML. Přiložený `nastaveni-pravni-audit(1).zip` obsahoval původní pravidla, definici tří výjimek indexování a postup Cloud Shell. Tyto soubory dokládají zdrojovou verzi nastavení. Pro přímé srovnání s aktivními pravidly použijte následující kontrolu.

### Kontrola Firebase

Veřejná konfigurace projektu obsahuje číslo `205779594399` a ID aplikace `1:205779594399:web:d3f720e5f920d438f786aa`. Google v seznamu povolených domén vrátil `anetava.github.io` i `localhost`. Do autorizovaného Google Cloud Shell lze přenést a spustit [kontrolní skript](scripts/verify-live-firebase.py).

```sh
python3 scripts/verify-live-firebase.py
```

Skript pouze čte konfiguraci projektu. Porovná aktivní pravidla s otiskem testované verze, ověří výchozí databázi Firestore Standard / Native ve Frankfurtu (`europe-west3`), obě metody přihlášení a výjimky indexace pro `cases.record`, `history.record` a `students.caseSummaries`. Dřívější údaj „2/3“ neidentifikuje chybějící položku. Každou výjimku skript vykáže jednotlivě. Přístupová oprávnění určují Firestore Rules.

### Aktualizace pravidel pro výběr případu

Studentův klik na kartu může aktualizovat pole `selectedCaseId`. Čas posledního uložení odpovědi se dál odvíjí od potvrzeného zápisu jejího obsahu. Starší profily se otevřou i bez tohoto pole. Při původních pravidlech student může ukládat odpovědi a přehled ukazuje poslední uložený případ.

Pokud kontrola našla přesně předchozí známá pravidla, správce může v přihlášeném Cloud Shell, v kořeni kandidátní verze, spustit `python3 scripts/upgrade-selection-rules.py`. Skript ověří projekt a obsah zdrojových pravidel před změnou a po ní. Při neznámé původní sadě se zastaví. Během tohoto úkonu vyčkejte s další publikací pravidel z konzole nebo jiného procesu. Při případném návratu ke starší verzi frontendu ponechte novější pravidla pro již existující profily s polem `selectedCaseId`. Po změně spusťte čtecí kontrolu znovu. Výjimky indexování se vyhodnocují samostatně.

### Neveřejná zkouška učitelského přístupu

Pro živý test otevře vyučující [přehled modelových prací](https://anetava.github.io/karierovy-poradce-29/pravni-audit-ai/ucitel/) v běžném prohlížeči a přihlásí se vlastním povoleným účtem Google. Při tomto dílčím vydání databázový dotaz vybere pouze profily Alfa a Beta uvedené níže. Ověření na této adrese doloží průchod přihlášením na původní doméně. Ostatní profily zpřístupní oprávněné vyučující až úplné vydání.

Alternativně lze na počítači vyučující v kořeni kandidátní verze spustit soukromý náhled přes Python 3. Server naslouchá pouze na tomto počítači.

```sh
python -m http.server 8765 --bind 127.0.0.1
```

Na stejném počítači otevřete `http://localhost:8765/pravni-audit-ai/ucitel/` a přihlaste se tlačítkem Google s oprávněným účtem vyučující. Otevřete oba modelové listy a porovnejte první revizi v každém z nich.

| Jméno v přehledu | Případ | Text uložený v poli pro odpověď AI |
| --- | --- | --- |
| Modelový test Alfa 23.11.2026 | 01 · Dvě dohody o provedení práce | Modelový test Alfa 23.11.2026 — online. |
| Modelový test Beta 23.11.2026 | 02 · Dohoda o pracovní činnosti | Modelový test Beta 23.11.2026 — test druhého pracovního listu v případu DPČ. |

Server potvrdil zápis Beta 23. listopadu ve 22:01:49,156 SEČ. U práce Alfa byl ověřen serverový čas, přesný údaj má vyučující v historii. Po kontrole se odhlaste a server ukončete pomocí Ctrl+C.

### Provoz při výuce

Před přechodem lze v současném veřejném auditu zvolit „Stáhnout zálohu JSON“. Student pak svou zálohu načte po otevření vlastního nového pracovního listu. Starší místní záznam nemá ověřeného vlastníka. Automatické přiřazování podle zařízení by na školním počítači mohlo převést cizí práci. Původní místní úložiště zůstává zachováno.

- Student zadá jméno a příjmení. Přístup k pracovnímu listu určuje anonymní účet Firebase. Rozpracované odpovědi se uchovávají místně a po krátké odmlce se odesílají. Hlášení „Uloženo pro vyučující“ vyžaduje potvrzení serveru.
- Na sdíleném počítači slouží k odhlášení „Ukončit práci na tomto zařízení“. Student si může stáhnout vlastní zálohu. Při ztrátě anonymní identity lze její obsah načíst do nového vlastního pracovního listu. Opětovné zadání jména nezpřístupní dřívější účet.
- Vyučující vidí změny uložených odpovědí a historii. Čas zápisu sám o sobě nedokládá přítomnost u počítače ani četbu zákona.
- Před prací se skutečnými údaji má ČZU jako správce potvrdit účel a právní základ, přístupy, dobu uchování a postup výmazu záznamů včetně historie a anonymní identity. Pro dohodnutou lhůtu je třeba zajistit výmaz. Student před zadáním jména otevře [informace o zpracování údajů](./pravni-audit-ai/#auditPrivacyBrief).

### Opakování vývojových kontrol

V kořeni repozitáře s Node.js a Javou 21 spusťte postupně následující příkazy. Testy pravidel používají lokální projekt `demo-pravni-audit`.

```sh
npm ci
npm run build
npm run test:student
npm run test:teacher
npm run test:rules
npm run check:release -- --ready
```

## Podmínky použití skutečných údajů ve výuce

Pracovní větev je připravena pro testy s modelovými jmény a odpověďmi. ČZU jako zamýšlený správce rozhodne o použití ve výuce po projednání s pověřencem. Schválené údaje patří do informace u formuláře v souboru `pravni-audit-ai/index.html`.

| Rozhodnutí ČZU | Co doplnit nebo provést |
| --- | --- |
| Účel, právní základ a podmínky účasti | Určit odpovědný útvar, kontakt správce a příslušný právní základ podle čl. 6 GDPR včetně právního předpisu, pokud se o něj zpracování opírá. Vymezit zpětnou vazbu a případné využití při hodnocení. Upřesnit, zda student musí použít jmenný list, jaké má důsledky neposkytnutí jména a jak se případná náhradní cesta používá. Vstup do aplikace představuje otevření pracovního listu. |
| Retence, výmaz, žádosti studentů | Stanovit lhůtu nebo určitelné kritérium pro studentský profil, rozepsané odpovědi, jednotlivé revize, anonymní účet i případné provozní zálohy. Určit odpovědnou osobu, četnost výmazu a bezpečný způsob ověření žadatele. Ověřit výmaz podkolekcí případů a historie i řešení výmazu účtu Firebase Auth. Samotné odstranění profilu ve Firestore podkolekce ponechá. Odhlášení ze školního PC uzavírá místní přístup. |
| Přístup a služby | Posoudit oprávnění k Firebase projektu, účty s administrátorskými rolemi a schválení současného osobního účtu Google vyučující. Pokud má vyučující přejít na univerzitní identitu, současně změnit pravidla i klienta a znovu ověřit přístup. Potvrdit smluvní nastavení pro Google/Firebase a GitHub, dotčené kategorie údajů a přístupy poskytovatelů. |
| Předávání mimo EHP | Ověřit lokaci konkrétní databáze Firestore. Posoudit samostatně Firebase Authentication, kterou Google provozuje v USA, a technické zpracování při hostování na GitHub Pages. Doložit použitelný titul předání podle kapitoly V GDPR a podle skutečného řešení uvést rozhodnutí o odpovídající ochraně nebo odpovídající záruky, včetně toho, jak lze získat jejich kopii. |

Po schválení nahradit dočasné formulace o testu konkrétními potvrzenými údaji a verzovat informační text. Je-li třeba změnit hodnotu `noticeVersion`, současně upravit pravidla a klienta tak, aby se dříve vytvořené profily dále bezpečně otevíraly a přijímaly změny. Uložená verze informačního textu není dokladem uděleného souhlasu.

[Čl. 13 GDPR](https://eur-lex.europa.eu/eli/reg/2016/679/oj) · [ČZU a ochrana osobních údajů](https://gdpr.czu.cz/cs) · [Firebase a lokality zpracování](https://firebase.google.com/support/privacy) · [GitHub Pages a IP adresy](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages) · [Výmaz dokumentů a podkolekcí ve Firestore](https://firebase.google.com/docs/firestore/manage-data/delete-data#delete_documents)
