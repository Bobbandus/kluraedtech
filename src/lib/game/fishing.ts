/**
 * Isfiske – spelmotor (ren TS, ingen DOM).
 *
 * Eleven pimplar genom ett hål i isen. Rätt svar ger bete och förlänger
 * linan så att man når djupare, där de värdefulla fiskarna simmar.
 * Skicklighet: styr kroken förbi småfisken på väg ner till de stora.
 */

import { mulberry32, type Energy, type Rng } from "./engine";

/* ---------- Värld ---------- */

export const W = 640;
export const H = 480;
/** Vattenytan (undersidan av isen) */
export const SURFACE = 104;
export const BOTTOM = 462;
export const WATER = BOTTOM - SURFACE;
export const HOLE_X = 330;

/** Tid efter rätt/fel svar innan nästa fråga (s) */
export const READ_LOCK = 1.2;
export const FEEDBACK_CORRECT = 1.1;
export const FEEDBACK_WRONG = 3.4;
export const MAX_BAIT = 9;
export const START_BAIT = 2;

/** Hur djupt linan räcker (px under ytan) */
export function lineDepth(correct: number) {
  return Math.min(WATER - 6, 112 + correct * 30);
}

/** Bete per rätt svar (svit ger mer) */
export function baitReward(streak: number) {
  return streak >= 3 ? 2 : 1;
}

/** Djup i meter för visning */
export function meters(depthPx: number) {
  return Math.round((depthPx / WATER) * 24);
}

export type FishKind = "mort" | "abborre" | "sik" | "gos" | "roding" | "lake" | "gadda" | "guld" | "kanga";

export interface FishInfo {
  name: string;
  value: number;
  /** Djupband (px under ytan) */
  depth: [number, number];
  speed: number;
  len: number;
  /** Hur många som simmar samtidigt */
  count: number;
  /** Hur gärna den hugger (0..1) */
  greed: number;
}

export const FISH: Record<FishKind, FishInfo> = {
  mort: { name: "Mört", value: 10, depth: [14, 120], speed: 34, len: 24, count: 5, greed: 0.95 },
  abborre: { name: "Abborre", value: 15, depth: [24, 150], speed: 30, len: 38, count: 4, greed: 0.9 },
  sik: { name: "Sik", value: 25, depth: [110, 215], speed: 38, len: 32, count: 3, greed: 0.75 },
  gos: { name: "Gös", value: 35, depth: [150, 255], speed: 30, len: 38, count: 2, greed: 0.7 },
  roding: { name: "Röding", value: 55, depth: [210, 320], speed: 46, len: 32, count: 2, greed: 0.6 },
  lake: { name: "Lake", value: 50, depth: [270, 350], speed: 20, len: 40, count: 2, greed: 0.8 },
  gadda: { name: "Gädda", value: 90, depth: [250, 345], speed: 26, len: 62, count: 1, greed: 0.55 },
  guld: { name: "Guldfisken", value: 200, depth: [70, 330], speed: 72, len: 26, count: 0, greed: 0.5 },
  kanga: { name: "Gammal känga", value: 0, depth: [WATER - 8, WATER - 8], speed: 0, len: 26, count: 1, greed: 0 },
};

export const FISH_ORDER: FishKind[] = ["mort", "abborre", "sik", "gos", "lake", "roding", "gadda", "guld"];

export interface Fish {
  id: number;
  kind: FishKind;
  x: number;
  y: number;
  dir: 1 | -1;
  home: number;
  phase: number;
  /** Sekunder kvar för guldfisken */
  ttl?: number;
  /** Ointresserad av kroken en stund (efter att ha nosat) */
  shy: number;
}

export type FishEvent =
  | { t: number; type: "catch"; kind: FishKind; value: number }
  | { t: number; type: "bite"; kind: FishKind }
  | { t: number; type: "snag" }
  | { t: number; type: "gold" }
  | { t: number; type: "splash" }
  | { t: number; type: "bait"; amount: number }
  | { t: number; type: "steal"; kind: FishKind };

export interface FishingState {
  energy: Energy;
  time: number;
  rng: Rng;
  fish: Fish[];
  nextId: number;
  /** Krokens position */
  hx: number;
  hy: number;
  /** Mål från pekare/tangenter */
  tx: number;
  ty: number;
  /** Fisk på kroken: drar upp */
  hooked: Fish | null;
  reeling: boolean;
  bait: number;
  correct: number;
  score: number;
  caught: Record<FishKind, number>;
  best: FishKind | null;
  /** Senaste fångsten */
  last: FishKind | null;
  catches: number;
  nextGold: number;
  events: FishEvent[];
}

export function createFishing(seed: number, energy: Energy = "standard"): FishingState {
  const rng = mulberry32(seed);
  const g: FishingState = {
    energy,
    time: 0,
    rng,
    fish: [],
    nextId: 1,
    hx: HOLE_X,
    hy: SURFACE + 30,
    tx: HOLE_X,
    ty: SURFACE + 30,
    hooked: null,
    reeling: false,
    bait: START_BAIT,
    correct: 0,
    score: 0,
    caught: { mort: 0, abborre: 0, sik: 0, gos: 0, roding: 0, lake: 0, gadda: 0, guld: 0, kanga: 0 },
    best: null,
    last: null,
    catches: 0,
    nextGold: 35 + rng() * 25,
    events: [],
  };
  for (const k of Object.keys(FISH) as FishKind[]) for (let i = 0; i < FISH[k].count; i++) spawn(g, k, true);
  return g;
}

function spawn(g: FishingState, kind: FishKind, anywhere = false) {
  const info = FISH[kind];
  const [a, b] = info.depth;
  const home = SURFACE + a + g.rng() * (b - a);
  const dir: 1 | -1 = g.rng() < 0.5 ? 1 : -1;
  const x = kind === "kanga" ? 60 + g.rng() * (W - 120) : anywhere ? 20 + g.rng() * (W - 40) : dir === 1 ? -30 : W + 30;
  const f: Fish = { id: g.nextId++, kind, x, y: home, dir, home, phase: g.rng() * 6.28, shy: 0 };
  if (kind === "guld") f.ttl = 16;
  g.fish.push(f);
  return f;
}

/** Rätt svar: bete och längre lina */
export function onCorrect(g: FishingState, streak: number): number {
  const add = baitReward(streak);
  g.correct++;
  g.bait = Math.min(MAX_BAIT, g.bait + add);
  g.events.push({ t: g.time, type: "bait", amount: add });
  return add;
}

/** Vart kroken får gå: en kon under hålet, ner till linans längd. */
export function clampHook(g: FishingState, x: number, y: number) {
  const maxY = SURFACE + lineDepth(g.correct);
  const cy = Math.max(SURFACE + 8, Math.min(maxY, y));
  const reach = 70 + (cy - SURFACE) * 0.95;
  const cx = Math.max(Math.max(14, HOLE_X - reach), Math.min(Math.min(W - 14, HOLE_X + reach), x));
  return { x: cx, y: cy };
}

export function setTarget(g: FishingState, x: number, y: number) {
  const c = clampHook(g, x, y);
  g.tx = c.x;
  g.ty = c.y;
}

const HOOK_SPEED = 190;
const REEL_SIDE = 120;

/** Småfisk på kroken kan bli gäddmat (inte i lugnt läge) */
function stealable(g: FishingState, f: Fish) {
  return g.energy !== "lugn" && f.kind !== "gadda" && f.kind !== "kanga" && FISH[f.kind].value < 50;
}

export function step(g: FishingState, dt: number) {
  g.time += dt;
  // Gamla händelser bort
  if (g.events.length > 40) g.events.splice(0, g.events.length - 40);

  /* Krok */
  if (g.reeling) {
    const f = g.hooked;
    const speed = f ? Math.max(90, 200 - FISH[f.kind].len * 1.7) : 260;
    // Linan vevas upp; i sidled kan man styra undan (gäddan!) tills man är nära hålet
    const depth = g.hy - SURFACE;
    const pull = Math.max(0, Math.min(1, 1 - (depth - 10) / 50));
    const wantX = clampHook(g, g.tx, g.hy).x * (1 - pull) + HOLE_X * pull;
    const side = Math.max(-REEL_SIDE * dt, Math.min(REEL_SIDE * dt, wantX - g.hx));
    g.hx += pull >= 1 ? Math.max(-260 * dt, Math.min(260 * dt, HOLE_X - g.hx)) : side;
    g.hy = Math.max(SURFACE - 6, g.hy - speed * dt);
    const d = Math.hypot(HOLE_X - g.hx, SURFACE - 6 - g.hy);
    if (f) {
      // Fisken sprattlar på kroken
      f.x = g.hx + Math.sin(g.time * 18) * 3;
      f.y = g.hy + FISH[f.kind].len * 0.35;
      f.dir = Math.sin(g.time * 7) > 0 ? 1 : -1;
    }
    if (f && stealable(g, f)) {
      for (const p of g.fish) {
        if (p.kind !== "gadda" || p === f) continue;
        if (Math.hypot(p.x - f.x, p.y - f.y) < 10 + FISH.gadda.len * 0.35) {
          // Gäddan tar fångsten – och betet
          g.fish = g.fish.filter((x) => x !== f);
          spawn(g, f.kind);
          g.hooked = null;
          g.reeling = false;
          g.bait = Math.max(0, g.bait - 1);
          p.shy = 4;
          g.events.push({ t: g.time, type: "steal", kind: f.kind });
          break;
        }
      }
    }
    if (d < 2) land(g);
  } else {
    const c = clampHook(g, g.tx, g.ty);
    const dx = c.x - g.hx;
    const dy = c.y - g.hy;
    const d = Math.hypot(dx, dy);
    const m = Math.min(d, HOOK_SPEED * dt);
    if (d > 0.01) {
      g.hx += (dx / d) * m;
      g.hy += (dy / d) * m;
    }
    // Linan kan ha blivit kortare? (nej, bara längre) – men håll inom konen
    const k = clampHook(g, g.hx, g.hy);
    g.hx = k.x;
    g.hy = k.y;
  }

  /* Guldfisken dyker upp då och då */
  if (g.time >= g.nextGold) {
    g.nextGold = g.time + 45 + g.rng() * 30;
    spawn(g, "guld");
    g.events.push({ t: g.time, type: "gold" });
  }

  /* Fiskar */
  const baited = g.bait > 0 && !g.reeling;
  for (const f of g.fish) {
    if (f === g.hooked) continue;
    const info = FISH[f.kind];
    // Gäddan jagar småfisk som sitter på kroken
    if (f.kind === "gadda" && g.hooked && stealable(g, g.hooked) && f.shy <= 0) {
      const dx = g.hooked.x - f.x;
      const dy = g.hooked.y - f.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 120) {
        const sp = info.speed * 2.2;
        f.x += (dx / (dist || 1)) * sp * dt;
        f.y += (dy / (dist || 1)) * sp * dt;
        f.dir = dx >= 0 ? 1 : -1;
        f.y = Math.max(SURFACE + 8, Math.min(BOTTOM - 6, f.y));
        continue;
      }
    }
    if (f.kind === "kanga") {
      // Kängan ligger still. Fastnar kroken i den drar man upp den.
      if (!g.reeling && Math.hypot(f.x - g.hx, f.y - g.hy) < 13) {
        g.hooked = f;
        g.reeling = true;
        g.events.push({ t: g.time, type: "snag" });
      }
      continue;
    }
    f.phase += dt * 2;
    f.shy = Math.max(0, f.shy - dt);
    if (f.ttl !== undefined) f.ttl -= dt;
    const dx = g.hx - f.x;
    const dy = g.hy - f.y;
    const dist = Math.hypot(dx, dy);
    const sense = 46 + info.len * 0.8;
    if (baited && f.shy <= 0 && dist < sense) {
      // Nosar på betet
      const sp = info.speed * 1.15;
      f.x += (dx / (dist || 1)) * sp * dt;
      f.y += (dy / (dist || 1)) * sp * dt * 0.8;
      f.dir = dx >= 0 ? 1 : -1;
      if (dist < 4 + info.len * 0.32) {
        if (g.rng() < info.greed) {
          g.hooked = f;
          g.reeling = true;
          g.events.push({ t: g.time, type: "bite", kind: f.kind });
        } else f.shy = 2.5;
      }
    } else {
      f.x += f.dir * info.speed * dt;
      f.y += ((f.home + Math.sin(f.phase) * 6) - f.y) * Math.min(1, dt * 1.5);
      // Vänder ibland
      if (g.rng() < dt * 0.06) f.dir = f.dir === 1 ? -1 : 1;
    }
    f.y = Math.max(SURFACE + 8, Math.min(BOTTOM - 6, f.y));
  }
  // Fiskar som simmat ut ur bild ersätts av nya (samma art)
  for (let i = g.fish.length - 1; i >= 0; i--) {
    const f = g.fish[i];
    if (f === g.hooked) continue;
    const out = f.x < -50 || f.x > W + 50;
    if (out || (f.ttl !== undefined && f.ttl <= 0 && (f.x < -10 || f.x > W + 10 || f.ttl < -8))) {
      g.fish.splice(i, 1);
      if (f.kind !== "guld") spawn(g, f.kind);
    } else if (f.ttl !== undefined && f.ttl <= 0) {
      // Guldfisken simmar sin väg
      f.dir = f.x < W / 2 ? -1 : 1;
      f.shy = 99;
    }
  }
}

function land(g: FishingState) {
  const f = g.hooked;
  g.reeling = false;
  g.hy = SURFACE + 18;
  g.ty = Math.max(g.ty, g.hy);
  if (!f) return;
  g.hooked = null;
  g.fish = g.fish.filter((x) => x !== f);
  g.events.push({ t: g.time, type: "splash" });
  if (f.kind === "kanga") {
    g.caught.kanga++;
    g.events.push({ t: g.time, type: "catch", kind: "kanga", value: 0 });
    spawn(g, "kanga");
    return;
  }
  const value = FISH[f.kind].value;
  g.bait = Math.max(0, g.bait - 1);
  g.score += value;
  g.catches++;
  g.caught[f.kind]++;
  g.last = f.kind;
  if (!g.best || FISH[f.kind].value > FISH[g.best].value) g.best = f.kind;
  g.events.push({ t: g.time, type: "catch", kind: f.kind, value });
  if (f.kind !== "guld") spawn(g, f.kind);
}

/** Högsta rimliga poäng (servern använder den som tak). */
export function scoreCap(correct: number) {
  return (START_BAIT + correct * 2) * FISH.guld.value;
}

/* ---------- Bottar ---------- */

/** Vad en bot med `correct` rätt svar troligen får upp. */
export function botCatch(rng: Rng, correct: number): FishKind {
  const reach = lineDepth(correct);
  const options = FISH_ORDER.filter((k) => k !== "guld" && FISH[k].depth[0] < reach - 10);
  // Djupare fisk är svårare att nå – vikta mot de grunda
  const weights = options.map((k, i) => 1 / (1 + i * 0.55));
  if (rng() < 0.012) return "guld";
  let r = rng() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < options.length; i++) {
    r -= weights[i];
    if (r <= 0) return options[i];
  }
  return options[0] ?? "mort";
}
