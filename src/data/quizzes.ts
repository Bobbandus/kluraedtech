import type { Subject } from "@/components/cover";

export interface Question {
  id: string;
  text: string;
  options: string[];
  correct: number;
  time: number;
  explanation?: string;
  concept?: string;
}

export type Level = "Åk 4–6" | "Åk 7–9" | "Gymnasiet";

export interface Quiz {
  id: string;
  title: string;
  description: string;
  subject: Subject;
  level: Level;
  questions: Question[];
  creatorId: string;
  updatedAt: string;
  status: "klar" | "utkast";
  plays?: number;
  saves?: number;
  tags?: string[];
  featured?: boolean;
}

export interface Creator {
  id: string;
  name: string;
  school: string;
  skin: string;
  verified?: boolean;
}

export const CREATORS: Creator[] = [
  { id: "sara", name: "Sara Lindqvist", school: "Kvarnbackaskolan, Uppsala", skin: "raven" },
  { id: "jonas", name: "Jonas Berg", school: "Hagaskolan, Göteborg", skin: "kassetten", verified: true },
  { id: "amira", name: "Amira Haddad", school: "Rinkebyskolan, Stockholm", skin: "blackis", verified: true },
  { id: "per", name: "Per-Olof Nyström", school: "Kiruna gymnasium", skin: "isbiten" },
  { id: "elin", name: "Elin Sjöberg", school: "Katedralskolan, Lund", skin: "flugis", verified: true },
  { id: "mikael", name: "Mikael Ahonen", school: "Tornedalsskolan, Haparanda", skin: "kotte" },
  { id: "linnea", name: "Linnéa Ek", school: "Fridhemsskolan, Västerås", skin: "molnet" },
  { id: "klura", name: "Klura Redaktion", school: "Kurerat av Klura", skin: "mosse", verified: true },
];

export const creatorById = (id: string) => CREATORS.find((c) => c.id === id) ?? CREATORS[0];

let counter = 0;
function q(text: string, options: string[], correct: number, explanation?: string, concept?: string, time = 20): Question {
  counter += 1;
  return { id: `q${counter}`, text, options, correct, time, explanation, concept };
}

/* ======================================================================
   Lärarens egna quiz (Sara Lindqvist, SO/NO åk 8–9)
   ====================================================================== */

export const MY_QUIZZES: Quiz[] = [
  {
    id: "stormaktstiden",
    title: "Sverige som stormakt",
    description: "Från Gustav II Adolf till freden i Nystad. Repetition inför provet i vecka 42.",
    subject: "historia",
    level: "Åk 7–9",
    creatorId: "sara",
    updatedAt: "2026-09-29",
    status: "klar",
    plays: 3,
    tags: ["1600-talet", "Stormaktstiden"],
    questions: [
      q("Vilket år brukar räknas som början på Sveriges stormaktstid?", ["1523", "1611", "1648", "1718"], 1, "1611 blev Gustav II Adolf kung. Då brukar stormaktstiden räknas starta.", "Tidslinje"),
      q("I vilket krig stupade Gustav II Adolf?", ["Trettioåriga kriget", "Stora nordiska kriget", "Kalmarkriget", "Skånska kriget"], 0, "Han stupade vid Lützen 1632 under trettioåriga kriget.", "Krig och fred"),
      q("Vad hette regalskeppet som sjönk på sin jungfrufärd 1628?", ["Kronan", "Vasa", "Svärdet", "Äpplet"], 1, "Vasa sjönk i Stockholms hamn efter bara 1 300 meter.", "Samhälle och kultur"),
      q("Vilken fred gav Sverige Skåne, Halland och Blekinge?", ["Freden i Nystad", "Westfaliska freden", "Freden i Roskilde", "Freden i Brömsebro"], 2, "Freden i Roskilde 1658 efter Karl X Gustavs tåg över isen.", "Krig och fred"),
      q("Vem var drottning Kristinas far?", ["Karl IX", "Gustav II Adolf", "Karl X Gustav", "Johan III"], 1, "Kristina blev drottning som sexåring när Gustav II Adolf dog.", "Personer"),
      q("Varför var stormaktstiden svår för många bönder?", ["Högre skatter och utskrivning av soldater", "Det fanns för mycket mat", "Kyrkan förbjöd jordbruk", "De fick inte bo på landet"], 0, "Krigen krävde soldater och pengar – det drabbade bondebefolkningen hårt.", "Samhälle och kultur"),
      q("Vilket slag 1709 brukar ses som början på slutet för stormaktstiden?", ["Slaget vid Narva", "Slaget vid Poltava", "Slaget vid Lund", "Slaget vid Breitenfeld"], 1, "Vid Poltava förlorade Karl XII stora delar av armén mot Ryssland.", "Krig och fred"),
      q("Vad innebar freden i Nystad 1721?", ["Sverige fick Norge", "Sverige förlorade baltiska provinser till Ryssland", "Sverige vann Finland", "Danmark blev svenskt"], 1, "Sverige förlorade bland annat Estland, Livland och Ingermanland.", "Krig och fred"),
      q("Vad kallas perioden efter stormaktstiden då riksdagen fick mer makt?", ["Medeltiden", "Frihetstiden", "Gustavianska tiden", "Vasatiden"], 1, "Frihetstiden 1719–1772: kungen hade lite makt, riksdagen mycket.", "Tidslinje"),
      q("Vilken var en viktig svensk exportvara under 1600-talet?", ["Kaffe", "Koppar och järn", "Bomull", "Socker"], 1, "Bergslagens koppar och järn finansierade mycket av krigen.", "Samhälle och kultur"),
      q("Vad var ett av Axel Oxenstiernas viktigaste uppdrag?", ["Att leda flottan", "Att styra riket som rikskansler", "Att vara biskop i Uppsala", "Att bygga Vasa"], 1, "Oxenstierna byggde upp statsförvaltningen och styrde under Kristinas förmyndartid.", "Personer"),
      q("Varför gick Karl X Gustav över isen 1658?", ["För att anfalla Danmark från oväntat håll", "För att fly från Ryssland", "För att handla med Tyskland", "För att det var en tradition"], 0, "Bälten frös och armén kunde överraska danskarna – ett mycket riskabelt drag.", "Krig och fred"),
    ],
  },
  {
    id: "algebra-grund",
    title: "Algebra: uttryck och ekvationer",
    description: "Förenkla uttryck och lösa förstagradsekvationer. Passar som uppstart.",
    subject: "matematik",
    level: "Åk 7–9",
    creatorId: "sara",
    updatedAt: "2026-09-24",
    status: "klar",
    plays: 5,
    tags: ["Ekvationer", "Uttryck"],
    questions: [
      q("Förenkla: 3x + 5x", ["8x", "15x", "8x²", "35x"], 0, "Termer med samma variabel läggs ihop: 3 + 5 = 8.", "Förenkla uttryck", 25),
      q("Lös ekvationen: x + 7 = 12", ["x = 19", "x = 5", "x = 7", "x = 84"], 1, "Subtrahera 7 från båda leden: x = 5.", "Ekvationer", 25),
      q("Vad är värdet av 2a om a = 6?", ["8", "26", "12", "3"], 2, "2a betyder 2 · a = 2 · 6 = 12.", "Variabler", 20),
      q("Lös: 3x = 21", ["x = 18", "x = 7", "x = 24", "x = 63"], 1, "Dela båda leden med 3.", "Ekvationer", 25),
      q("Förenkla: 4(x + 2)", ["4x + 2", "4x + 8", "x + 8", "4x + 6"], 1, "Multiplicera in 4 i parentesen: 4 · x + 4 · 2.", "Förenkla uttryck", 30),
      q("Lös: 2x − 4 = 10", ["x = 3", "x = 7", "x = 12", "x = 14"], 1, "Addera 4: 2x = 14. Dela med 2: x = 7.", "Ekvationer", 30),
      q("Vilket uttryck beskriver ”fem mer än dubbla x”?", ["5x + 2", "2x + 5", "2(x + 5)", "x + 10"], 1, "Dubbla x är 2x, fem mer blir 2x + 5.", "Variabler", 30),
      q("Förenkla: 7y − 2y + 3", ["5y + 3", "8y", "9y + 3", "5y − 3"], 0, "7y − 2y = 5y. Konstanten 3 står kvar.", "Förenkla uttryck", 25),
      q("Lös: x/4 = 6", ["x = 10", "x = 1,5", "x = 24", "x = 2"], 2, "Multiplicera båda leden med 4.", "Ekvationer", 25),
      q("Lös: 5x + 3 = 3x + 11", ["x = 4", "x = 7", "x = 2", "x = 8"], 0, "Subtrahera 3x: 2x + 3 = 11. Sedan 2x = 8, x = 4.", "Ekvationer", 40),
    ],
  },
  {
    id: "kroppen",
    title: "Biologi: kroppens organ",
    description: "Hjärta, lungor, matsmältning och nervsystem.",
    subject: "biologi",
    level: "Åk 7–9",
    creatorId: "sara",
    updatedAt: "2026-09-18",
    status: "klar",
    plays: 2,
    tags: ["Människokroppen"],
    questions: [
      q("Hur många kammare har människans hjärta?", ["Två", "Tre", "Fyra", "Sex"], 2, "Två förmak och två kammare.", "Blodomlopp"),
      q("Var sker det mesta av näringsupptaget?", ["I magsäcken", "I tunntarmen", "I tjocktarmen", "I matstrupen"], 1, "Tunntarmens tarmludd ger en enorm yta för upptag.", "Matsmältning"),
      q("Vad gör de röda blodkropparna?", ["Bekämpar bakterier", "Transporterar syre", "Får blodet att levra sig", "Bildar hormoner"], 1, "Hemoglobinet binder syre från lungorna.", "Blodomlopp"),
      q("Vad heter de små luftblåsor där gasutbytet sker i lungorna?", ["Alveoler", "Bronker", "Kapillärer", "Villi"], 0, "Alveolerna omges av kapillärer där syre och koldioxid byts.", "Andning"),
      q("Vilket organ renar blodet och bildar urin?", ["Levern", "Mjälten", "Njurarna", "Bukspottkörteln"], 2, "Njurarna filtrerar ungefär 180 liter blod per dygn.", "Utsöndring"),
      q("Vilken del av hjärnan styr balans och koordination?", ["Lillhjärnan", "Storhjärnan", "Hjärnstammen", "Hypofysen"], 0, "Lillhjärnan finjusterar rörelser och balans.", "Nervsystem"),
      q("Vad kallas blodkärl som leder blod FRÅN hjärtat?", ["Vener", "Artärer", "Kapillärer", "Lymfkärl"], 1, "Artär = bort från hjärtat. Ven = tillbaka.", "Blodomlopp"),
      q("Vilket ämne bildas i levern och hjälper till att bryta ned fett?", ["Insulin", "Galla", "Saliv", "Pepsin"], 1, "Galla lagras i gallblåsan och emulgerar fett.", "Matsmältning"),
      q("Vad är en reflex?", ["En medveten rörelse", "En snabb automatisk reaktion", "En sorts hormon", "Ett muskelfäste"], 1, "Reflexer går ofta via ryggmärgen och sparar tid.", "Nervsystem"),
      q("Varför andas vi snabbare när vi springer?", ["Musklerna behöver mer syre", "Lungorna blir mindre", "Hjärtat slutar slå", "Vi blir kallare"], 0, "Musklernas förbränning kräver syre och bildar koldioxid.", "Andning"),
    ],
  },
  {
    id: "engelska-vecka38",
    title: "Engelska glosor – vecka 38",
    description: "Ord från kapitel 3: travel and adventure.",
    subject: "engelska",
    level: "Åk 7–9",
    creatorId: "sara",
    updatedAt: "2026-09-15",
    status: "klar",
    plays: 1,
    questions: [
      q("Vad betyder ”journey”?", ["Resa", "Dagbok", "Tidning", "Djungel"], 0, "Journey = resa, oftast en längre.", "Ordförråd"),
      q("Vad heter ”bagage” på engelska?", ["Baggage / luggage", "Backpack", "Package", "Bags only"], 0, "Både luggage och baggage används.", "Ordförråd"),
      q("Vad betyder ”to get lost”?", ["Att förlora", "Att gå vilse", "Att bli trött", "Att lämna"], 1, "Get lost = gå vilse (eller ”stick!” i otrevlig ton).", "Uttryck"),
      q("Vilket ord betyder ”utsikt”?", ["Sight", "View", "Look", "Vision"], 1, "View = utsikt. What a view!", "Ordförråd"),
      q("Vad betyder ”departure”?", ["Ankomst", "Avgång", "Försening", "Biljett"], 1, "Departure = avgång, arrival = ankomst.", "Ordförråd"),
      q("Välj rätt: ”I have ___ been to London.”", ["ever", "never", "yet", "since"], 1, "Never står före huvudverbet i perfekt.", "Grammatik"),
      q("Vad betyder ”adventurous”?", ["Äventyrlig", "Försiktig", "Rädd", "Lat"], 0, "Adventurous = äventyrlig, vågar testa nytt.", "Ordförråd"),
      q("Vad betyder ”to set off”?", ["Att stänga av", "Att ge sig av", "Att sätta sig", "Att komma fram"], 1, "We set off early = vi gav oss av tidigt.", "Uttryck"),
    ],
  },
  {
    id: "klimat-utkast",
    title: "Klimat och väder",
    description: "Skillnaden mellan väder och klimat, växthuseffekten och klimatzoner.",
    subject: "geografi",
    level: "Åk 7–9",
    creatorId: "sara",
    updatedAt: "2026-09-30",
    status: "utkast",
    questions: [
      q("Vad är skillnaden mellan väder och klimat?", ["Ingen skillnad", "Väder är kort tid, klimat är genomsnitt över lång tid", "Klimat gäller bara regn", "Väder mäts bara på vintern"], 1, "Klimat = medelvädret över minst 30 år.", "Begrepp"),
      q("Vilken gas bidrar mest till den förstärkta växthuseffekten?", ["Syre", "Kväve", "Koldioxid", "Helium"], 2, undefined, "Växthuseffekten"),
      q("Vilken klimatzon ligger större delen av Sverige i?", ["Tropisk", "Tempererad", "Subtropisk", "Ökenklimat"], 1, undefined, "Klimatzoner"),
    ],
  },
];

/* ======================================================================
   Upptäck — quiz från andra lärare
   ====================================================================== */

export const MARKET_QUIZZES: Quiz[] = [
  {
    id: "vikingatiden",
    title: "Vikingatiden på riktigt",
    description: "Myter och fakta om vikingarna – handel, runor, tro och vardag. Inga horn på hjälmarna.",
    subject: "historia",
    level: "Åk 4–6",
    creatorId: "jonas",
    updatedAt: "2026-08-20",
    status: "klar",
    plays: 18420,
    saves: 2310,
    featured: true,
    tags: ["Vikingatid", "Myter"],
    questions: [
      q("Hade vikingarna horn på hjälmarna?", ["Ja, alltid", "Nej, det är en senare myt", "Bara hövdingar", "Bara i strid"], 1, "Hornen kommer från 1800-talets operor och konst.", "Myter"),
      q("Vad kallas vikingarnas skriftspråk?", ["Hieroglyfer", "Runor", "Kilskrift", "Latin"], 1, "Runraden kallas futhark efter de första tecknen.", "Kultur"),
      q("Vilken var den viktigaste guden för åska?", ["Oden", "Frej", "Tor", "Loke"], 2, "Tor med hammaren Mjölner.", "Tro"),
      q("Vad hette den viktiga handelsplatsen på Björkö i Mälaren?", ["Birka", "Uppsala", "Visby", "Sigtuna"], 0, "Birka var en av Nordens första städer.", "Handel"),
      q("Ungefär när var vikingatiden?", ["500–300 f.Kr.", "800–1050 e.Kr.", "1300–1500", "1600–1700"], 1, "Brukar räknas från ca 793 till ca 1066.", "Tidslinje"),
      q("Vad var ett ting?", ["En sorts båt", "En samlingsplats för beslut och rättskipning", "Ett vapen", "En gud"], 1, "På tinget löste man tvister och fattade beslut.", "Samhälle"),
      q("Vart reste svenska vikingar oftast?", ["Österut mot Ryssland", "Till Amerika", "Till Afrika", "Till Japan"], 0, "Via floderna ända till Konstantinopel och Bagdad.", "Handel"),
      q("Vad var en träl?", ["En hövding", "En ofri person", "En präst", "En köpman"], 1, "Trälar ägdes av andra och hade inga rättigheter.", "Samhälle"),
    ],
  },
  {
    id: "procent",
    title: "Procent i vardagen",
    description: "Rea, moms och ränta. Procentuppgifter som faktiskt dyker upp i livet.",
    subject: "matematik",
    level: "Åk 7–9",
    creatorId: "amira",
    updatedAt: "2026-09-02",
    status: "klar",
    plays: 12880,
    saves: 1904,
    featured: true,
    tags: ["Procent", "Vardagsmatte"],
    questions: [
      q("En jacka kostar 800 kr. Den sänks med 25 %. Vad kostar den nu?", ["575 kr", "600 kr", "625 kr", "775 kr"], 1, "25 % av 800 = 200. 800 − 200 = 600.", "Procent av", 30),
      q("Hur mycket är 10 % av 350?", ["3,5", "35", "350", "0,35"], 1, "10 % = en tiondel.", "Procent av", 20),
      q("Ett pris höjs från 200 kr till 250 kr. Hur många procent?", ["20 %", "25 %", "50 %", "125 %"], 1, "Ökningen 50 kr delat med 200 kr = 0,25.", "Förändringsfaktor", 30),
      q("Vad är förändringsfaktorn för en ökning med 12 %?", ["0,12", "1,12", "12", "0,88"], 1, "100 % + 12 % = 112 % = 1,12.", "Förändringsfaktor", 25),
      q("Ett spel kostar 499 kr på rea med 20 % rabatt. Ungefär vad kostade det före rean?", ["520 kr", "600 kr", "624 kr", "700 kr"], 2, "499 är 80 % av ordinarie: 499 / 0,8 ≈ 624.", "Baklänges", 40),
      q("Vilket är mest: 30 % av 90 eller 90 % av 30?", ["30 % av 90", "90 % av 30", "De är lika", "Går inte att avgöra"], 2, "Båda blir 27 – multiplikation är kommutativ.", "Procent av", 30),
      q("Du sätter in 1 000 kr med 3 % årlig ränta. Hur mycket efter ett år?", ["1 003 kr", "1 030 kr", "1 300 kr", "1 033 kr"], 1, "1 000 · 1,03 = 1 030.", "Ränta", 30),
      q("Vad betyder ”procentenheter”?", ["Samma som procent", "Skillnaden mellan två procentsatser", "En tiondels procent", "Procent per år"], 1, "Från 20 % till 25 % är 5 procentenheter men 25 % ökning.", "Begrepp", 25),
    ],
  },
  {
    id: "irregular-verbs",
    title: "Irregular verbs – level up",
    description: "De 40 vanligaste oregelbundna verben. Kör flera gånger, det sitter till slut.",
    subject: "engelska",
    level: "Åk 7–9",
    creatorId: "elin",
    updatedAt: "2026-09-10",
    status: "klar",
    plays: 22140,
    saves: 3480,
    featured: true,
    tags: ["Grammatik", "Verb"],
    questions: [
      q("Past tense of ”go”?", ["goed", "went", "gone", "going"], 1, "go – went – gone", "Oregelbundna verb", 15),
      q("Past tense of ”catch”?", ["catched", "caught", "cought", "catchen"], 1, "catch – caught – caught", "Oregelbundna verb", 15),
      q("Past participle of ”write”?", ["wrote", "writed", "written", "writ"], 2, "write – wrote – written", "Oregelbundna verb", 15),
      q("Past tense of ”think”?", ["thinked", "thunk", "thought", "taught"], 2, "Förväxla inte med teach – taught.", "Oregelbundna verb", 15),
      q("”She has ___ the whole cake.”", ["ate", "eaten", "eat", "eated"], 1, "has + past participle: eaten.", "Perfekt", 20),
      q("Past tense of ”bring”?", ["brang", "brought", "bringed", "brung"], 1, "bring – brought – brought", "Oregelbundna verb", 15),
      q("Past participle of ”swim”?", ["swam", "swum", "swimmed", "swimmen"], 1, "swim – swam – swum", "Oregelbundna verb", 15),
      q("”Yesterday we ___ to the cinema.”", ["have gone", "go", "went", "gone"], 2, "Yesterday = avslutad tid → past simple.", "Preteritum", 20),
    ],
  },
  {
    id: "sveriges-landskap",
    title: "Sveriges landskap och städer",
    description: "Från Skåne till Lappland. Landskap, residensstäder och älvar.",
    subject: "geografi",
    level: "Åk 4–6",
    creatorId: "mikael",
    updatedAt: "2026-07-28",
    status: "klar",
    plays: 9650,
    saves: 1210,
    tags: ["Sverige", "Kartkunskap"],
    questions: [
      q("Hur många landskap har Sverige?", ["21", "25", "29", "18"], 1, "25 landskap, men 21 län.", "Indelning"),
      q("Vilket är Sveriges största landskap till ytan?", ["Jämtland", "Norrbotten", "Lappland", "Dalarna"], 2, "Lappland är nästan en fjärdedel av Sverige.", "Indelning"),
      q("Vilken är Sveriges längsta älv?", ["Dalälven", "Klarälven–Göta älv", "Torneälven", "Umeälven"], 1, "Klarälven och Göta älv räknas ihop som ett system.", "Vatten"),
      q("Vilken stad ligger vid Vättern?", ["Jönköping", "Karlstad", "Västerås", "Kalmar"], 0, "Jönköping ligger vid Vätterns sydspets.", "Städer"),
      q("Vad heter Sveriges högsta berg?", ["Sarek", "Kebnekaise", "Helagsfjället", "Åreskutan"], 1, "Sydtoppen är ungefär 2 097 meter.", "Natur"),
      q("Vilket landskap kallas ”Sveriges trädgård”?", ["Halland", "Skåne", "Öland", "Västergötland"], 1, "Skåne har mycket bördig jord.", "Indelning"),
      q("Vilken ö är Sveriges största?", ["Öland", "Orust", "Gotland", "Tjörn"], 2, undefined, "Natur"),
      q("Vilken stad är residensstad i Västerbottens län?", ["Skellefteå", "Umeå", "Luleå", "Lycksele"], 1, undefined, "Städer"),
    ],
  },
  {
    id: "periodiska",
    title: "Periodiska systemet: grunderna",
    description: "Grundämnen, kemiska tecken och atomens byggstenar.",
    subject: "kemi",
    level: "Åk 7–9",
    creatorId: "per",
    updatedAt: "2026-09-12",
    status: "klar",
    plays: 7420,
    saves: 980,
    tags: ["Atomer", "Grundämnen"],
    questions: [
      q("Vilket är solens vanligaste grundämne?", ["Järn", "Kisel", "Väte", "Syre"], 2, "Ungefär 73 % av solens massa är väte.", "Grundämnen"),
      q("Vad är Na för grundämne?", ["Kväve", "Natrium", "Neon", "Nickel"], 1, "Från latinets natrium.", "Kemiska tecken"),
      q("Vilka partiklar finns i atomkärnan?", ["Elektroner och protoner", "Protoner och neutroner", "Bara neutroner", "Elektroner och neutroner"], 1, "Elektronerna rör sig runt kärnan.", "Atomen"),
      q("Vad anger atomnumret?", ["Antal neutroner", "Antal protoner", "Atomens vikt", "Antal skal"], 1, "Antalet protoner avgör vilket ämne det är.", "Atomen"),
      q("Vilken grupp tillhör helium och neon?", ["Alkalimetaller", "Halogener", "Ädelgaser", "Övergångsmetaller"], 2, "Ädelgaser reagerar nästan inte alls.", "Periodiska systemet"),
      q("Vad är Fe?", ["Fluor", "Järn", "Fosfor", "Francium"], 1, "Ferrum = järn på latin.", "Kemiska tecken"),
      q("Hur är ämnena ordnade i periodiska systemet?", ["Efter upptäcktsår", "Efter atomnummer", "Alfabetiskt", "Efter färg"], 1, "Mendelejev ordnade dem efter egenskaper och massa.", "Periodiska systemet"),
      q("Vilken laddning har en elektron?", ["Positiv", "Negativ", "Neutral", "Varierar"], 1, undefined, "Atomen"),
    ],
  },
  {
    id: "demokrati",
    title: "Demokrati och riksdagen",
    description: "Hur fungerar riksdag, regering och val? Bra inför valdiskussioner.",
    subject: "samhalle",
    level: "Åk 7–9",
    creatorId: "amira",
    updatedAt: "2026-08-30",
    status: "klar",
    plays: 11030,
    saves: 1660,
    tags: ["Demokrati", "Politik"],
    questions: [
      q("Hur många ledamöter har Sveriges riksdag?", ["249", "349", "449", "175"], 1, undefined, "Riksdagen"),
      q("Hur ofta är det riksdagsval i Sverige?", ["Vart tredje år", "Vart fjärde år", "Vart femte år", "Varje år"], 1, "Sedan 1994 är mandatperioden fyra år.", "Val"),
      q("Vem utser statsministern?", ["Kungen", "Folket direkt", "Riksdagen", "Regeringen"], 2, "Talmannen föreslår och riksdagen röstar.", "Regeringen"),
      q("Vad är spärren för att komma in i riksdagen?", ["2 %", "4 %", "5 %", "12 %"], 1, undefined, "Val"),
      q("Vilken är en av riksdagens viktigaste uppgifter?", ["Döma i brottmål", "Stifta lagar", "Leda polisen", "Utse kungen"], 1, "Riksdagen stiftar lagar och beslutar om budgeten.", "Riksdagen"),
      q("Vad innebär maktdelning?", ["Att kungen styr ensam", "Att makten fördelas mellan olika organ", "Att alla har samma lön", "Att kommuner har all makt"], 1, undefined, "Begrepp"),
      q("Vad är en grundlag?", ["En lag som är extra svår att ändra", "En lag för skolor", "En kommunal regel", "En EU-rekommendation"], 0, "Sverige har fyra grundlagar.", "Begrepp"),
      q("Från vilken ålder får man rösta i riksdagsval?", ["16", "18", "20", "21"], 1, undefined, "Val"),
    ],
  },
  {
    id: "ellara",
    title: "Ellära: ström och spänning",
    description: "Ohms lag, kretsar och vad som faktiskt händer när du tänder lampan.",
    subject: "fysik",
    level: "Åk 7–9",
    creatorId: "per",
    updatedAt: "2026-09-05",
    status: "klar",
    plays: 5310,
    saves: 720,
    tags: ["Elektricitet"],
    questions: [
      q("Vad mäts i ampere?", ["Spänning", "Ström", "Resistans", "Effekt"], 1, undefined, "Storheter", 25),
      q("Vad säger Ohms lag?", ["U = R · I", "P = U / I", "R = U · I", "I = U · R"], 0, "Spänning = resistans gånger ström.", "Ohms lag", 25),
      q("Om U = 12 V och R = 4 Ω, vad är I?", ["48 A", "3 A", "8 A", "0,33 A"], 1, "I = U / R = 12 / 4.", "Ohms lag", 35),
      q("Vad händer i en seriekoppling om en lampa går sönder?", ["Övriga lyser starkare", "Alla slocknar", "Inget händer", "Bara grannlampan slocknar"], 1, "Kretsen bryts för alla.", "Kretsar", 25),
      q("Vilket material leder ström bäst?", ["Gummi", "Koppar", "Trä", "Glas"], 1, undefined, "Ledare", 20),
      q("Vad mäts i volt?", ["Ström", "Spänning", "Energi", "Laddning"], 1, undefined, "Storheter", 20),
      q("Hur kopplas lamporna i ett vanligt hus?", ["I serie", "Parallellt", "Varannan i serie", "De kopplas inte"], 1, "Då kan varje lampa tändas och släckas för sig.", "Kretsar", 25),
      q("Vad är effekten hos en apparat på 230 V som drar 2 A?", ["115 W", "232 W", "460 W", "2 300 W"], 2, "P = U · I.", "Effekt", 35),
    ],
  },
  {
    id: "ordklasser",
    title: "Ordklasser – snabbkoll",
    description: "Substantiv, verb, adjektiv och de lite knepigare: pronomen och prepositioner.",
    subject: "svenska",
    level: "Åk 4–6",
    creatorId: "linnea",
    updatedAt: "2026-09-08",
    status: "klar",
    plays: 14270,
    saves: 2050,
    tags: ["Grammatik"],
    questions: [
      q("Vilken ordklass är ”springa”?", ["Substantiv", "Verb", "Adjektiv", "Adverb"], 1, "Verb beskriver vad någon gör.", "Verb"),
      q("Vilken ordklass är ”snabb”?", ["Adjektiv", "Verb", "Pronomen", "Preposition"], 0, "Adjektiv beskriver hur något är.", "Adjektiv"),
      q("Vilket ord är ett pronomen?", ["hund", "vi", "under", "glad"], 1, "Pronomen ersätter substantiv.", "Pronomen"),
      q("Vilket ord är en preposition?", ["på", "hoppa", "röd", "jag"], 0, "Prepositioner visar läge: på, i, under.", "Prepositioner"),
      q("Hitta substantivet: ”Den lilla katten sov.”", ["lilla", "katten", "sov", "den"], 1, undefined, "Substantiv"),
      q("Vilken form är ”sprang”?", ["Presens", "Preteritum", "Supinum", "Infinitiv"], 1, undefined, "Verb"),
      q("Vad är ”ofta” för ordklass?", ["Adjektiv", "Adverb", "Substantiv", "Konjunktion"], 1, "Adverb säger hur, när eller var.", "Adverb"),
      q("Vilket ord är en konjunktion?", ["och", "stol", "fort", "dem"], 0, "Konjunktioner binder ihop: och, men, eller.", "Konjunktioner"),
    ],
  },
  {
    id: "celler",
    title: "Cellen – livets minsta enhet",
    description: "Djurcell, växtcell och bakterie. Inklusive organellernas jobb.",
    subject: "biologi",
    level: "Gymnasiet",
    creatorId: "elin",
    updatedAt: "2026-08-18",
    status: "klar",
    plays: 6890,
    saves: 1120,
    tags: ["Cellbiologi"],
    questions: [
      q("Var produceras det mesta av cellens ATP?", ["Ribosomer", "Mitokondrier", "Golgiapparaten", "Cellkärnan"], 1, "Cellandningen sker till stor del i mitokondrierna.", "Organeller"),
      q("Vad har växtceller som djurceller saknar?", ["Cellmembran", "Cellvägg och kloroplaster", "Ribosomer", "Cellkärna"], 1, undefined, "Celltyper"),
      q("Var sker proteinsyntesen?", ["Ribosomer", "Lysosomer", "Vakuoler", "Cellväggen"], 0, undefined, "Organeller"),
      q("Vilken celltyp saknar cellkärna?", ["Svampceller", "Prokaryota celler", "Växtceller", "Nervceller"], 1, "Bakterier är prokaryoter.", "Celltyper"),
      q("Vad är cellmembranets främsta funktion?", ["Fotosyntes", "Kontrollera vad som passerar in och ut", "Lagra DNA", "Bilda energi"], 1, undefined, "Organeller"),
      q("Vad kallas processen när en cell delar sig till två identiska celler?", ["Meios", "Mitos", "Osmos", "Diffusion"], 1, "Meios bildar könsceller.", "Celldelning"),
      q("Vad är osmos?", ["Vattens diffusion genom ett halvgenomsläppligt membran", "Celldelning", "Proteinsyntes", "Fotosyntes"], 0, undefined, "Transport"),
      q("Vad finns i cellkärnan?", ["Kloroplaster", "DNA", "Mitokondrier", "Cellvägg"], 1, undefined, "Organeller"),
    ],
  },
  {
    id: "andra-varldskriget",
    title: "Andra världskriget – orsaker och följder",
    description: "Från Versaillesfreden till FN. Fokus på orsakssamband, inte bara årtal.",
    subject: "historia",
    level: "Gymnasiet",
    creatorId: "jonas",
    updatedAt: "2026-09-14",
    status: "klar",
    plays: 15900,
    saves: 2780,
    tags: ["1900-talet", "Orsaker"],
    questions: [
      q("Vilket fredsavtal efter första världskriget skapade missnöje i Tyskland?", ["Versaillesfreden", "Westfaliska freden", "Wienkongressen", "Brest-Litovsk"], 0, "Krigsskadestånd och skuldklausul skapade bitterhet.", "Orsaker"),
      q("Vilket land anföll Tyskland 1 september 1939?", ["Frankrike", "Polen", "Sovjetunionen", "Norge"], 1, undefined, "Förlopp"),
      q("Vad var Molotov–Ribbentrop-pakten?", ["En fred mellan Storbritannien och Tyskland", "En icke-angreppspakt mellan Tyskland och Sovjet", "En allians mellan USA och Japan", "Ett handelsavtal med Sverige"], 1, "Den innehöll också en hemlig uppdelning av Östeuropa.", "Orsaker"),
      q("Vad hände i Pearl Harbor 1941?", ["Japan anföll USA:s flotta", "USA anföll Japan", "Krigsslut i Asien", "Tyskland kapitulerade"], 0, "Det fick USA att gå med i kriget.", "Förlopp"),
      q("Vilken organisation bildades 1945 för att förhindra nya krig?", ["NATO", "EU", "FN", "Nationernas förbund"], 2, undefined, "Följder"),
      q("Vad kallas det systematiska folkmordet på Europas judar?", ["Förintelsen", "Kristallnatten", "Blixtkriget", "Utrensningen"], 0, "Omkring sex miljoner judar mördades.", "Förintelsen"),
      q("Hur förhöll sig Sverige officiellt under kriget?", ["Allierad med Tyskland", "Neutralt", "Allierat med Storbritannien", "Ockuperat"], 1, "Neutralt, men med eftergifter som transiteringen.", "Sverige"),
      q("Vilket slag ses som en vändpunkt på östfronten?", ["Slaget om Storbritannien", "Slaget vid Stalingrad", "Slaget vid Midway", "D-dagen"], 1, undefined, "Förlopp"),
    ],
  },
  {
    id: "brak",
    title: "Bråk utan panik",
    description: "Förkorta, förlänga och jämföra bråk. Bilder i förklaringarna.",
    subject: "matematik",
    level: "Åk 4–6",
    creatorId: "linnea",
    updatedAt: "2026-09-20",
    status: "klar",
    plays: 8100,
    saves: 1340,
    tags: ["Bråk"],
    questions: [
      q("Vilket bråk är störst?", ["1/3", "1/4", "1/2", "1/5"], 2, "Ju färre delar, desto större bitar.", "Jämföra", 25),
      q("Förkorta 6/8", ["3/4", "2/3", "6/4", "1/2"], 0, "Dela täljare och nämnare med 2.", "Förkorta", 25),
      q("Vad är 1/2 + 1/4?", ["2/6", "3/4", "1/6", "2/4"], 1, "1/2 = 2/4, och 2/4 + 1/4 = 3/4.", "Addition", 30),
      q("Hur skrivs 0,25 som bråk?", ["1/25", "1/4", "2/5", "25/10"], 1, undefined, "Decimaltal", 25),
      q("Vilket är lika med 2/3?", ["4/6", "3/2", "2/6", "6/4"], 0, undefined, "Förlänga", 25),
      q("Hur mycket är 3/4 av 20?", ["12", "15", "16", "5"], 1, "20 / 4 = 5, och 5 · 3 = 15.", "Del av helhet", 30),
      q("Vad är 5/5?", ["0", "5", "1", "10"], 2, "Alla delar = en hel.", "Begrepp", 20),
      q("Vilket bråk ligger närmast 1?", ["7/8", "3/4", "1/2", "5/8"], 0, undefined, "Jämföra", 30),
    ],
  },
  {
    id: "musikhistoria",
    title: "Musikhistoria: från barock till pop",
    description: "Epoker, instrument och svenska exportsuccéer.",
    subject: "musik",
    level: "Åk 7–9",
    creatorId: "mikael",
    updatedAt: "2026-06-11",
    status: "klar",
    plays: 3920,
    saves: 540,
    tags: ["Epoker"],
    questions: [
      q("Vem komponerade ”De fyra årstiderna”?", ["Bach", "Vivaldi", "Mozart", "Beethoven"], 1, undefined, "Barock"),
      q("Vilken epok kom först?", ["Romantiken", "Barocken", "Wienklassicismen", "Modernismen"], 1, "Barock ca 1600–1750.", "Epoker"),
      q("Vilken grupp vann Eurovision 1974 med ”Waterloo”?", ["Roxette", "ABBA", "Ace of Base", "Europe"], 1, undefined, "Svensk musik"),
      q("Hur många linjer har ett notsystem?", ["Fyra", "Fem", "Sex", "Sju"], 1, undefined, "Musikteori"),
      q("Vilket instrument tillhör stråkfamiljen?", ["Klarinett", "Cello", "Trumpet", "Harpa"], 1, undefined, "Instrument"),
      q("Vilken svensk producent låg bakom många hits för Britney Spears och Taylor Swift?", ["Max Martin", "Avicii", "Benny Andersson", "Robyn"], 0, undefined, "Svensk musik"),
      q("Vad betyder ”forte”?", ["Snabbt", "Starkt", "Svagt", "Långsamt"], 1, undefined, "Musikteori"),
      q("Vilket land kommer blues ursprungligen från?", ["Brasilien", "USA", "England", "Jamaica"], 1, "Från afroamerikanska samhällen i södra USA.", "Genrer"),
    ],
  },
  {
    id: "kallkritik",
    title: "Källkritik på nätet",
    description: "Avsändare, syfte och hur du känner igen manipulerade bilder.",
    subject: "svenska",
    level: "Åk 7–9",
    creatorId: "klura",
    updatedAt: "2026-09-25",
    status: "klar",
    plays: 19870,
    saves: 3120,
    featured: true,
    tags: ["Källkritik", "MIK"],
    questions: [
      q("Vad är det första du bör kolla hos en källa?", ["Antal likes", "Vem som är avsändare", "Hur snygg sidan är", "Om den är lång"], 1, undefined, "Avsändare"),
      q("Vad betyder att en källa är tendentiös?", ["Den är gammal", "Den vill påverka åt ett visst håll", "Den är på engelska", "Den saknar bilder"], 1, undefined, "Syfte"),
      q("Hur kan du kontrollera var en bild först publicerades?", ["Omvänd bildsökning", "Zooma in", "Fråga en kompis", "Kolla filnamnet"], 0, undefined, "Bilder"),
      q("Vad är en primärkälla?", ["En källa från första hand", "Den första sökträffen", "En lärobok", "En Wikipedia-artikel"], 0, undefined, "Begrepp"),
      q("Varför är det bra att hitta samma uppgift i flera oberoende källor?", ["Det går snabbare", "Det stärker trovärdigheten", "Det är ett krav enligt lag", "Det är det inte"], 1, undefined, "Belägg"),
      q("Vad är ett typiskt tecken på clickbait?", ["Neutral rubrik", "Överdriven rubrik som lovar chock", "Tydlig avsändare", "Källhänvisningar"], 1, undefined, "Syfte"),
      q("Vad innebär ”tidskriteriet”?", ["Att källan måste vara från i år", "Att man bedömer hur tiden påverkar trovärdigheten", "Att man läser snabbt", "Att datum inte spelar roll"], 1, undefined, "Begrepp"),
      q("En AI-genererad bild …", ["är alltid märkt", "kan se helt verklig ut", "går inte att dela", "är alltid suddig"], 1, undefined, "Bilder"),
    ],
  },
];

export const ALL_QUIZZES = [...MY_QUIZZES, ...MARKET_QUIZZES];

export function estimateMinutes(quiz: Pick<Quiz, "questions">): number {
  const secs = quiz.questions.reduce((s, x) => s + x.time + 9, 0) + 60;
  return Math.max(3, Math.round(secs / 60));
}
