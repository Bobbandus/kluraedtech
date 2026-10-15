/**
 * Slalom – spelmotor (ren TS, ingen DOM).
 *
 * Eleven åker nerför fjället genom portar. Var tionde port är en
 * kunskapsport: där kommer en fråga. Rätt svar höjer multiplikatorn,
 * fel sänker den. Poäng = portar och sträcka gånger multiplikatorn,
 * så den som kan mest får flest poäng – men man måste också åka bra.
 */

import { mulberry32, type Energy, type Rng } from "./engine";

/** Pistens bredd (världsenheter = pixlar i pixelgrafiken) */
export const W = 240;
export const GATE_EVERY = 64;
export const QUIZ_EVERY = 10;
export const MAX_LEVEL = 9;
export const FALL_TIME = 1.3;

export const READ_LOCK = 0.8;
export const FEEDBACK_CORRECT = 0.9;
export const FEEDBACK_WRONG = 3.6;

export const POINTS = { gate: 10, perMeter: 0.12, jump: 15, cleanRun: 5 };

export const multiplier = (level: number) => 1 + level;

export type ObstacleKind = "tree" | "rock" | "mogul" | "jump" | "flagTree";

export interface Obstacle {
  id: number;
  kind: ObstacleKind;
  x: number;
  y: number;
  r: number;
}

export interface Gate {
  id: number;
  y: number;
  x: number;
  /** Halva öppningen */
  half: number;
  color: "red" | "blue";
  quiz: boolean;
  passed: boolean | null;
}

export type SlalomEvent =
  | { t: number; type: "gate"; points: number; combo: number }
  | { t: number; type: "miss" }
  | { t: number; type: "crash" }
  | { t: number; type: "jump" }
  | { t: number; type: "land"; points: number }
  | { t: number; type: "quiz" }
  | { t: number; type: "level"; up: boolean; level: number };

export interface SlalomState {
  energy: Energy;
  time: number;
  rng: Rng;
  x: number;
  y: number;
  vx: number;
  speed: number;
  /** -1..1 styrning */
  steer: number;
  tuck: boolean;
  phase: "ski" | "fallen" | "question" | "air";
  fallT: number;
  airT: number;
  level: number;
  correct: number;
  score: number;
  gates: number;
  combo: number;
  bestCombo: number;
  missed: number;
  crashes: number;
  distance: number;
  obstacles: Obstacle[];
  gatesList: Gate[];
  /** Hur långt ner banan är genererad */
  genY: number;
  gateCount: number;
  nextId: number;
  trail: { x: number; y: number }[];
  events: SlalomEvent[];
  /** Sekunder av fartökning efter rätt svar */
  boost: number;
}

export function createSlalom(seed: number, energy: Energy = "standard"): SlalomState {
  const g: SlalomState = {
    energy,
    time: 0,
    rng: mulberry32(seed),
    x: W / 2,
    y: 0,
    vx: 0,
    speed: 40,
    steer: 0,
    tuck: false,
    phase: "ski",
    fallT: 0,
    airT: 0,
    level: 0,
    correct: 0,
    score: 0,
    gates: 0,
    combo: 0,
    bestCombo: 0,
    missed: 0,
    crashes: 0,
    distance: 0,
    obstacles: [],
    gatesList: [],
    genY: 60,
    gateCount: 0,
    nextId: 1,
    trail: [],
    events: [],
    boost: 0,
  };
  generate(g, 600);
  return g;
}

/** Fart nerför: ökar med sträckan och multiplikatorn. */
export function cruise(g: SlalomState) {
  const pace = g.energy === "lugn" ? 0.85 : g.energy === "fullfart" ? 1.12 : 1;
  const base = (74 + Math.min(40, g.distance / 260)) * pace;
  return base * (1 + g.level * 0.04) * (g.tuck ? 1.18 : 1) * (g.boost > 0 ? 1.15 : 1);
}

function generate(g: SlalomState, until: number) {
  const r = g.rng;
  while (g.genY < until) {
    const y = g.genY;
    g.gateCount++;
    const quiz = g.gateCount % QUIZ_EVERY === 0;
    // Porten slingrar sig fram och tillbaka
    const prev = g.gatesList[g.gatesList.length - 1];
    const px = prev ? prev.x : W / 2;
    const swing = (g.gateCount % 2 ? 1 : -1) * (26 + r() * 30);
    const x = quiz ? W / 2 : Math.max(46, Math.min(W - 46, px + swing));
    const half = quiz ? 70 : Math.max(17, 26 - g.gateCount * 0.06);
    g.gatesList.push({ id: g.nextId++, y, x, half, color: g.gateCount % 2 ? "red" : "blue", quiz, passed: null });
    // Granar längs kanterna
    for (let k = 0; k < 3; k++) {
      g.obstacles.push({ id: g.nextId++, kind: "tree", x: 4 + r() * 14, y: y + r() * GATE_EVERY, r: 6 });
      g.obstacles.push({ id: g.nextId++, kind: "tree", x: W - 4 - r() * 14, y: y + r() * GATE_EVERY, r: 6 });
    }
    // Hinder mellan portarna (aldrig i själva portöppningen)
    if (!quiz && g.gateCount > 2 && (g.gateCount + 1) % QUIZ_EVERY !== 0) {
      const n = g.energy === "lugn" ? (r() < 0.45 ? 1 : 0) : r() < (g.energy === "fullfart" ? 0.5 : 0.3) ? 2 : 1;
      for (let k = 0; k < n; k++) {
        const roll = r();
        const kind: ObstacleKind = roll < 0.42 ? "tree" : roll < 0.62 ? "rock" : roll < 0.86 ? "mogul" : "jump";
        let ox = 24 + r() * (W - 48);
        const oy = y + GATE_EVERY * (0.35 + r() * 0.35);
        // Håll en korridor fri mellan den här och nästa port
        if (kind !== "mogul" && kind !== "jump" && Math.abs(ox - x) < half + 14) ox = x + (ox < x ? -1 : 1) * (half + 22);
        if (ox < 22 || ox > W - 22) continue;
        g.obstacles.push({ id: g.nextId++, kind, x: ox, y: oy, r: kind === "tree" ? 6 : kind === "rock" ? 5 : kind === "mogul" ? 7 : 9 });
      }
    }
    g.genY += GATE_EVERY;
  }
}

export function answer(g: SlalomState, correct: boolean) {
  if (correct) {
    g.correct++;
    g.level = Math.min(MAX_LEVEL, g.level + 1);
    g.boost = 2.5;
  } else g.level = Math.max(0, g.level - 1);
  g.events.push({ t: g.time, type: "level", up: correct, level: g.level });
}

export function resume(g: SlalomState) {
  if (g.phase === "question") g.phase = "ski";
}

export function step(g: SlalomState, dt: number) {
  g.time += dt;
  if (g.events.length > 40) g.events.splice(0, g.events.length - 40);
  if (g.phase === "question") return;
  g.boost = Math.max(0, g.boost - dt);

  if (g.phase === "fallen") {
    g.fallT -= dt;
    g.speed = Math.max(0, g.speed - 160 * dt);
    g.y += g.speed * dt;
    if (g.fallT <= 0) {
      g.phase = "ski";
      g.speed = 30;
    }
    return;
  }

  // Styrning: sidled följer spaken, svängar bromsar lite
  const target = g.steer * 92;
  g.vx += (target - g.vx) * Math.min(1, dt * 6);
  const want = cruise(g) * (1 - Math.abs(g.steer) * 0.18);
  g.speed += (want - g.speed) * Math.min(1, dt * (g.speed < want ? 1.1 : 2.2));
  const dy = g.speed * dt;
  const prevY = g.y;
  g.x += g.vx * dt;
  g.y += dy;
  g.distance += dy;
  g.score += dy * POINTS.perMeter * multiplier(g.level);

  // Staket i kanterna
  if (g.x < 10) {
    g.x = 10;
    g.vx = Math.abs(g.vx) * 0.3;
  }
  if (g.x > W - 10) {
    g.x = W - 10;
    g.vx = -Math.abs(g.vx) * 0.3;
  }

  // Spår i snön
  const last = g.trail[g.trail.length - 1];
  if (!last || g.y - last.y > 2) {
    g.trail.push({ x: g.x, y: g.y });
    if (g.trail.length > 160) g.trail.shift();
  }

  if (g.phase === "air") {
    g.airT -= dt;
    if (g.airT <= 0) {
      g.phase = "ski";
      const pts = POINTS.jump * multiplier(g.level);
      g.score += pts;
      g.events.push({ t: g.time, type: "land", points: pts });
    }
  } else {
    // Hinder
    for (const o of g.obstacles) {
      if (Math.abs(o.y - g.y) > 12) continue;
      const d = Math.hypot(o.x - g.x, (o.y - g.y) * 1.2);
      if (d > o.r + 3) continue;
      if (o.kind === "jump") {
        g.phase = "air";
        g.airT = 0.75;
        g.events.push({ t: g.time, type: "jump" });
        break;
      }
      if (o.kind === "mogul") {
        g.speed *= 1 - Math.min(0.5, dt * 6);
        continue;
      }
      crash(g);
      break;
    }
  }

  // Portar
  for (const gt of g.gatesList) {
    if (gt.passed !== null) continue;
    if (prevY < gt.y && g.y >= gt.y) {
      const inside = Math.abs(g.x - gt.x) <= gt.half;
      if (gt.quiz) {
        gt.passed = true;
        g.phase = "question";
        g.events.push({ t: g.time, type: "quiz" });
        return;
      }
      gt.passed = inside;
      if (inside) {
        g.gates++;
        g.combo++;
        g.bestCombo = Math.max(g.bestCombo, g.combo);
        const pts = (POINTS.gate + Math.min(10, g.combo) * POINTS.cleanRun * 0.2) * multiplier(g.level);
        g.score += pts;
        g.events.push({ t: g.time, type: "gate", points: Math.round(pts), combo: g.combo });
      } else {
        g.combo = 0;
        g.missed++;
        g.events.push({ t: g.time, type: "miss" });
      }
    }
  }

  // Generera mer bana, släng det som passerats
  generate(g, g.y + 600);
  if (g.obstacles.length > 400) g.obstacles = g.obstacles.filter((o) => o.y > g.y - 200);
  if (g.gatesList.length > 40) g.gatesList = g.gatesList.filter((x) => x.y > g.y - 200);
}

function crash(g: SlalomState) {
  g.phase = "fallen";
  g.fallT = FALL_TIME;
  g.combo = 0;
  g.crashes++;
  g.vx = 0;
  g.events.push({ t: g.time, type: "crash" });
}

/** Rimligt tak för poängen (servern använder det). */
export function scoreCap(seconds: number, correct: number) {
  const m = multiplier(Math.min(MAX_LEVEL, correct));
  return seconds * (140 * POINTS.perMeter + 4 * (POINTS.gate + 2 + POINTS.jump)) * m + 200;
}

/* ---------- Bottar ---------- */

/** Ungefärlig poäng per sekund för en bot med given nivå och skicklighet. */
export function botRate(level: number, skill: number) {
  const speed = 80 + skill * 30;
  const gatesPerSec = speed / GATE_EVERY;
  return (speed * POINTS.perMeter + gatesPerSec * (0.55 + skill * 0.4) * (POINTS.gate + 1)) * multiplier(level);
}
