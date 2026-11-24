window.AuditLearningContent = {
  "title": "Zákoník práce a ověřování odpovědí AI",
  "classDate": "24. 11. 2026",
  "checkedDate": "23. 11. 2026",
  "versionDate": "1. 11. 2026",
  "sources": {
    "law": "https://ppropo.mpsv.cz/zakon_262_2006",
    "esbirka": "https://e-sbirka.gov.cz/sb/2006/262?odkazId=213229133",
    "app": "https://anetava.github.io/karierovy-poradce-29/pravni-audit-ai/",
    "contract": "https://ppropo.mpsv.cz/IV12Pracovnismlouvaajejiobsah",
    "dpp": "https://ppropo.mpsv.cz/VII2Dohodaoprovedeniprace",
    "dpc": "https://ppropo.mpsv.cz/VII1Dohodaopracovnicinnosti",
    "trial": "https://ppropo.mpsv.cz/IV14Sjednanizkusebnidoby",
    "trialEnd": "https://ppropo.mpsv.cz/VI4Zrusenipracovnihopomeruvezkus",
    "breaks": "https://ppropo.mpsv.cz/VIII4Prestavkavpraciabezpecnostn",
    "leave": "https://ppropo.mpsv.cz/X1Dovolenazakalendarnirokajejipo",
    "notice": "https://ppropo.mpsv.cz/VI21Obecnepodminkyplatnostivypov",
    "parents": "https://ppropo.mpsv.cz/XI423Upravapracovnidoby",
    "severance": "https://ppropo.mpsv.cz/VI223Odstupne"
  },
  "prompt": "Proveď studijní právní rozbor podle českého zákoníku práce. Výuka pracuje s právním stavem k 24. 11. 2026; uvádí-li situace pozdější datum, ověř také znění účinné pro tento den. Rozliš účinná pravidla a budoucí změny. Uveď konkrétní paragraf a odstavec, použití na fakta klienta, praktické doporučení a chybějící informace. Pokud nemůžeš ověřit aktuální znění nebo si nejsi jistý, výslovně to uveď. Nevymýšlej citace ani zdroje.\n\nSituace: Petra pracuje v jedné kavárně na DPP. Od ledna do června odpracovala 240 hodin. Zaměstnavatel jí nabízí další DPP na 110 hodin do konce roku 2026. Tvrdí, že na novou dohodu má nový limit 300 hodin.\n\nÚkol: Rozhodněte, zda může Petra na druhou DPP odpracovat dalších 110 hodin u stejného zaměstnavatele. Vypočítejte zbývající rozsah.",
  "simulation": "Ano. Nová DPP zakládá nový limit 300 hodin. Petra proto může na druhou dohodu odpracovat všech 110 hodin, i když jde o stejného zaměstnavatele.",
  "slides": [
    {
      "n": 1,
      "kind": "cover",
      "title": "Zákoník práce\na ověřování\nodpovědí AI",
      "subtitle": "Legislativa kariérového poradce",
      "note": "Výklad je výběrem pravidel potřebných pro deset auditních úloh. Nejprve se zorientujte v zákoně, potom si projděte vyřešený vzor Petry a vyberte jiný případ pro vlastní práci. Vaše vlastní zápisy se po vstupu pod jménem průběžně ukládají pro vyučující. Podklady byly ověřeny 23. 11. 2026 pro výuku 24. 11. 2026; při pozdějším použití ověřte časové znění znovu.",
      "sources": [
        "esbirka"
      ]
    },
    {
      "n": 2,
      "kind": "numbered",
      "title": "Výsledkem je doložená rada klientovi",
      "items": [
        [
          "Původní odpověď AI",
          "Uchováte přesně to, co kontrolujete."
        ],
        [
          "Právní důkaz",
          "Najdete ustanovení, přečtete jeho podmínky a ověříte použité znění."
        ],
        [
          "Vlastní závěr",
          "Vysvětlíte, co z pravidla plyne pro klienta a jak má postupovat."
        ]
      ],
      "bottom": "Vlastní zápisy se po vstupu pod jménem automaticky ukládají pro vyučující.",
      "note": "Cílem je doložený postup. Také správná odpověď AI je vhodným podkladem pro audit: musíte ověřit, proč je správná. Hodnotíte jednu konkrétní odpověď na konkrétní situaci."
    },
    {
      "n": 3,
      "kind": "rows",
      "title": "Zákoník práce v kariérovém poradenství",
      "items": [
        [
          "Nástup do práce",
          "Co klient podepisuje a od kdy pracovní vztah vzniká."
        ],
        [
          "Průběh zaměstnání",
          "Rozsah práce, přestávky, dovolená a odměňování."
        ],
        [
          "Změna podmínek",
          "Změna úvazku nebo žádost rodiče o úpravu pracovní doby."
        ],
        [
          "Odchod ze zaměstnání",
          "Způsob skončení, jeho datum a případné odstupné."
        ]
      ],
      "bottom": "Nejdřív zjistěte typ vztahu, data a to, kdo chce jednat.",
      "sourceLabel": "Zákon č. 262/2006 Sb., zejména § 1 až 3",
      "sources": [
        "law"
      ],
      "note": "Závislou práci charakterizuje vztah nadřízenosti a podřízenosti, osobní výkon jménem zaměstnavatele a podle jeho pokynů. Zákoník práce rozlišuje pracovní poměr a vztahy založené dohodami. Pro každý klientův dotaz potřebujeme nejdříve skutečnosti a teprve pak právní pravidlo. Další předpisy mohou být důležité, ale tento blok se soustředí na zákoník práce."
    },
    {
      "n": 4,
      "kind": "table",
      "title": "Pracovní poměr, DPP a DPČ",
      "headers": [
        "Vztah",
        "Co si u klienta ověřit"
      ],
      "rows": [
        [
          "Pracovní poměr",
          "Pracovní smlouvu, sjednanou dobu a pracovní podmínky."
        ],
        [
          "DPP",
          "Všechny DPP u stejného zaměstnavatele v témže kalendářním roce."
        ],
        [
          "DPČ",
          "Stanovenou týdenní pracovní dobu, dobu trvání dohody a průměrný rozsah vykonané práce."
        ]
      ],
      "bottom": "Podobný název smlouvy neznamená stejné limity ani stejný způsob skončení.",
      "sourceLabel": "§ 33 a 34, § 75 až 77",
      "sources": [
        "contract",
        "dpp",
        "dpc"
      ],
      "note": "DPP znamená dohodu o provedení práce. DPČ znamená dohodu o pracovní činnosti. Obě dohody jsou pracovněprávní vztahy mimo pracovní poměr. Do tohoto přehledu nevnášejte limity pojistného a daní, protože to jsou jiné otázky než přípustný rozsah práce."
    },
    {
      "n": 5,
      "kind": "numbered",
      "title": "Obsah pracovní smlouvy",
      "items": [
        [
          "Druh práce",
          "Jakou práci bude zaměstnanec vykonávat."
        ],
        [
          "Místo výkonu práce",
          "Kde ji má vykonávat."
        ],
        [
          "Den nástupu do práce",
          "Od kterého dne vzniká pracovní poměr."
        ]
      ],
      "bottom": "Smlouva musí být písemná. Mzdu lze sjednat nebo určit i jiným zákonným způsobem.",
      "sourceLabel": "§ 34 odst. 1 a 2, § 37 a § 113",
      "sources": [
        "contract",
        "law"
      ],
      "note": "Studenti často zaměňují podstatné náležitosti pracovní smlouvy s ostatními důležitými informacemi. Mzda je důležitá, ale nemusí být právě v textu pracovní smlouvy. Může být sjednána ve smlouvě, stanovena vnitřním předpisem nebo určena mzdovým výměrem za podmínek § 113. To neznamená, že může zůstat bez určení. Zaměstnavatel má také informační povinnosti podle § 37."
    },
    {
      "n": 6,
      "kind": "comparison",
      "title": "Rozsah práce na DPP a DPČ",
      "leftTitle": "DPP",
      "leftBig": "300 hodin",
      "leftText": "Za kalendářní rok.\nU stejného zaměstnavatele se sčítají jeho DPP s týmž zaměstnancem.",
      "rightTitle": "DPČ",
      "rightBig": "½ týdenní doby",
      "rightText": "V průměru za sjednané období, nejvýše za 52 týdnů.\nPři stanovené době 40 hodin jde o průměr nejvýše 20 hodin týdně.",
      "bottom": "Vždy rozlišujte roční součet a průměr za posuzované období.",
      "sourceLabel": "§ 75 odst. 1 a 2, § 76 odst. 2 a 3",
      "sources": [
        "dpp",
        "dpc"
      ],
      "note": "Pravidla se týkají běžných dohod z našich případů. Zvláštní právní úprava může v některých profesích stanovit výjimku. U DPP se do limitu nezapočítávají náhradní doby podle § 348 odst. 1. U DPČ nelze bez znalosti stanovené týdenní doby automaticky tvrdit, že limit je vždy 20 hodin. Při výpočtu vždy určete i posuzované období."
    },
    {
      "n": 7,
      "kind": "comparison",
      "title": "Zkušební doba a její skončení",
      "leftTitle": "Sjednání podle § 35",
      "leftBig": "4 / 8 měsíců",
      "leftText": "Nejvýše 4 měsíce, u vedoucích 8.\nPísemně nejpozději v den vzniku poměru.\nU doby určité nejvýše polovina jejího trvání.",
      "rightTitle": "Zrušení podle § 66",
      "rightBig": "Písemně",
      "rightText": "Pracovní poměr končí doručením, pokud není uveden pozdější den.\nZaměstnavatel jej nesmí zrušit v prvních 14 kalendářních dnech pracovní neschopnosti nebo karantény.",
      "bottom": "Nejdřív ověřte, že zkušební doba byla platně sjednána a stále běží.",
      "sourceLabel": "§ 35 a § 66",
      "sources": [
        "trial",
        "trialEnd"
      ],
      "note": "Aktuální limity pro nově sjednávané zkušební doby jsou od 1. 6. 2025 čtyři a osm měsíců. Zkušební doba nevzniká automaticky. Za jejího trvání ji lze písemnou dohodou prodloužit v zákonných mezích. Zákon stanoví i prodloužení o pracovní dny, kdy zaměstnanec neodpracoval celou směnu z vyjmenovaných důvodů. Zrušení může být bez uvedení důvodu, ale zákaz diskriminace tím nezaniká. U zákazu zrušení zaměstnavatelem jde o prvních 14 kalendářních dnů."
    },
    {
      "n": 8,
      "kind": "numbered",
      "title": "Přestávka během směny",
      "items": [
        [
          "Nejpozději po 6 hodinách nepřetržité práce",
          "Přestávka na jídlo a oddech trvá alespoň 30 minut."
        ],
        [
          "U mladistvých nejpozději po 4,5 hodinách",
          "Mladistvý musí dostat skutečnou přestávku i při práci, jejíž provoz nelze přerušit."
        ],
        [
          "Běžná přestávka je mimo pracovní dobu",
          "Dospělému při nepřerušitelné práci náleží přiměřená doba na jídlo a oddech. Ta se do pracovní doby započítává."
        ]
      ],
      "bottom": "Přestávka nepatří na začátek ani na konec směny.",
      "sourceLabel": "§ 88 odst. 1 až 4",
      "sources": [
        "breaks"
      ],
      "note": "Rozlišujte běžnou přestávku na jídlo a oddech, přiměřenou dobu na jídlo a oddech u práce, kterou nelze přerušit, a bezpečnostní přestávku. Jejich právní režimy se liší. Pokud se přestávka rozdělí, alespoň jedna část musí trvat nejméně 15 minut. Velké množství zákazníků samo o sobě ještě nevysvětluje, proč by šlo o nepřerušitelnou práci."
    },
    {
      "n": 9,
      "kind": "comparison",
      "title": "Dovolená se může týkat i DPP a DPČ",
      "leftTitle": "Délka vztahu",
      "leftBig": "4 týdny",
      "leftText": "Pracovněprávní vztah musí v daném roce trvat nepřetržitě alespoň čtyři týdny.",
      "rightTitle": "Započitatelná doba",
      "rightBig": "Alespoň 80 hodin",
      "rightText": "Pro účely dovolené se používá týdenní doba 20 hodin.\nJejí čtyřnásobek je 80 hodin.",
      "bottom": "Obě podmínky platí současně. Číslo 80 neudává počet hodin dovolené.",
      "sourceLabel": "§ 77 odst. 2 a 8, § 213 odst. 3 a 4",
      "sources": [
        "leave"
      ],
      "note": "Student má nejprve posoudit vznik práva, teprve potom vypočítat jeho rozsah. Do doby rozhodné pro dovolenou mohou vstupovat i zákonem stanovené náhradní doby. Fiktivních 20 hodin se používá pro dovolenou a nemění tím limit práce na DPP. Počet hodin dovolené závisí také na počtu odpracovaných týdenních dob a výměře dovolené."
    },
    {
      "n": 10,
      "kind": "table",
      "title": "Způsob skončení ovlivňuje další práva",
      "headers": [
        "Situace",
        "Základní pravidlo"
      ],
      "rows": [
        [
          "Výpověď zaměstnance",
          "Písemně, i bez důvodu. Zpravidla nejméně 2 měsíce ode dne doručení."
        ],
        [
          "Dohoda o skončení",
          "Obě strany se písemně dohodnou na dni skončení."
        ],
        [
          "Organizační důvod",
          "Při výpovědi zaměstnavatele nebo dohodě z důvodů podle § 52 písm. a) až c) náleží zákonné odstupné."
        ]
      ],
      "bottom": "U organizačních důvodů činí minimum zpravidla 1, 2 nebo 3 průměrné měsíční výdělky podle délky poměru.",
      "sourceLabel": "§ 49 až 52 a § 67 odst. 1",
      "sources": [
        "notice",
        "severance",
        "law"
      ],
      "note": "U běžné výpovědi zaměstnance platí zákonné minimum 2 měsíců. Běh či delší dobu mohou strany individuálně písemně sjednat. Existují zvláštní situace, například § 51a, které nelze mechanicky podřadit pod obecné pravidlo. U zaměstnavatele jsou výpovědní důvody zákonné. Odstupné podle § 67 odst. 1 při organizačních důvodech činí nejméně 1 průměrný měsíční výdělek při trvání méně než rok, 2 při alespoň roce a méně než dvou letech, 3 při alespoň dvou letech. Zohlední se také zákonné započtení předchozího poměru při krátké přestávce. V běžné výuce neřešíme zvláštní režim konta pracovní doby. Ústní výpověď nevyvolává účinky."
    },
    {
      "n": 11,
      "kind": "numbered",
      "title": "Rodič a úprava pracovní doby",
      "items": [
        [
          "Péče o dítě mladší 15 let",
          "Rodič může písemně požádat o kratší pracovní dobu nebo jinou vhodnou úpravu."
        ],
        [
          "Posouzení provozních důvodů",
          "Zaměstnavatel musí vyhovět, pokud mu v tom nebrání vážné provozní důvody."
        ],
        [
          "Písemné odůvodnění zamítnutí",
          "Student má posoudit konkrétní důvod, nikoli převzít pouhé odmítnutí."
        ]
      ],
      "bottom": "Ochrana podle § 241 se vztahuje také na další vyjmenované pečující osoby.",
      "sourceLabel": "§ 241 odst. 2 a § 80",
      "sources": [
        "parents"
      ],
      "note": "Žádost má být konkrétní, například s požadovaným rozsahem a rozvržením práce. Nejde o bezpodmínečný nárok na libovolný režim. Zákon používá pojem vážné provozní důvody, proto je nutné zjistit okolnosti. Režim žádosti o pozdější návrat k původnímu rozsahu se liší, tento snímek pokrývá původní žádost o úpravu."
    },
    {
      "n": 12,
      "kind": "rows",
      "title": "Čtení konkrétního ustanovení",
      "items": [
        [
          "Předpis",
          "Zákon č. 262/2006 Sb., zákoník práce."
        ],
        [
          "Paragraf a odstavec",
          "Například § 75 odst. 2. Čtěte celý odstavec i souvislosti."
        ],
        [
          "Časové znění",
          "Ověřte, kterou verzi používáte pro datum klientovy situace."
        ],
        [
          "Pravidlo a výjimky",
          "Najděte podmínky, spojky a odkazy na další ustanovení."
        ]
      ],
      "bottom": "Zákonný text a výkladový článek mají odlišnou roli. Citaci do auditu berte z předpisu.",
      "sourceLabel": "Otevřít zákoník práce v e-Sbírce",
      "sources": [
        "esbirka",
        "law"
      ],
      "note": "Otevřete e-Sbírku a vyhledejte zákoník práce. Paragraf, odstavec a případně písmeno pomohou najít přesné místo. Není nutné opsat celý paragraf, ale přečtěte jej celý včetně souvislostí. Podmínka nebo výjimka může změnit výsledek. Text zákona je dostupný také na MPSV; časovou verzi ověřte v e-Sbírce."
    },
    {
      "n": 13,
      "kind": "numbered",
      "title": "Co přesně v odpovědi AI ověřujete",
      "items": [
        [
          "Právní tvrzení",
          "Opravdu zákon říká to, co AI uvádí?"
        ],
        [
          "Použití na klienta",
          "Platí dané pravidlo pro tento vztah, období a situaci?"
        ],
        [
          "Závěr a doporučení",
          "Vyplývá z ověřeného pravidla právě tato rada?"
        ]
      ],
      "bottom": "Správnou odpověď potvrďte. Chybnou nebo neúplnou odpověď opravte a vysvětlete proč.",
      "note": "AI může uvést správný paragraf a současně udělat chybný závěr. Samotná existence odkazu proto nestačí. Původní text AI zůstává samostatně uložen. Vlastní opravu zapisujeme do hodnocení a doporučení, nikoli zpětně do původní odpovědi."
    },
    {
      "n": 14,
      "kind": "threePages",
      "title": "Práce ve třech otevřených stránkách",
      "items": [
        [
          "Právní audit AI",
          "Zadání, evidence ověření a vlastní závěr."
        ],
        [
          "Vaše AI",
          "Sem vložíte zadání a odešlete zprávu."
        ],
        [
          "Právní předpis",
          "Zde čtete pravidlo a kontrolujete účinnost."
        ]
      ],
      "bottom": "Aplikace audit vede. Odpověď získáváte ve své AI.",
      "sources": [
        "app",
        "esbirka"
      ],
      "note": "Nechte otevřené tři karty prohlížeče: tento audit, vlastní AI a právní předpis. Do AI vložte jen připravené modelové zadání. Jména studentů ani údaje o skutečných klientech do něj nedoplňujte. V auditu následně zaznamenejte skutečně obdrženou odpověď. Počet samostatně řešených případů určí vyučující."
    },
    {
      "n": 15,
      "kind": "case",
      "title": "Petra a druhá DPP",
      "body": "Petra pracuje v jedné kavárně. Od ledna do června 2026 odpracovala na DPP 240 hodin.\n\nZaměstnavatel nabízí dalších 110 hodin do konce roku. Tvrdí, že nová DPP znamená nový limit 300 hodin.",
      "bottom": "Může Petra dalších 110 hodin odpracovat na druhou DPP u stejného zaměstnavatele?",
      "note": "Toto je vzorová situace z prvního případu auditu. Nejprve si vlastními slovy pojmenujte problém: rozhoduje počet smluv, nebo součet hodin u stejného zaměstnavatele? Fotografie je ilustrační."
    },
    {
      "n": 16,
      "kind": "rows",
      "title": "Rozhodné údaje v Petřině situaci",
      "items": [
        [
          "Typ vztahu",
          "Obě smlouvy jsou dohody o provedení práce."
        ],
        [
          "Zaměstnavatel",
          "Jde o stejného zaměstnavatele."
        ],
        [
          "Období",
          "Všechny hodiny spadají do kalendářního roku 2026."
        ],
        [
          "Rozsah",
          "240 již odpracovaných hodin a nabídka dalších 110 hodin."
        ]
      ],
      "bottom": "Otázka k ověření: obnoví nová dohoda limit, nebo se práce sčítá?",
      "note": "Čísla bereme ze zadání. V praxi bychom ověřovali evidenci všech dohod i hodin. Základní úloha výslovně uvádí odpracované hodiny, proto do ní nevkládáme domnělé hodiny dovolené nebo jiné chybějící okolnosti. Kdyby šlo o jiného zaměstnavatele nebo jiný rok, museli bychom změnit posouzení."
    },
    {
      "n": 17,
      "kind": "numbered",
      "title": "Kopírování zadání do AI",
      "items": [
        [
          "V auditu",
          "Klikněte na „Kopírovat zadání pro AI“ a přečtěte stavovou zprávu."
        ],
        [
          "Ve své AI",
          "Vložte zadání pomocí Ctrl + V a zprávu odešlete."
        ],
        [
          "Zpět v auditu",
          "Zkopírujte odpověď a uložte její původní znění."
        ]
      ],
      "bottom": "Kopírování přesune text do schránky. Zprávu odešlete až ve své AI.",
      "note": "Na PC vložte zkopírované zadání pomocí Ctrl + V; na Macu použijte Command + V a na iPadu volbu Vložit. Tlačítko „Zobrazit zadání“ je jen náhled. Pokud automatické kopírování selže, označte text a zkopírujte jej ručně. Modré zvýraznění znamená výběr textu, nikoli další zadání.",
      "includePrompt": true
    },
    {
      "n": 18,
      "kind": "simulation",
      "title": "Cvičná odpověď se záměrnou chybou",
      "body": "Ano. Nová DPP zakládá nový limit 300 hodin. Petra proto může na druhou dohodu odpracovat všech 110 hodin, i když jde o stejného zaměstnavatele.",
      "bottom": "Výuková simulace. Tento text není záznamem skutečného rozhovoru s konkrétní AI.",
      "note": "Tento chybný text byl vytvořen pro výuku. Nevydávejte jej za skutečnou odpověď svého AI nástroje. Tvrzení k ověření zní: „Nová DPP zakládá nový limit 300 hodin.“ V samostatné práci vždy vložte odpověď, kterou jste sami obdrželi."
    },
    {
      "n": 19,
      "kind": "numbered",
      "title": "Právní důkaz v § 75",
      "items": [
        [
          "Vyhledání",
          "V textu zákona vyhledejte „dohoda o provedení práce“ nebo „§ 75“."
        ],
        [
          "Odstavec 1",
          "Určuje nejvyšší rozsah 300 hodin za kalendářní rok."
        ],
        [
          "Odstavec 2",
          "Do součtu zahrnuje také práci na jiné DPP u stejného zaměstnavatele v témže roce."
        ]
      ],
      "bottom": "Přečtěte oba odstavce. Samotné nalezení čísla 300 případ neřeší.",
      "sourceLabel": "Otevřít text zákona a vyhledat § 75",
      "sources": [
        "law",
        "dpp"
      ],
      "note": "Přečtěte oba celé odstavce. První určuje limit, druhý způsob sčítání a vyloučení náhradních dob podle § 348 odst. 1. Třetí odstavec se týká obsahu dohody. Nápovědu konkrétního případu použijte až po vlastním pokusu o vyhledání."
    },
    {
      "n": 20,
      "kind": "table",
      "title": "Tři různá data v této ukázce",
      "headers": [
        "Údaj",
        "Hodnota a význam"
      ],
      "rows": [
        [
          "Právní stav pro výuku",
          "24. 11. 2026\nK tomuto dni posuzujeme výukový případ."
        ],
        [
          "Použité znění účinné od",
          "1. 11. 2026\nZačátek vybrané verze celého zákona v e-Sbírce."
        ],
        [
          "Datum Vašeho ověření",
          "23. 11. 2026\nDen přípravy této ukázky. Vy zapíšete den své skutečné kontroly."
        ]
      ],
      "bottom": "Začátek znění celého zákona neznamená, že se právě tehdy změnil § 75.",
      "sourceLabel": "e-Sbírka: znění od 1. 11. 2026, novela 197/2026 Sb.",
      "sources": [
        "esbirka"
      ],
      "note": "V e-Sbírce rozlišujte původní účinnost zákona 1. 1. 2007 a začátek vybraného znění celého zákona 1. 11. 2026. Datum ověření je den, kdy jste zdroj skutečně zkontrolovali. Tyto tři údaje mají rozdílný význam."
    },
    {
      "n": 21,
      "kind": "calculation",
      "title": "Petře zbývá 60 hodin",
      "main": "300 − 240 = 60 hodin",
      "equations": [
        [
          "Nabízený součet",
          "240 + 110 = 350 hodin"
        ],
        [
          "Překročení limitu",
          "350 − 300 = 50 hodin"
        ]
      ],
      "bottom": "Druhá DPP u stejného zaměstnavatele nový roční limit nevytváří.",
      "sourceLabel": "Použití § 75 odst. 1 a 2 na zadaná fakta",
      "sources": [
        "dpp",
        "law"
      ],
      "note": "Zbývá 60 hodin; nabídka dalších 110 hodin by limit překročila o 50 hodin. Nejde o zákaz uzavřít druhou DPP jako takovou. Rozhoduje společný rozsah vykonané práce u stejného zaměstnavatele v témže kalendářním roce."
    },
    {
      "n": 22,
      "kind": "evidence",
      "title": "Zápis právního důkazu do auditu",
      "rows": [
        [
          "Předpis, paragraf a odstavec",
          "Zákon č. 262/2006 Sb., zákoník práce, § 75 odst. 1 a 2."
        ],
        [
          "Přesný odkaz na přečtený zdroj",
          "https://ppropo.mpsv.cz/zakon_262_2006"
        ],
        [
          "Krátká přesná citace z ustanovení",
          "„… se započítává také doba práce … na základě jiné dohody o provedení práce.“"
        ],
        [
          "Co pravidlo znamená pro tento případ?",
          "Petřiny DPP u stejného zaměstnavatele v roce 2026 se sčítají. Nová dohoda součet nevynuluje. Zbývá 60 hodin."
        ]
      ],
      "sourceLabel": "§ 75 odst. 2. Citace je krátký výřez, student čte celý odstavec.",
      "sources": [
        "law"
      ],
      "note": "Zde jsou zachycena čtyři pole právního důkazu. Celý vyplněný postup najdete v záložce „Vzorový audit“. Citace je zkrácena výpustkou, ale závěr vychází z celých odstavců 1 a 2. Odkaz zapisujte podle skutečně přečteného zdroje."
    },
    {
      "n": 23,
      "kind": "verdict",
      "title": "Hodnocení modelové odpovědi",
      "verdict": "Nesprávná",
      "body": "Modelový text tvrdí, že nová DPP vytvoří nový limit. To odporuje pravidlu součtu v § 75 odst. 2.\n\nPři dalších 110 hodinách by Petra odpracovala 350 hodin. Limit by překročila o 50 hodin. Správný zbývající rozsah je 60 hodin.",
      "bottom": "Do pole „Proč ji potvrzujete, nebo opravujete?“ patří konkrétní rozpor a jeho vysvětlení.",
      "sources": [
        "law",
        "dpp"
      ],
      "note": "Hodnocení „Nesprávná“ se týká této simulace. Jestliže Vaše AI správně vysvětlí sčítání a vypočítá 60 hodin, její odpověď potvrďte a doložte. U směsi správných a chybných tvrzení oddělte, co potvrzujete a co opravujete."
    },
    {
      "n": 24,
      "kind": "advice",
      "title": "Doporučení pro Petru",
      "body": "Petro, před dalšími směnami si s kavárnou ověřte evidenci všech Vašich DPP za rok 2026.\n\nPokud jste u tohoto zaměstnavatele odpracovala celkem 240 hodin, můžete na DPP odpracovat ještě 60 hodin. Požádejte o odpovídající úpravu rozsahu práce.\n\nPro větší rozsah je třeba posoudit jiný pracovněprávní vztah a jeho podmínky.",
      "bottom": "Doporučení klientovi obsahuje srozumitelný výsledek a konkrétní další krok.",
      "sources": [
        "dpp",
        "contract"
      ],
      "note": "Neučíme klientku jen číslo paragrafu, ale postup. Důležitá je kontrola evidence všech dohod a úprava plánovaného rozsahu. Nepřevádíme automaticky přebývajících 50 hodin na DPČ. Je třeba ověřit podmínky jiného vztahu a také omezení souběžně stejně druhově vymezené práce u stejného zaměstnavatele podle § 34b odst. 2."
    },
    {
      "n": 25,
      "kind": "numbered",
      "title": "Dokončení záznamu v aplikaci",
      "items": [
        [
          "Kontrola obsahu",
          "Jsou odděleny původní odpověď, citace zákona, vlastní výklad a rada klientovi?"
        ],
        [
          "Potvrzení vlastního čtení",
          "Zaškrtněte prohlášení až po skutečném přečtení a ověření znění."
        ],
        [
          "Označení auditu",
          "Klikněte na „Označit audit jako vyplněný“. Případná chybějící pole doplňte."
        ]
      ],
      "bottom": "Zelená značka potvrzuje vyplnění záznamu. Aplikace právní správnost neposuzuje.",
      "note": "Potvrzení vlastního čtení zaškrtněte až po skutečném přečtení ustanovení. Neopisujte datum účinnosti jen kvůli označení dokončení. Rozpracované odpovědi se ukládají také. Po změně vyplněného auditu jej znovu zkontrolujte a případně označte jako vyplněný."
    },
    {
      "n": 26,
      "kind": "numbered",
      "title": "Další případ řešíte samostatně",
      "items": [
        [
          "Jiná úloha z nabídky",
          "Vyberte jeden další případ podle pokynu vyučující."
        ],
        [
          "Váš skutečný výstup AI",
          "Uložte odpověď, kterou jste sami obdrželi. Ověřte rozhodná tvrzení."
        ],
        [
          "Váš doložený závěr",
          "Ukažte konkrétní ustanovení a vysvětlete, proč odpověď potvrzujete nebo opravujete."
        ]
      ],
      "bottom": "Rozpracované odpovědi se automaticky ukládají. Sledujte stav „Uloženo pro vyučující“.",
      "note": "Průběžně si odpovídejte: Které tvrzení ověřuji? Kde je pro ně opora v zákoně? Proč pravidlo platí pro tohoto klienta? Který chybějící údaj by mohl změnit závěr? Pracujte s vlastním výstupem AI; odlišné odpovědi mohou vést k odlišnému hodnocení."
    },
    {
      "n": 27,
      "kind": "numbered",
      "title": "Vaše práce se ukládá průběžně",
      "bottom": "Při výpadku připojení zůstane rozepsaná práce v prohlížeči a čeká na odeslání.",
      "note": "Vyučující vidí i rozpracované záznamy. Nemusíte nic ručně odevzdávat. Vlastní kopii můžete stáhnout. Před odchodem ze sdíleného počítače použijte „Ukončit práci na tomto zařízení“ a zkontrolujte, že je Váš pracovní prostor zavřený. Jméno samo neslouží jako heslo pro obnovení práce na jiném zařízení.",
      "items": [
        [
          "Vstup pod jménem",
          "Jméno vyplníte jednou v záložce „Moje práce“."
        ],
        [
          "Potvrzení uložení",
          "Zpráva „Uloženo pro vyučující“ potvrzuje přijetí zápisu serverem."
        ],
        [
          "Pokračování",
          "Na stejném zařízení a ve stejném prohlížeči se Vaše práce obnoví."
        ]
      ]
    },
    {
      "n": 28,
      "kind": "links",
      "title": "Odkazy pro další práci",
      "links": [
        [
          "Právní audit AI",
          "app"
        ],
        [
          "Zákoník práce v e-Sbírce",
          "esbirka"
        ],
        [
          "Úplný text zákona na MPSV",
          "law"
        ],
        [
          "Výklad MPSV k dohodě o provedení práce",
          "dpp"
        ]
      ],
      "bottom": "Umím ukázat konkrétní odstavec a vlastními slovy vysvětlit radu klientovi.",
      "note": "Záložky „Výklad zákoníku práce“, „Vzorový audit“ a „Moje práce“ patří do jedné aplikace. Mezi nimi můžete přecházet bez přepsání vlastních odpovědí. Právní podklady byly ověřeny 23. 11. 2026; při pozdější výuce ověřte časové znění znovu."
    }
  ],
  "credits": [
    {
      "label": "Fotografie studia: Ashutosh Gupta / Unsplash",
      "url": "https://unsplash.com/photos/focused-student-studying-at-a-library-table-with-a-laptop-NASjMHJ9OhI"
    },
    {
      "label": "Fotografie kavárny: Vitaly Gariev / Unsplash",
      "url": "https://unsplash.com/photos/a-barista-is-talking-to-a-customer-nXnMc6z-s54"
    }
  ]
};
