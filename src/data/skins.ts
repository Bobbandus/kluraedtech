export type Rarity = "vanlig" | "ovanlig" | "sallsynt" | "episk" | "legendarisk";

export const RARITY: Record<Rarity, { label: string; color: string; tint: string }> = {
  vanlig: { label: "Vanlig", color: "var(--r-vanlig)", tint: "#eef0ef" },
  ovanlig: { label: "Ovanlig", color: "var(--r-ovanlig)", tint: "#e1f5ea" },
  sallsynt: { label: "Sällsynt", color: "var(--r-sallsynt)", tint: "#e5eefb" },
  episk: { label: "Episk", color: "var(--r-episk)", tint: "#efe9fb" },
  legendarisk: { label: "Legendarisk", color: "var(--r-legendarisk)", tint: "#fff1dc" },
};

export type Unlock =
  | { kind: "start" }
  | { kind: "gnistor"; price: number }
  | { kind: "niva"; level: number }
  | { kind: "bedrift"; text: string }
  | { kind: "plus" };

export interface Skin {
  id: string;
  name: string;
  rarity: Rarity;
  unlock: Unlock;
  blurb: string;
}

export const SKINS: Skin[] = [
  { id: "kisel", name: "Kisel", rarity: "vanlig", unlock: { kind: "start" }, blurb: "Säger inte mycket. Svarar rätt ändå." },
  { id: "mosse", name: "Mosse", rarity: "vanlig", unlock: { kind: "start" }, blurb: "Växer lite för varje rätt svar." },
  { id: "kotte", name: "Kotte", rarity: "vanlig", unlock: { kind: "start" }, blurb: "Föll från en tall. Landade på fötterna." },
  { id: "bullen", name: "Bullen", rarity: "ovanlig", unlock: { kind: "gnistor", price: 300 }, blurb: "Pärlsocker och fullt fokus." },
  { id: "isbiten", name: "Isbiten", rarity: "ovanlig", unlock: { kind: "gnistor", price: 300 }, blurb: "Kall i huvudet när tiden rinner ut." },
  { id: "molnet", name: "Molnet", rarity: "ovanlig", unlock: { kind: "gnistor", price: 350 }, blurb: "Lätt som en fjäder, tung på fakta." },
  { id: "taggen", name: "Taggen", rarity: "ovanlig", unlock: { kind: "niva", level: 5 }, blurb: "Klarar torka. Och algebra." },
  { id: "flugis", name: "Flugis", rarity: "sallsynt", unlock: { kind: "gnistor", price: 650 }, blurb: "Snygg att titta på. Ät inte." },
  { id: "kassetten", name: "Kassetten", rarity: "sallsynt", unlock: { kind: "gnistor", price: 700 }, blurb: "Spolar tillbaka till rätt svar." },
  { id: "malen", name: "Malen", rarity: "sallsynt", unlock: { kind: "gnistor", price: 650 }, blurb: "Dras till ljuset. Och till kunskap." },
  { id: "lyktan", name: "Lyktan", rarity: "sallsynt", unlock: { kind: "bedrift", text: "Svara rätt 10 gånger i rad" }, blurb: "Lyser upp även de svåraste frågorna." },
  { id: "blackis", name: "Bläckis", rarity: "sallsynt", unlock: { kind: "gnistor", price: 750 }, blurb: "Åtta armar, åtta svarsalternativ." },
  { id: "raven", name: "Räven", rarity: "episk", unlock: { kind: "gnistor", price: 1200 }, blurb: "Listig, men spelar alltid rent." },
  { id: "kristallen", name: "Kristallen", rarity: "episk", unlock: { kind: "gnistor", price: 1300 }, blurb: "Kristallklar logik." },
  { id: "dala", name: "Dala", rarity: "episk", unlock: { kind: "niva", level: 15 }, blurb: "Snidad i Mora, tränad på fjället." },
  { id: "kometen", name: "Kometen", rarity: "episk", unlock: { kind: "plus" }, blurb: "Syns bara en gång per lektion." },
  { id: "solen", name: "Solen", rarity: "episk", unlock: { kind: "plus" }, blurb: "Midnattssol. Aldrig trött." },
  { id: "fjallis", name: "Fjällis", rarity: "legendarisk", unlock: { kind: "bedrift", text: "Nå toppen i 10 matcher" }, blurb: "Ett fjällväsen med pannlampa." },
  { id: "norrsken", name: "Norrsken", rarity: "legendarisk", unlock: { kind: "bedrift", text: "Svara rätt på 500 frågor" }, blurb: "Bara de mest uthålliga har sett den." },
  { id: "tomten", name: "Tomten", rarity: "legendarisk", unlock: { kind: "gnistor", price: 2500 }, blurb: "Vaktar gården. Och din rad." },
];

export const skinById = (id: string) => SKINS.find((s) => s.id === id) ?? SKINS[0];

export const STARTER_SKINS = SKINS.filter((s) => s.unlock.kind === "start").map((s) => s.id);
