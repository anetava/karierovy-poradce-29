# Odevzdávárna Právního auditu AI

Samostatná studentská stránka `/odevzdavarna/` a chráněný přehled `/odevzdavarna/ucitel/`.
Původní audit, kariérové karty, databázová pravidla a starý učitelský přehled se nemění.

## Chování

- Výběr JSON pouze načítá místní náhled. Přenos začne výhradně tlačítkem Odevzdat práci vyučující.
- Přijímá export `app: pravni-audit-ai`, `version: 2`, nejvýše 4 MB a deset případů. Prázdné případy se vynechají; rozpracované lze odevzdat.
- Každé odevzdání má novou anonymní identitu v paměti stránky. Nepoužívá studentskou přihlašovací relaci původního auditu.
- Využívá stávající serverem validované transakce: případ, neměnná historie a souhrn profilu. Profil má jméno `Odevzdání [počet] · příjmení`.
- Přerušený přenos lze ve stejné otevřené stránce zopakovat. Opakování používá stejné identifikátory změn. Již potvrzené případy se nepřepisují. Po zavření stránky je další odevzdání nový záznam.
- Serverové potvrzení se ukáže až po přijetí všech přiložených případů. Přehled vyučující zobrazuje poměr přijatých/očekávaných případů a odlišuje neúplný přenos.
- Oprávněná vyučující se přihlašuje existujícím Google účtem podle stávajících Firestore rules. Studentské příjmení není ověřením totožnosti.
- Žádná automatická synchronizace psaní z původního auditu, žádný veřejný seznam odpovědí. Odpovědi se vykreslují přes textContent.

## Sestavení a testy

Z kořene repozitáře:

```
node odevzdavarna/build.mjs
node --test odevzdavarna/tests/core.test.mjs
node_modules/.bin/firebase emulators:exec --only firestore,auth --project demo-pravni-audit 'node --test odevzdavarna/tests/integration.test.mjs'
```

Testy: chybný JSON, velikost a struktura, prázdná práce, neznámá pole, souběžné kliknutí, opakování po ztrátě potvrzení, oddělení identit, přístup vyučující a odhlášení, 50 paralelních odevzdání × 10 případů v emulátoru. Browser QA: místní náhled, chybný soubor, detail vyučující s testovacími daty, odhlášení a šířky 320/390/768 px. Fyzický iPhone nebyl součástí testu.

`src/store.js` je izolovaná odvozená kopie existujícího adaptéru: shodné cesty a validace, studentská aplikace má jiné jméno a pouze paměťovou autentizaci. Nová pravidla ani jejich nasazení nejsou potřebná.
