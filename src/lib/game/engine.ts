/**
 * Topptur – spelmotor.
 *
 * Ren TypeScript utan React- eller DOM-beroenden. Samma regler körs i
 * klienten (demoläge), på servern (rum i src/server) och i
 * balanssimuleringen (scripts/balans.ts).
 *
 *  - Rätt svar är den dominerande poängkällan (100 m per rätt).
 *  - Fart ger en liten bonus som avtar mjukt.
 *  - Fel svar ger aldrig minuspoäng.
 *  - Joker: en per match. Två felaktiga alternativ försvinner på en fråga.
 */

export type Energy = "lugn" | "standard" | "fullfart";

export const BASE_POINTS = 100;
export const STREAK_STEP = 10;
export const STREAK_CAP = 40;
export const FINAL_LEG_MULTIPLIER = 1.25;

export interface EnergyConfig {
  id: Energy;
  label: string;
  tagline: string;
  points: string[];
  timeFactor: number;
  speedBonusMax: number;
  /** Vad som visas på projektorn mellan etapper */
  legBoard: "klassen" | "topp5";
  /** Vad eleven ser om sin egen placering */
  studentRank: "personlig" | "ungefar" | "exakt";
  /** Hur många namn som visas på pallen i slutet */
  podium: number;
}

export const ENERGY: Record<Energy, EnergyConfig> = {
  lugn: {
    id: "lugn",
    label: "Lugn",
    tagline: "Fokus på egen progression",
    points: ["50 % längre betänketid", "Ingen topplista under matchen", "Eleven ser bara sin egen klättring", "Mjukare animationer"],
    timeFactor: 1.5,
    speedBonusMax: 8,
    legBoard: "klassen",
    studentRank: "personlig",
    podium: 3,
  },
  standard: {
    id: "standard",
    label: "Standard",
    tagline: "Balanserad tävling",
    points: ["Topp 5 visas mellan etapperna", "Elever ser ungefärlig placering", "Liten fartbonus", "Pallen visar fem namn"],
    timeFactor: 1,
    speedBonusMax: 20,
    legBoard: "topp5",
    studentRank: "ungefar",
    podium: 5,
  },
  fullfart: {
    id: "fullfart",
    label: "Full fart",
    tagline: "Mer tempo och dramatik",
    points: ["Topp 5 efter varje etapp", "Elever ser exakt placering", "Lite större fartbonus", "Kortare pauser"],
    timeFactor: 1,
    speedBonusMax: 25,
    legBoard: "topp5",
    studentRank: "exakt",
    podium: 5,
  },
};

/* ---------- Slump ---------- */

export type Rng = () => number;

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pick<T>(rng: Rng, list: readonly T[]): T {
  return list[Math.floor(rng() * list.length)];
}

export function shuffle<T>(rng: Rng, list: readonly T[]): T[] {
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function gaussian(rng: Rng): number {
  let u = 0;
  while (u === 0) u = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng());
}

/* ---------- Etapper ---------- */

export const LEG_NAMES = ["Skogen", "Kalfjället", "Toppen"] as const;

/** Delar upp n frågor i tre etapper, t.ex. 15 → [5,5,5], 11 → [4,4,3]. */
export function legSizes(n: number): number[] {
  const legs = n < 6 ? 1 : 3;
  const base = Math.floor(n / legs);
  const rest = n % legs;
  return Array.from({ length: legs }, (_, i) => base + (i < rest ? 1 : 0));
}

export function legOfQuestion(n: number, qIndex: number): number {
  const sizes = legSizes(n);
  let acc = 0;
  for (let i = 0; i < sizes.length; i++) {
    acc += sizes[i];
    if (qIndex < acc) return i;
  }
  return sizes.length - 1;
}

export function isLegEnd(n: number, qIndex: number): boolean {
  const sizes = legSizes(n);
  let acc = 0;
  for (const s of sizes) {
    acc += s;
    if (qIndex === acc - 1) return true;
  }
  return false;
}

/* ---------- Poäng ---------- */

export function speedBonus(timeUsed: number, timeLimit: number, max: number): number {
  if (timeLimit <= 0 || max <= 0) return 0;
  const f = Math.min(1, Math.max(0, timeUsed / timeLimit));
  // Full bonus under första fjärdedelen, sedan linjärt ned till 0.
  const k = f <= 0.25 ? 1 : Math.max(0, (1 - f) / 0.75);
  return Math.round(max * k);
}

export function streakBonus(streakAfter: number): number {
  return Math.min(STREAK_CAP, Math.max(0, streakAfter - 1) * STREAK_STEP);
}

export interface Breakdown {
  base: number;
  speed: number;
  streak: number;
  multiplier: number;
}

export interface AnswerRecord {
  q: number;
  option: number | null;
  correct: boolean;
  time: number;
  points: number;
  breakdown: Breakdown;
  joker?: boolean;
}

export interface PlayerState {
  id: string;
  name: string;
  skinId: string;
  isBot?: boolean;
  profile?: BotProfile;
  score: number;
  streak: number;
  bestStreak: number;
  correct: number;
  answered: number;
  jokerUsed: boolean;
  answers: AnswerRecord[];
  legCorrect: number[];
}

export function newPlayer(id: string, name: string, skinId: string, extra?: Partial<PlayerState>): PlayerState {
  return {
    id,
    name,
    skinId,
    score: 0,
    streak: 0,
    bestStreak: 0,
    correct: 0,
    answered: 0,
    jokerUsed: false,
    answers: [],
    legCorrect: [0, 0, 0],
    ...extra,
  };
}

export interface ScoreInput {
  correct: boolean;
  time: number;
  timeLimit: number;
  energy: Energy;
  finalLeg: boolean;
  legIndex: number;
  joker?: boolean;
}

export function applyAnswer(p: PlayerState, qIndex: number, option: number | null, input: ScoreInput): AnswerRecord {
  const cfg = ENERGY[input.energy];
  const multiplier = input.finalLeg ? FINAL_LEG_MULTIPLIER : 1;
  const b: Breakdown = { base: 0, speed: 0, streak: 0, multiplier };
  if (input.correct) {
    p.streak += 1;
    p.bestStreak = Math.max(p.bestStreak, p.streak);
    p.correct += 1;
    p.legCorrect[input.legIndex] = (p.legCorrect[input.legIndex] ?? 0) + 1;
    b.base = BASE_POINTS;
    // Joker ger rätt-poäng men ingen fartbonus
    b.speed = input.joker ? 0 : speedBonus(input.time, input.timeLimit, cfg.speedBonusMax);
    b.streak = streakBonus(p.streak);
  } else {
    p.streak = 0;
  }
  const points = Math.round((b.base + b.speed + b.streak) * multiplier);
  p.score += points;
  p.answered += 1;
  const rec: AnswerRecord = { q: qIndex, option, correct: input.correct, time: input.time, points, breakdown: b, joker: input.joker };
  p.answers.push(rec);
  return rec;
}

/** Två felaktiga alternativ att ta bort med Joker. */
export function jokerRemoves(rng: Rng, options: number, correct: number): number[] {
  const wrong = Array.from({ length: options }, (_, i) => i).filter((i) => i !== correct);
  return shuffle(rng, wrong).slice(0, Math.min(2, Math.max(0, options - 2)));
}

/* ---------- Ranking ---------- */

export function ranked<T extends { score: number; correct: number; name: string }>(players: T[]): T[] {
  return players.slice().sort((a, b) => b.score - a.score || b.correct - a.correct || a.name.localeCompare(b.name, "sv"));
}

export function rankOf(players: PlayerState[], id: string): number {
  return ranked(players).findIndex((p) => p.id === id) + 1;
}

/** Hur placering beskrivs för eleven. Undviker att peka ut "botten". */
export function positionHint(
  rank: number,
  total: number,
  prevRank: number | null,
  gapUp: number | null,
  mode: EnergyConfig["studentRank"],
): { title: string; detail: string } {
  const climbed = prevRank !== null ? prevRank - rank : 0;
  const climbedText = climbed > 0 ? `Du klättrade ${climbed} ${climbed === 1 ? "plats" : "platser"}` : null;
  const gapText = gapUp !== null && gapUp > 0 ? `${gapUp} m upp till nästa plats` : null;
  if (mode === "exakt") {
    return { title: `Plats ${rank} av ${total}`, detail: climbedText ?? gapText ?? (rank === 1 ? "Du leder" : "Håll kursen") };
  }
  if (mode === "ungefar") {
    const pct = rank / total;
    if (rank <= 3) return { title: "Bland de tre främsta", detail: climbedText ?? "Starkt jobbat" };
    if (pct <= 0.2) return { title: "Topp 20 %", detail: climbedText ?? gapText ?? "Du ligger bra till" };
    if (pct <= 0.5) return { title: "Övre halvan", detail: climbedText ?? gapText ?? "Fortsätt så" };
    return { title: climbed > 0 ? "Du klättrar" : "Fortsätt klättra", detail: climbedText ?? gapText ?? "Varje rätt svar räknas" };
  }
  return { title: climbed > 0 ? "Du klättrar" : "Din egen tur", detail: "Ingen topplista i lugnt läge – fokus på din egen höjd" };
}

/* ---------- Bottar / simulerade spelare ---------- */

export interface BotProfile {
  /** Observerad träffsäkerhet (0–1) på en medelsvår fråga */
  accuracy: number;
  /** Typisk svarstid som andel av tidsgränsen (0–1) */
  pace: number;
  /** Spridning i svarstid */
  jitter: number;
}

export interface QuestionMeta {
  options: number;
  correct: number;
  time: number;
  /** -0.2 (lätt) … +0.2 (svår) */
  difficulty?: number;
}

export function botAnswer(
  rng: Rng,
  prof: BotProfile,
  q: QuestionMeta,
  opts: { timeLimit: number; removed?: number[] },
): { option: number | null; time: number; knew: boolean } {
  const n = q.options;
  const guess = 1 / n;
  const pKnow = Math.min(0.99, Math.max(0, (prof.accuracy - guess) / (1 - guess) - (q.difficulty ?? 0)));
  const knows = rng() < pKnow;
  let option: number;
  if (knows) option = q.correct;
  else {
    const pool = Array.from({ length: n }, (_, i) => i).filter((i) => !opts.removed?.includes(i));
    option = pick(rng, pool);
  }
  const pace = prof.pace * (knows ? 1 : 1.25);
  const t = opts.timeLimit * Math.max(0.06, pace * Math.exp(gaussian(rng) * prof.jitter));
  if (t >= opts.timeLimit) return { option: null, time: opts.timeLimit, knew: knows };
  return { option, time: Math.round(t * 10) / 10, knew: knows };
}

/* ---------- Hel match (simulering & historik) ---------- */

export interface SimPlayer {
  id: string;
  name: string;
  skinId: string;
  profile: BotProfile;
}

export interface SimResult {
  players: PlayerState[];
  distribution: number[][];
  unanswered: number[];
}

export function simulateMatch(seed: number, sim: SimPlayer[], questions: QuestionMeta[], energy: Energy): SimResult {
  const rng = mulberry32(seed);
  const cfg = ENERGY[energy];
  const players = sim.map((s) => newPlayer(s.id, s.name, s.skinId, { profile: s.profile, isBot: true }));
  const n = questions.length;
  const distribution = questions.map((q) => Array(q.options).fill(0));
  const unanswered = questions.map(() => 0);
  const sizes = legSizes(n);

  questions.forEach((q, qi) => {
    const leg = legOfQuestion(n, qi);
    const limit = q.time * cfg.timeFactor;
    for (const p of players) {
      // Joker: används en gång, oftast på en fråga man är osäker på
      let removed: number[] | undefined;
      let joker = false;
      if (!p.jokerUsed && q.options > 2 && rng() < 0.12 + (qi / n) * 0.25) {
        removed = jokerRemoves(rng, q.options, q.correct);
        joker = true;
        p.jokerUsed = true;
      }
      const ans = botAnswer(rng, p.profile!, q, { timeLimit: limit, removed });
      if (ans.option === null) unanswered[qi]++;
      else distribution[qi][ans.option]++;
      applyAnswer(p, qi, ans.option, {
        correct: ans.option === q.correct,
        time: ans.time,
        timeLimit: limit,
        energy,
        finalLeg: sizes.length > 1 && leg === sizes.length - 1,
        legIndex: leg,
        joker,
      });
    }
  });
  return { players, distribution, unanswered };
}
