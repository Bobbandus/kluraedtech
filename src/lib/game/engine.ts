/**
 * Topptur — spelmotor.
 *
 * Ren TypeScript utan React-beroenden så att samma regler kan köras i
 * klienten, i balanssimuleringen (scripts/balans.ts) och senare på en server.
 *
 * Designprinciper:
 *  - Rätt svar är den dominerande poängkällan (100 m per rätt).
 *  - Fart ger en liten bonus som avtar mjukt. Rätt efter 7 s av 20 s ger
 *    nästan lika mycket som rätt efter 2 s.
 *  - Fel svar ger aldrig minuspoäng.
 *  - Spelkort påverkar framtiden, aldrig någons redan intjänade höjd.
 *    Varje korts maxeffekt är begränsad till några procent av en matchs total.
 */

export type Energy = "lugn" | "standard" | "fullfart";
export type CardId = "skold" | "medvind" | "fokus" | "andrum" | "duell" | "kapa";

export const BASE_POINTS = 100;
export const STREAK_STEP = 10;
export const STREAK_CAP = 40;
export const FINAL_LEG_MULTIPLIER = 1.25;
export const MEDVIND_BONUS = 30;
export const MEDVIND_USES = 3;
export const DUEL_WIN = 80;
export const DUEL_TIE = 40;
export const KAPA_SHARE = 0.5;
export const KAPA_CAP = 60;
export const ANDRUM_FACTOR = 1.5;
export const ANDRUM_QUESTIONS = 5;

export interface EnergyConfig {
  id: Energy;
  label: string;
  tagline: string;
  points: string[];
  timeFactor: number;
  speedBonusMax: number;
  cards: CardId[];
  /** Vad som visas på projektorn mellan etapper */
  legBoard: "klassen" | "topp5";
  /** Vad eleven ser om sin egen placering mellan etapper */
  studentRank: "personlig" | "ungefar" | "exakt";
  /** Hur många namn som visas på projektorn i slutet */
  podium: number;
}

export const ENERGY: Record<Energy, EnergyConfig> = {
  lugn: {
    id: "lugn",
    label: "Lugn",
    tagline: "Fokus på egen progression",
    points: [
      "50 % längre betänketid",
      "Ingen topplista under matchen",
      "Inga dueller eller kapningar",
      "Mjukare animationer",
    ],
    timeFactor: 1.5,
    speedBonusMax: 8,
    cards: ["skold", "medvind", "fokus", "andrum"],
    legBoard: "klassen",
    studentRank: "personlig",
    podium: 3,
  },
  standard: {
    id: "standard",
    label: "Standard",
    tagline: "Balanserad tävling",
    points: [
      "Topp 5 visas mellan etapperna",
      "Elever ser ungefärlig placering",
      "Dueller mot någon nära dig",
      "Liten fartbonus",
    ],
    timeFactor: 1,
    speedBonusMax: 20,
    cards: ["skold", "medvind", "fokus", "andrum", "duell"],
    legBoard: "topp5",
    studentRank: "ungefar",
    podium: 5,
  },
  fullfart: {
    id: "fullfart",
    label: "Full fart",
    tagline: "Mer tempo och direkt interaktion",
    points: [
      "Topp 5 efter varje etapp",
      "Elever ser exakt placering",
      "Dueller och kapningar",
      "Lite större fartbonus",
    ],
    timeFactor: 1,
    speedBonusMax: 25,
    cards: ["skold", "medvind", "fokus", "duell", "kapa"],
    legBoard: "topp5",
    studentRank: "exakt",
    podium: 5,
  },
};

export interface CardDef {
  id: CardId;
  name: string;
  short: string;
  description: string;
}

export const CARDS: Record<CardId, CardDef> = {
  skold: {
    id: "skold",
    name: "Sköld",
    short: "Behåll raden vid ett fel",
    description: "Nästa gång du svarar fel bryts inte din rad. Bra om du har en lång rad att skydda.",
  },
  medvind: {
    id: "medvind",
    name: "Medvind",
    short: `+${MEDVIND_BONUS} m på 3 rätta svar`,
    description: `Dina tre nästa rätta svar ger +${MEDVIND_BONUS} m extra var. Fungerar bara om du svarar rätt.`,
  },
  fokus: {
    id: "fokus",
    name: "Fokus",
    short: "Ta bort ett fel alternativ",
    description: "Använd när du vill under etappen. Ett felaktigt svarsalternativ försvinner.",
  },
  andrum: {
    id: "andrum",
    name: "Andrum",
    short: "50 % mer tid i fem frågor",
    description: "Du får längre betänketid på etappens frågor utan att tappa fartbonus.",
  },
  duell: {
    id: "duell",
    name: "Duell",
    short: `Flest rätt i etappen: +${DUEL_WIN} m`,
    description: `Du möter någon med ungefär samma höjd. Flest rätt under etappen vinner +${DUEL_WIN} m. Lika ger +${DUEL_TIE} m var. Ingen förlorar något.`,
  },
  kapa: {
    id: "kapa",
    name: "Kapa",
    short: "Ta halva radbonusen från den ovanför",
    description: `Under etappen får du hälften av radbonusen som spelaren precis ovanför dig tjänar (max ${KAPA_CAP} m). Påverkar aldrig redan intjänad höjd.`,
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

function gaussian(rng: Rng): number {
  let u = 0;
  while (u === 0) u = rng();
  const v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
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
  // Full bonus under första fjärdedelen, sedan linjärt ned till 0 vid tidens slut.
  const k = f <= 0.25 ? 1 : Math.max(0, (1 - f) / 0.75);
  return Math.round(max * k);
}

export function streakBonus(streakAfter: number): number {
  return Math.min(STREAK_CAP, Math.max(0, streakAfter - 1) * STREAK_STEP);
}

export interface ActiveCard {
  id: CardId;
  /** Kvarvarande användningar för medvind/sköld/fokus/andrum */
  uses: number;
  /** Duell-motståndare eller kapnings-mål */
  targetId?: string;
  /** Kapat hittills (för tak) */
  gained?: number;
  legIndex: number;
}

export interface AnswerRecord {
  q: number;
  option: number | null;
  correct: boolean;
  time: number;
  points: number;
  breakdown: Breakdown;
}

export interface Breakdown {
  base: number;
  speed: number;
  streak: number;
  card: number;
  multiplier: number;
}

export interface PlayerState {
  id: string;
  name: string;
  skinId: string;
  isYou?: boolean;
  profile?: BotProfile;
  score: number;
  streak: number;
  bestStreak: number;
  correct: number;
  answered: number;
  card?: ActiveCard;
  usedCards: CardId[];
  answers: AnswerRecord[];
  legCorrect: number[];
  bonusLog: { reason: string; points: number; legIndex: number }[];
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
    usedCards: [],
    answers: [],
    legCorrect: [0, 0, 0],
    bonusLog: [],
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
}

/** Applicerar ett svar på en spelare. Returnerar posten som lades till. */
export function applyAnswer(
  p: PlayerState,
  qIndex: number,
  option: number | null,
  input: ScoreInput,
): AnswerRecord {
  const cfg = ENERGY[input.energy];
  const card = p.card;
  const andrumActive = card?.id === "andrum" && card.uses > 0;
  const effectiveLimit = andrumActive ? input.timeLimit * ANDRUM_FACTOR : input.timeLimit;
  const multiplier = input.finalLeg ? FINAL_LEG_MULTIPLIER : 1;
  const b: Breakdown = { base: 0, speed: 0, streak: 0, card: 0, multiplier };

  if (andrumActive && card) card.uses -= 1;

  if (input.correct) {
    p.streak += 1;
    p.bestStreak = Math.max(p.bestStreak, p.streak);
    p.correct += 1;
    b.base = BASE_POINTS;
    b.speed = speedBonus(input.time, effectiveLimit, cfg.speedBonusMax);
    b.streak = streakBonus(p.streak);
    if (card?.id === "medvind" && card.uses > 0) {
      b.card = MEDVIND_BONUS;
      card.uses -= 1;
    }
    p.legCorrect[input.legIndex] = (p.legCorrect[input.legIndex] ?? 0) + 1;
  } else {
    if (card?.id === "skold" && card.uses > 0 && p.streak > 0) {
      card.uses -= 1; // raden lever vidare
    } else {
      p.streak = 0;
    }
  }

  const points = Math.round((b.base + b.speed + b.streak + b.card) * multiplier);
  p.score += points;
  p.answered += 1;
  const rec: AnswerRecord = { q: qIndex, option, correct: input.correct, time: input.time, points, breakdown: b };
  p.answers.push(rec);
  return rec;
}

/** Kapning: efter att alla svarat på en fråga flyttas del av radbonus framåt. */
export function resolveKapa(players: PlayerState[], qIndex: number): { thiefId: string; amount: number }[] {
  const out: { thiefId: string; amount: number }[] = [];
  for (const p of players) {
    const c = p.card;
    if (!c || c.id !== "kapa" || !c.targetId) continue;
    const target = players.find((t) => t.id === c.targetId);
    const rec = target?.answers.find((a) => a.q === qIndex);
    if (!target || !rec || rec.breakdown.streak <= 0) continue;
    const already = c.gained ?? 0;
    const amount = Math.min(KAPA_CAP - already, Math.round(rec.breakdown.streak * rec.breakdown.multiplier * KAPA_SHARE));
    if (amount <= 0) continue;
    // Påverkar bara bonusen från denna fråga — aldrig tidigare intjänad höjd.
    target.score -= amount;
    rec.points -= amount;
    p.score += amount;
    c.gained = already + amount;
    p.bonusLog.push({ reason: "Kapa", points: amount, legIndex: c.legIndex });
    out.push({ thiefId: p.id, amount });
  }
  return out;
}

/* ---------- Ranking ---------- */

export function ranked(players: PlayerState[]): PlayerState[] {
  return players.slice().sort((a, b) => b.score - a.score || b.correct - a.correct || a.name.localeCompare(b.name, "sv"));
}

export function rankOf(players: PlayerState[], id: string): number {
  return ranked(players).findIndex((p) => p.id === id) + 1;
}

/**
 * Hur placering beskrivs för eleven. Undviker att peka ut "botten".
 */
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
    return {
      title: `Plats ${rank} av ${total}`,
      detail: climbedText ?? gapText ?? (rank === 1 ? "Du leder" : "Håll kursen"),
    };
  }
  if (mode === "ungefar") {
    const pct = rank / total;
    if (rank <= 3) return { title: "Bland de tre främsta", detail: climbedText ?? "Starkt jobbat" };
    if (pct <= 0.2) return { title: "Topp 20 %", detail: climbedText ?? gapText ?? "Du ligger bra till" };
    if (pct <= 0.5) return { title: "Övre halvan", detail: climbedText ?? gapText ?? "Fortsätt så" };
    return {
      title: climbed > 0 ? "Du klättrar" : "Fortsätt klättra",
      detail: climbedText ?? gapText ?? "Varje rätt svar räknas",
    };
  }
  return {
    title: climbed > 0 ? "Du klättrar" : "Din tur",
    detail: "Ingen topplista i lugnt läge — fokus på din egen höjd",
  };
}

/* ---------- Kort ---------- */

export function offerCards(rng: Rng, energy: Energy, count = 3): CardId[] {
  return shuffle(rng, ENERGY[energy].cards).slice(0, count);
}

/**
 * Aktiverar ett kort inför en etapp. Duell paras med närmaste höjd,
 * kapning riktas mot spelaren precis ovanför — aldrig fritt valbart mål,
 * så att hela klassen inte kan rikta sig mot den som leder.
 */
export function activateCard(players: PlayerState[], p: PlayerState, id: CardId, legIndex: number): ActiveCard {
  const uses = id === "medvind" ? MEDVIND_USES : id === "andrum" ? ANDRUM_QUESTIONS : 1;
  const card: ActiveCard = { id, uses, legIndex, gained: 0 };
  const order = ranked(players);
  const idx = order.findIndex((x) => x.id === p.id);
  if (id === "duell") {
    let best: PlayerState | undefined;
    let bestGap = Infinity;
    for (const o of order) {
      if (o.id === p.id) continue;
      const gap = Math.abs(o.score - p.score);
      if (gap < bestGap) {
        best = o;
        bestGap = gap;
      }
    }
    card.targetId = best?.id;
  }
  if (id === "kapa") {
    card.targetId = idx > 0 ? order[idx - 1].id : order[1]?.id;
  }
  p.card = card;
  p.usedCards.push(id);
  return card;
}

/** Avslutar en etapp: avgör dueller och rensar kort. */
export function endLeg(players: PlayerState[], legIndex: number): { aId: string; bId: string; winnerId: string | null }[] {
  const results: { aId: string; bId: string; winnerId: string | null }[] = [];
  const done = new Set<string>();
  for (const p of players) {
    const c = p.card;
    if (c?.id === "duell" && c.targetId && !done.has(p.id + c.targetId)) {
      const o = players.find((x) => x.id === c.targetId);
      if (o) {
        const a = p.legCorrect[legIndex] ?? 0;
        const b = o.legCorrect[legIndex] ?? 0;
        if (a === b) {
          p.score += DUEL_TIE;
          p.bonusLog.push({ reason: "Duell (lika)", points: DUEL_TIE, legIndex });
          if (!(o.card?.id === "duell" && o.card.targetId === p.id)) {
            // Motståndaren får också del av en oavgjord duell
            o.score += DUEL_TIE;
            o.bonusLog.push({ reason: "Duell (lika)", points: DUEL_TIE, legIndex });
          }
          results.push({ aId: p.id, bId: o.id, winnerId: null });
        } else {
          const w = a > b ? p : o;
          w.score += DUEL_WIN;
          w.bonusLog.push({ reason: "Vann duell", points: DUEL_WIN, legIndex });
          results.push({ aId: p.id, bId: o.id, winnerId: w.id });
        }
        done.add(p.id + o.id);
        done.add(o.id + p.id);
      }
    }
  }
  for (const p of players) p.card = undefined;
  return results;
}

/* ---------- Bottar / simulerade spelare ---------- */

export interface BotProfile {
  /** Observerad träffsäkerhet (0–1) på en medelsvår fråga */
  accuracy: number;
  /** Typisk svarstid som andel av tidsgränsen (0–1) */
  pace: number;
  /** Spridning i svarstid */
  jitter: number;
  /** Föredragna kort (används om de erbjuds) */
  prefers?: CardId[];
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
  opts: { timeLimit: number; removedOption?: number | null },
): { option: number | null; time: number } {
  const n = q.options;
  const guess = 1 / n;
  const pKnow = Math.min(0.99, Math.max(0, (prof.accuracy - guess) / (1 - guess) - (q.difficulty ?? 0)));
  const knows = rng() < pKnow;
  let option: number;
  if (knows) option = q.correct;
  else {
    const pool = Array.from({ length: n }, (_, i) => i).filter((i) => i !== opts.removedOption);
    option = pick(rng, pool);
  }
  // Den som inte kan svaret tar oftast lite längre tid.
  const pace = prof.pace * (knows ? 1 : 1.25);
  const t = opts.timeLimit * Math.max(0.06, pace * Math.exp(gaussian(rng) * prof.jitter));
  if (t >= opts.timeLimit) return { option: null, time: opts.timeLimit };
  return { option, time: Math.round(t * 10) / 10 };
}

export function botChooseCard(rng: Rng, prof: BotProfile | undefined, offered: CardId[]): CardId {
  const pref = prof?.prefers?.find((c) => offered.includes(c));
  return pref ?? pick(rng, offered);
}

/* ---------- Hel match (för simulering & historik) ---------- */

export interface SimPlayer {
  id: string;
  name: string;
  skinId: string;
  profile: BotProfile;
}

export interface SimResult {
  players: PlayerState[];
  /** Per fråga: hur många valde varje alternativ, samt obesvarade */
  distribution: number[][];
  unanswered: number[];
}

export function simulateMatch(
  seed: number,
  sim: SimPlayer[],
  questions: QuestionMeta[],
  energy: Energy,
  opts: { useCards?: boolean; luckyIds?: string[] } = {},
): SimResult {
  const rng = mulberry32(seed);
  const cfg = ENERGY[energy];
  const useCards = opts.useCards ?? true;
  const lucky = new Set(opts.luckyIds ?? []);
  const players = sim.map((s) => newPlayer(s.id, s.name, s.skinId, { profile: s.profile }));
  const n = questions.length;
  const distribution = questions.map((q) => Array(q.options).fill(0));
  const unanswered = questions.map(() => 0);

  let qIndex = 0;
  const sizes = legSizes(n);
  for (let leg = 0; leg < sizes.length; leg++) {
    if (useCards && leg > 0) {
      for (const p of players) {
        const offered = lucky.has(p.id) ? (["medvind", "duell", "kapa"] as CardId[]).filter((c) => cfg.cards.includes(c)) : offerCards(rng, energy);
        const choice = botChooseCard(rng, p.profile, offered.length ? offered : offerCards(rng, energy));
        activateCard(players, p, choice, leg);
      }
    }
    for (let k = 0; k < sizes[leg]; k++, qIndex++) {
      const q = questions[qIndex];
      const limit = q.time * cfg.timeFactor;
      for (const p of players) {
        const andrum = p.card?.id === "andrum" && p.card.uses > 0;
        const useFokus = p.card?.id === "fokus" && p.card.uses > 0 && k === 0;
        let removed: number | null = null;
        if (useFokus && p.card) {
          const wrong = Array.from({ length: q.options }, (_, i) => i).filter((i) => i !== q.correct);
          removed = pick(rng, wrong);
          p.card.uses = 0;
        }
        const ans = botAnswer(rng, p.profile!, q, { timeLimit: andrum ? limit * ANDRUM_FACTOR : limit, removedOption: removed });
        const correct = ans.option === q.correct;
        if (ans.option === null) unanswered[qIndex]++;
        else distribution[qIndex][ans.option]++;
        applyAnswer(p, qIndex, ans.option, {
          correct,
          time: ans.time,
          timeLimit: limit,
          energy,
          finalLeg: sizes.length > 1 && leg === sizes.length - 1,
          legIndex: leg,
        });
      }
      if (useCards) resolveKapa(players, qIndex);
    }
    if (useCards) endLeg(players, leg);
  }
  return { players, distribution, unanswered };
}
