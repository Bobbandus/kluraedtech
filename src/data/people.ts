import { mulberry32, pick, shuffle, type BotProfile, type SimPlayer } from "@/lib/game/engine";
import { SKINS } from "./skins";
import { checkName } from "@/lib/moderation";

export const FIRST_NAMES = [
  "Alva", "Elsa", "Wilma", "Ebba", "Saga", "Maja", "Ella", "Nora", "Freja", "Alice",
  "Leah", "Selma", "Amira", "Iris", "Tuva", "Hanna", "Lova", "Agnes", "Signe", "Juni",
  "Liam", "Noah", "Hugo", "Elias", "Oscar", "Lucas", "William", "Adam", "Ali", "Vincent",
  "Leo", "Theo", "Melvin", "Ibrahim", "Arvid", "Viggo", "Malte", "Ludvig", "Yusuf", "Sixten",
  "Nils", "Edvin", "Omar", "Isak", "Milo", "Matteo", "Ines", "Mira", "Tilde", "Vera",
];

const ADJ = ["Snabb", "Lugn", "Klok", "Modig", "Listig", "Glad", "Tyst", "Stark", "Envis", "Smart", "Kvick", "Sval", "Vild", "Nyfiken"];
const NOUN = ["Kotte", "Lodjur", "Älg", "Bulle", "Komet", "Uggla", "Fjällräv", "Mås", "Abborre", "Mygga", "Björn", "Lingon", "Hjortron", "Isbit", "Igelkott", "Järv"];

export function randomNickname(rng: () => number = Math.random): string {
  return `${pick(rng, ADJ)} ${pick(rng, NOUN)}`;
}

export function nicknameProblem(name: string): string | null {
  const r = checkName(name);
  return r.ok ? null : r.reason ?? "Välj ett annat namn.";
}

export interface ClassGroup {
  id: string;
  name: string;
  students: number;
  subject: string;
}

export const CLASSES: ClassGroup[] = [
  { id: "8b", name: "8B", students: 27, subject: "SO" },
  { id: "9a", name: "9A", students: 28, subject: "SO" },
  { id: "8d", name: "8D", students: 24, subject: "NO" },
  { id: "ma9", name: "Matte 9 – grupp 2", students: 18, subject: "Matematik" },
];

/** Skapar en simulerad klass med spridd kunskapsnivå och tempo. */
export function makeClassmates(seed: number, count: number, exclude: string[] = []): SimPlayer[] {
  const rng = mulberry32(seed);
  const names = shuffle(rng, FIRST_NAMES.filter((n) => !exclude.includes(n))).slice(0, count);
  const skins = SKINS.filter((s) => s.unlock.kind !== "plus").map((s) => s.id);
  // Några klasskamrater har också Pionjären – alla som är med nu får den

  return names.map((name, i) => {
    const r = rng();
    const profile: BotProfile = {
      accuracy: 0.45 + Math.pow(r, 0.8) * 0.48,
      pace: 0.28 + rng() * 0.4,
      jitter: 0.25 + rng() * 0.15,
    };
    // Några som bara klickar fort
    if (i % 9 === 4) {
      profile.pace = 0.12;
      profile.accuracy = Math.min(profile.accuracy, 0.68);
    }
    return { id: `p-${name}-${i}`, name, skinId: skins[Math.floor(rng() * skins.length)], profile };
  });
}
