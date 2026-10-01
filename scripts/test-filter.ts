import { checkName } from "../src/lib/moderation/index.ts";

const BLOCK = [
  "nigger", "N1GG3R", "n i g g a", "n.i.g.g.a", "niiiigga", "nigga123", "niqqa", "nibba", "negerboll", "Neger",
  "nígga", "ńigger", "niggaz", "nygga", "Negro", "neeeger", "NIG", "n1g", "svartskalle", "blatte",
  "fitta", "f1tta", "fiiitta", "f i t t a", "fittan99", "kuk", "KUK", "kukmannen", "storkuk", "k.u.k", "кuk",
  "hora", "h0ra", "horunge", "knulla", "runkare", "jävla", "j4vla", "helvete", "rövhål", "bög", "bögjävel",
  "fuck", "fvck", "f*ck you", "FuCk", "phuck", "motherfucker", "cunt", "pussy", "dick", "d1ck", "cock",
  "bitch", "b1tch", "biatch", "whore", "slut", "porn", "porr", "sexy", "69", "anal", "penis", "boobs",
  "asshole", "a$$hole", "ass", "shit", "sh1t", "bullshit", "retard", "mongo", "faggot", "tranny",
  "hitler", "H1tler", "nazi", "nazist", "heil", "sieg heil", "1488", "Kalle 88", "kkk", "whitepower",
  "kahba", "sharmuta", "orospu", "siktir", "blyat", "kurwa", "pidor", "pička",
  "killyourself", "skolskjut", "pedofil", "våldtäkt", "fetto", "idiot",
];

const ALLOW = [
  "Niklas", "Signe", "Assar", "Lukas", "Veronika", "Annalena", "Amina", "Nazir", "Thora", "Hassan", "Therese",
  "Kassandra", "Fanny", "Sixten", "Lasse", "Benedikt", "Montenegro", "Nigella", "Nikita", "Dickens", "Horst",
  "Snabb Kotte", "Klok Kotte", "klass", "Glass", "Kyss", "Slutspurt", "Titan", "Puss", "Pussel", "Kanal",
  "Analys", "Pitbull", "Arsenal", "Mongoliet", "Elsa", "Saga", "Ali", "Omar", "Ibrahim", "Yusuf",
  "Matteo", "Vincent", "Alva", "Wilma", "Ebba", "Hugo", "Elias", "Maja", "Freja", "Liam", "Noah", "Selma",
  "Agnes", "Ines", "Mira", "Tuva", "Ella", "Theo", "Milo", "Nils", "Leo", "Oscar", "Isak", "Edvin", "Vera",
  "Juni", "Tilde", "Ludvig", "Malte", "Viggo", "Arvid", "Sixten", "Ellen", "Hanna", "Klara", "Kim", "Sam",
  "Dani", "Jonas", "Simon", "Sara", "Emil", "Anton", "Hampus", "Linnea", "Moa", "Stina", "Ronja", "Vilgot",
  "Kevin", "Dennis", "Cassandra", "Jessica", "Ester", "Sixtus", "Mahmoud", "Ahmed", "Fatima", "Zeynep",
  "Nikolai", "Dominik", "Patrik", "Fredrik", "Henrik", "Erik", "Ulrik", "Doris", "Horace", "Lisa",
];

let fails = 0;
for (const w of BLOCK) {
  if (checkName(w).ok) {
    console.log("SLAPP IGENOM (borde blockeras):", w);
    fails++;
  }
}
for (const w of ALLOW) {
  const r = checkName(w);
  if (!r.ok) {
    console.log("FALSKLARM (borde tillåtas):", w);
    fails++;
  }
}
console.log(`${BLOCK.length} blockeringsfall, ${ALLOW.length} tillåtna fall – ${fails} fel`);
process.exit(fails ? 1 : 0);
