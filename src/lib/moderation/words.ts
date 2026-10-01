/**
 * Ordlistor för namnfiltret. Matchning sker efter normalisering
 * (gemener, leetspeak → bokstäver, utan separatorer, upprepade bokstäver
 * kollapsade). Se index.ts.
 *
 * SUBSTRING – entydiga ord som blockeras även inuti andra ord.
 *             Ord som blir kortare än 4 tecken efter normalisering flyttas
 *             automatiskt till hel-ords-matchning.
 * WORD      – korta eller tvetydiga ord: bara som hela ord.
 * AFFIX     – blockeras även i början/slutet av ett ihopskrivet namn.
 * ALLOW     – vanliga namn/ord som annars skulle ge falsklarm.
 *
 * Testfall finns i scripts/test-filter.ts – kör `npm run test:filter`
 * efter ändringar.
 */

export const SUBSTRING: string[] = [
  // Rasistiska ord, inkl. stavningsvarianter av n-ordet
  "nigger", "niger", "nigga", "niggah", "niggaz", "nigguh", "niggur", "niglet", "nigglet", "nigr", "nigz", "nibba",
  "niqqa", "niqqer", "nyger", "nygga", "neger", "neeger", "negerboll", "negerjävel", "negro", "negrer",
  "svartskalle", "blatte", "blattar", "kanacke", "kanaken", "kanakjävel", "zigenarjävel", "arabjävel",
  "judejävel", "judesvin", "kike", "spic", "wetback", "chink", "gook", "raghead", "towelhead", "sandnig",
  "porchmonkey", "junglebunny", "apjävel", "halvblod", "rasfrämling",
  // Nazism och hat
  "hitler", "siegheil", "seigheil", "heilhitler", "nazist", "kukluxklan", "whitepower", "whitepride",
  "gaschamber", "gaskammare", "auschwitz", "zyklon", "ariskras", "hakkors", "swastika",
  "nordiskamotstånd", "nordiskamotstand",
  // Homofobi och transfobi
  "faggot", "bögjävel", "bögfan", "bögunge", "bögsvin", "bögäckel", "flatjävel", "homojävel", "tranny", "shemale",
  // Funkofobi
  "retard", "efterbliven", "cpunge", "cpjävel", "autistjävel", "mongoljävel",
  // Sexuellt (svenska)
  "fitta", "fittan", "fittor", "fitthuvud", "fittmun", "fittlapp", "kuken", "kukjävel", "kuksugare", "kuksug",
  "sugkuk", "kukhuvud", "kukhuve", "knulla", "knullar", "knullad", "knull", "runka", "runkar", "runkare",
  "hora", "horan", "horor", "horunge", "slyna", "luder", "fnask", "sexslav", "våldtäkt", "valdtakt", "våldta",
  "valdta", "pedofil", "barnporr", "analsex", "dildo", "bröstvårt", "kåtunge", "pattar", "tuttar", "rövhål",
  "rovhal", "sperma", "pungjävel", "mammaknullare", "knulladinmamma", "dinmammahora", "mammahora",
  // Sexuellt (engelska)
  "fuck", "fvck", "phuck", "motherfuck", "cunt", "cock", "dick", "pussy", "penis", "vagina", "boobs", "tits",
  "titty", "titties", "blowjob", "handjob", "cumshot", "orgasm", "horny", "porn", "milf", "butthole", "asshole",
  "arsehole", "rimjob", "deepthroat", "whore", "skank", "thot", "bitch", "biatch", "raping", "rapist", "molest",
  "pedophile", "paedo", "nudes", "naked", "sexy", "boner", "erection", "testicle", "scrotum", "ballsack",
  "nutsack", "wank", "jerkoff",
  // Svordomar och förolämpningar (svenska)
  "jävla", "javla", "jävel", "djävul", "helvete", "skitstövel", "skitstovel", "skithög", "skitunge", "skitjävel",
  "idiot", "idjot", "dumfan", "rövhatt", "rovhatt", "arsel", "hororsunge", "äckelunge", "fetto", "fetknopp",
  // Svordomar och förolämpningar (engelska)
  "shit", "bullshit", "dumbass", "jackass", "dipshit", "douche", "bastard", "goddamn", "pissoff", "twat",
  "bellend", "knobhead", "dickhead", "motherfucker", "sonofabitch", "suckmy", "killyourself", "diebitch",
  // Våld och droger
  "dödadig", "dodadig", "skjutdig", "massmord", "skolskjut", "schoolshoot", "terrorist", "jihad", "kokain",
  "cocaine", "hasch", "ganja",
  // Grova ord från andra språk som är vanliga i skolslang
  "kahba", "kahbe", "qahba", "sharmuta", "sharmota", "charmuta", "sharmouta", "manyak", "manyok", "orospu",
  "siktir", "sikerim", "aminakoyim", "kussomak", "kusomak", "zamel", "zemel", "pidar", "pidor", "pidaras",
  "blyat", "kurwa", "jebem", "jebote", "pička", "kurac", "qifsha", "qirje", "pendejo", "maricon", "cabron",
];

export const WORD: string[] = [
  "kuk", "fan", "ass", "arse", "hor", "nig", "nigs", "neg", "bög", "bögar", "röv", "pung", "flata", "lebb",
  "homo", "fag", "fags", "tit", "cum", "jizz", "fuk", "fck", "fap", "cok", "dik", "nazi", "nazis", "heil", "sieg",
  "88", "1488", "sex", "porr", "pitt", "piss", "skit", "hoe", "slut", "rape", "cp", "mong", "mongo", "mongol",
  "spast", "spasti", "pucko", "anal", "anus", "pedo", "paki", "puta", "puto", "amk", "ayre", "ayri", "zebi",
  "cyka", "suka", "kåt", "porno", "xxx", "69", "kkk", "isis", "weed", "meth", "crack", "bomba", "damn",
  "dum", "fet", "fetto", "jude", "turk", "arab", "zigge", "zigenare", "gay", "lesbo",
];

export const AFFIX: string[] = ["kuk", "fuk", "fitt", "bög", "röv", "porr", "hora", "nigg", "neger", "cum"];

export const ALLOW: string[] = [
  "assar", "kassandra", "basse", "klass", "glass", "massa", "kassa", "passa", "lasse", "tassa",
  "niklas", "nikita", "nigeria", "nigella", "signe", "signar", "montenegro", "montenegrin", "veronika",
  "analys", "kanal", "banal", "annalena", "dikt", "diktator", "benedikt", "kukumber", "kukeluk", "kukkonen",
  "sexton", "sextio", "sexa", "sextant", "essex", "sussex", "fantasy", "fantastisk", "fanny", "fanni", "fanta",
  "titan", "titanic", "titta", "tittar", "titel", "cumulus", "dokument", "scunthorpe", "horatio", "horace",
  "thora", "thorald", "skitig", "therapist", "grape", "drape", "scrape", "cockatoo", "hitchcock", "peacock",
  "dickens", "dickinson", "pussel", "pussla", "rovfågel", "rovdjur", "pungdjur", "spicy", "kikare",
  "honor", "horn", "hormon", "horisont", "horst", "pitta", "pitbull", "pittsburgh", "arsenal", "arsenik",
  "marseille", "sushi", "shitake", "shiitake", "fetaost", "fetma", "dumbo", "dumle", "assistent",
  "amina", "nazir", "nazim", "nazira", "slutet", "slutspurt", "slutsats", "kyss", "kyssa",
  "idiotsäker", "hasse", "hassan", "therese", "pidgin", "sikta", "mongolia", "mongoliet",
];
