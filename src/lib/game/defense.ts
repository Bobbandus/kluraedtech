/**
 * Fjällförsvar – tower defense-logik.
 *
 * Ren, deterministisk simulering (inga DOM-beroenden). Klienten kör den i
 * en requestAnimationFrame-loop och ritar resultatet på canvas; servern och
 * balansskriptet kan köra den utan grafik.
 *
 * Kärnidé: virke kommer nästan bara från rätta svar. Trollen går hela tiden,
 * även medan man svarar – så man måste både kunna svaren och spela.
 */

import { mulberry32, type Rng } from "./engine.ts";

export const COLS = 12;
export const ROWS = 8;

/** Stigen som mittpunkter i rutor. Startar utanför kartan till vänster. */
export const WAYPOINTS: [number, number][] = [
  [-1, 1],
  [2, 1],
  [2, 5],
  [5, 5],
  [5, 2],
  [8, 2],
  [8, 6],
  [10.35, 6],
];
export const CABIN: [number, number] = [11, 6];

export type TowerKind = "bage" | "snoboll" | "lykta" | "bastu";
export type EnemyKind = "troll" | "lammel" | "jatte" | "boss";

export interface TowerDef {
  kind: TowerKind;
  name: string;
  blurb: string;
  cost: [number, number, number];
  range: [number, number, number];
  damage: [number, number, number];
  rate: [number, number, number];
  slow?: [number, number, number];
  splash?: [number, number, number];
  income?: [number, number, number];
}

export const TOWERS: Record<TowerKind, TowerDef> = {
  bage: {
    kind: "bage",
    name: "Bågskytt",
    blurb: "Snabba pilar mot ett mål.",
    cost: [60, 70, 120],
    range: [2.4, 2.7, 3.0],
    damage: [10, 17, 30],
    rate: [1.1, 1.3, 1.6],
  },
  snoboll: {
    kind: "snoboll",
    name: "Snöbollskastare",
    blurb: "Bromsar trollen.",
    cost: [80, 80, 120],
    range: [2.1, 2.3, 2.6],
    damage: [4, 7, 11],
    rate: [0.9, 1.0, 1.2],
    slow: [0.4, 0.5, 0.6],
  },
  lykta: {
    kind: "lykta",
    name: "Lykta",
    blurb: "Eldklot som träffar flera.",
    cost: [110, 110, 160],
    range: [2.0, 2.2, 2.4],
    damage: [14, 24, 40],
    rate: [0.55, 0.65, 0.75],
    splash: [0.9, 1.05, 1.2],
  },
  bastu: {
    kind: "bastu",
    name: "Bastu",
    blurb: "Ger lite virke av sig själv.",
    cost: [90, 90, 130],
    range: [0, 0, 0],
    damage: [0, 0, 0],
    rate: [0, 0, 0],
    income: [5, 9, 14],
  },
};

export const TOWER_ORDER: TowerKind[] = ["bage", "snoboll", "lykta", "bastu"];
export const BASTU_INTERVAL = 8;

export interface EnemyDef {
  kind: EnemyKind;
  name: string;
  hp: number;
  speed: number;
  reward: number;
  damage: number;
  radius: number;
  points: number;
}

export const ENEMIES: Record<EnemyKind, EnemyDef> = {
  troll: { kind: "troll", name: "Troll", hp: 38, speed: 1.0, reward: 2, damage: 1, radius: 0.28, points: 10 },
  lammel: { kind: "lammel", name: "Lämmel", hp: 20, speed: 1.9, reward: 2, damage: 1, radius: 0.2, points: 10 },
  jatte: { kind: "jatte", name: "Jätte", hp: 150, speed: 0.6, reward: 6, damage: 3, radius: 0.38, points: 30 },
  boss: { kind: "boss", name: "Bergakungen", hp: 650, speed: 0.48, reward: 25, damage: 8, radius: 0.46, points: 150 },
};

export const START_WOOD = 100;
export const START_HP = 20;
export const FIRST_BREAK = 10;
export const WAVE_BREAK = 5;
export const SPAWN_GAP = 0.85;
export const REPAIR_PER_CORRECT = 4;
export const REPAIR_TO_REVIVE = 8;
/** Lästid innan alternativen går att välja, och spärrtid efter svar (sekunder). */
export const READ_LOCK = 0.8;
export const FEEDBACK_CORRECT = 0.9;
export const FEEDBACK_WRONG = 5;

/** Virke för ett rätt svar, med radbonus. */
export function answerReward(streakAfter: number): number {
  return 30 + 12 * Math.min(5, Math.max(0, streakAfter - 1));
}

/* ---------- Geometri ---------- */

interface Seg {
  ax: number;
  ay: number;
  bx: number;
  by: number;
  len: number;
  start: number;
}

const SEGS: Seg[] = [];
let acc = 0;
for (let i = 1; i < WAYPOINTS.length; i++) {
  const [ax, ay] = WAYPOINTS[i - 1];
  const [bx, by] = WAYPOINTS[i];
  const len = Math.hypot(bx - ax, by - ay);
  SEGS.push({ ax, ay, bx, by, len, start: acc });
  acc += len;
}
export const PATH_LENGTH = acc;

/** Position (i rutkoordinater, mittpunkt = heltal) längs stigen. */
export function pathPoint(d: number): { x: number; y: number; angle: number } {
  const c = Math.max(0, Math.min(PATH_LENGTH, d));
  for (const s of SEGS) {
    if (c <= s.start + s.len) {
      const k = (c - s.start) / s.len;
      return { x: s.ax + (s.bx - s.ax) * k, y: s.ay + (s.by - s.ay) * k, angle: Math.atan2(s.by - s.ay, s.bx - s.ax) };
    }
  }
  const last = SEGS[SEGS.length - 1];
  return { x: last.bx, y: last.by, angle: 0 };
}

/** Rutor som stigen passerar. */
export const PATH_CELLS: Set<string> = (() => {
  const set = new Set<string>();
  for (let d = 0; d <= PATH_LENGTH; d += 0.1) {
    const p = pathPoint(d);
    const c = Math.round(p.x);
    const r = Math.round(p.y);
    if (c >= 0 && c < COLS && r >= 0 && r < ROWS) set.add(`${c},${r}`);
  }
  return set;
})();

/** Dekor som inte går att bygga på. */
export const DECOR: { c: number; r: number; kind: "gran" | "sten" | "sjo" | "buske" }[] = [
  { c: 0, r: 3, kind: "gran" },
  { c: 0, r: 4, kind: "gran" },
  { c: 0, r: 6, kind: "gran" },
  { c: 1, r: 7, kind: "gran" },
  { c: 4, r: 0, kind: "gran" },
  { c: 6, r: 0, kind: "gran" },
  { c: 7, r: 7, kind: "gran" },
  { c: 11, r: 0, kind: "gran" },
  { c: 11, r: 2, kind: "gran" },
  { c: 6, r: 7, kind: "sten" },
  { c: 3, r: 7, kind: "sten" },
  { c: 10, r: 3, kind: "sten" },
  { c: 9, r: 0, kind: "sjo" },
  { c: 10, r: 0, kind: "sjo" },
  { c: 3, r: 3, kind: "buske" },
  { c: 4, r: 7, kind: "buske" },
];

const DECOR_SET = new Set(DECOR.map((d) => `${d.c},${d.r}`));

export function canBuildAt(state: DefenseState, c: number, r: number): boolean {
  if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return false;
  const k = `${c},${r}`;
  if (PATH_CELLS.has(k) || DECOR_SET.has(k)) return false;
  if (c === CABIN[0] && r === CABIN[1]) return false;
  return !state.towers.some((t) => t.c === c && t.r === r);
}

/* ---------- Tillstånd ---------- */

export interface Enemy {
  id: number;
  kind: EnemyKind;
  hp: number;
  maxHp: number;
  dist: number;
  slowUntil: number;
  slowFactor: number;
  hitAt: number;
}

export interface Tower {
  id: number;
  kind: TowerKind;
  c: number;
  r: number;
  level: 0 | 1 | 2;
  cooldown: number;
  angle: number;
  incomeTimer: number;
  firedAt: number;
}

export interface Projectile {
  id: number;
  kind: TowerKind;
  x: number;
  y: number;
  targetId: number;
  tx: number;
  ty: number;
  speed: number;
  damage: number;
  splash: number;
  slow: number;
}

export type FxEvent =
  | { type: "hit"; x: number; y: number; kind: TowerKind; t: number }
  | { type: "kill"; x: number; y: number; enemy: EnemyKind; reward: number; t: number }
  | { type: "leak"; damage: number; t: number }
  | { type: "income"; x: number; y: number; amount: number; t: number }
  | { type: "wave"; wave: number; boss: boolean; t: number }
  | { type: "build"; x: number; y: number; t: number }
  | { type: "downed"; t: number }
  | { type: "revived"; t: number };

export interface DefenseState {
  t: number;
  wood: number;
  hp: number;
  maxHp: number;
  wave: number;
  wavesCleared: number;
  phase: "break" | "spawning";
  breakLeft: number;
  queue: EnemyKind[];
  spawnTimer: number;
  enemies: Enemy[];
  towers: Tower[];
  projectiles: Projectile[];
  events: FxEvent[];
  score: number;
  kills: number;
  downed: boolean;
  nextId: number;
  rngSeed: number;
}

export function createDefense(seed = 1): DefenseState {
  return {
    t: 0,
    wood: START_WOOD,
    hp: START_HP,
    maxHp: START_HP,
    wave: 0,
    wavesCleared: 0,
    phase: "break",
    breakLeft: FIRST_BREAK,
    queue: [],
    spawnTimer: 0,
    enemies: [],
    towers: [],
    projectiles: [],
    events: [],
    score: 0,
    kills: 0,
    downed: false,
    nextId: 1,
    rngSeed: seed,
  };
}

export function waveComposition(wave: number, rng: Rng): EnemyKind[] {
  const count = 5 + Math.floor(wave * 2.2);
  const list: EnemyKind[] = [];
  for (let i = 0; i < count; i++) {
    if (wave >= 4 && i % 6 === 5) list.push("jatte");
    else if (wave >= 2 && rng() < 0.28) list.push("lammel");
    else list.push("troll");
  }
  if (wave % 5 === 0) list.push("boss");
  return list;
}

export function hpScale(wave: number): number {
  return Math.pow(1.3, Math.max(0, wave - 1));
}

/* ---------- Spelarhandlingar ---------- */

export function build(state: DefenseState, kind: TowerKind, c: number, r: number): boolean {
  const def = TOWERS[kind];
  if (state.downed || !canBuildAt(state, c, r) || state.wood < def.cost[0]) return false;
  state.wood -= def.cost[0];
  state.towers.push({ id: state.nextId++, kind, c, r, level: 0, cooldown: 0.3, angle: -Math.PI / 2, incomeTimer: BASTU_INTERVAL, firedAt: -10 });
  state.events.push({ type: "build", x: c, y: r, t: state.t });
  return true;
}

export function upgradeCost(t: Tower): number | null {
  return t.level >= 2 ? null : TOWERS[t.kind].cost[t.level + 1];
}

export function upgrade(state: DefenseState, towerId: number): boolean {
  const t = state.towers.find((x) => x.id === towerId);
  if (!t || state.downed) return false;
  const cost = upgradeCost(t);
  if (cost === null || state.wood < cost) return false;
  state.wood -= cost;
  t.level = (t.level + 1) as 0 | 1 | 2;
  state.events.push({ type: "build", x: t.c, y: t.r, t: state.t });
  return true;
}

export function sellValue(t: Tower): number {
  const def = TOWERS[t.kind];
  let spent = 0;
  for (let i = 0; i <= t.level; i++) spent += def.cost[i];
  return Math.floor(spent * 0.6);
}

export function sell(state: DefenseState, towerId: number): boolean {
  const i = state.towers.findIndex((x) => x.id === towerId);
  if (i < 0 || state.downed) return false;
  state.wood += sellValue(state.towers[i]);
  state.towers.splice(i, 1);
  return true;
}

/** Rätt svar: virke, eller reparation om stugan har fallit. */
export function onCorrect(state: DefenseState, streakAfter: number): number {
  const reward = answerReward(streakAfter);
  state.wood += reward;
  if (state.downed) {
    state.hp = Math.min(state.maxHp, state.hp + REPAIR_PER_CORRECT);
    if (state.hp >= REPAIR_TO_REVIVE) {
      state.downed = false;
      state.events.push({ type: "revived", t: state.t });
    }
  }
  return reward;
}

/* ---------- Simulering ---------- */

function enemyPos(e: Enemy) {
  return pathPoint(e.dist);
}

export function step(state: DefenseState, dt: number): void {
  if (state.downed) {
    state.t += dt;
    return;
  }
  state.t += dt;
  const rng = mulberry32(state.rngSeed + Math.floor(state.t * 1000));

  // Vågor
  if (state.phase === "break") {
    state.breakLeft -= dt;
    if (state.breakLeft <= 0) {
      state.wave += 1;
      state.queue = waveComposition(state.wave, rng);
      state.phase = "spawning";
      state.spawnTimer = 0;
      state.events.push({ type: "wave", wave: state.wave, boss: state.wave % 5 === 0, t: state.t });
    }
  } else {
    state.spawnTimer -= dt;
    if (state.queue.length && state.spawnTimer <= 0) {
      const kind = state.queue.shift()!;
      const def = ENEMIES[kind];
      const hp = Math.round(def.hp * hpScale(state.wave));
      state.enemies.push({ id: state.nextId++, kind, hp, maxHp: hp, dist: 0, slowUntil: 0, slowFactor: 1, hitAt: -10 });
      state.spawnTimer = kind === "boss" ? SPAWN_GAP * 2 : SPAWN_GAP * (kind === "lammel" ? 0.6 : 1);
    }
    if (!state.queue.length && !state.enemies.length) {
      state.wavesCleared = state.wave;
      state.score += 100;
      state.phase = "break";
      state.breakLeft = WAVE_BREAK;
    }
  }

  // Fiender rör sig
  for (const e of state.enemies) {
    const slow = state.t < e.slowUntil ? e.slowFactor : 1;
    e.dist += ENEMIES[e.kind].speed * slow * dt;
  }
  const leaked = state.enemies.filter((e) => e.dist >= PATH_LENGTH);
  if (leaked.length) {
    for (const e of leaked) {
      const dmg = ENEMIES[e.kind].damage;
      state.hp = Math.max(0, state.hp - dmg);
      state.events.push({ type: "leak", damage: dmg, t: state.t });
    }
    state.enemies = state.enemies.filter((e) => e.dist < PATH_LENGTH);
    if (state.hp <= 0) {
      state.downed = true;
      state.enemies = [];
      state.projectiles = [];
      state.queue = [];
      state.phase = "break";
      state.breakLeft = WAVE_BREAK + 2;
      state.events.push({ type: "downed", t: state.t });
      return;
    }
  }

  // Torn
  for (const t of state.towers) {
    const def = TOWERS[t.kind];
    if (t.kind === "bastu") {
      t.incomeTimer -= dt;
      if (t.incomeTimer <= 0) {
        t.incomeTimer = BASTU_INTERVAL;
        const amt = def.income![t.level];
        state.wood += amt;
        state.events.push({ type: "income", x: t.c, y: t.r, amount: amt, t: state.t });
      }
      continue;
    }
    t.cooldown -= dt;
    const range = def.range[t.level];
    let target: Enemy | null = null;
    for (const e of state.enemies) {
      const p = enemyPos(e);
      if (Math.hypot(p.x - t.c, p.y - t.r) <= range && (!target || e.dist > target.dist)) target = e;
    }
    if (target) {
      const p = enemyPos(target);
      t.angle = Math.atan2(p.y - t.r, p.x - t.c);
      if (t.cooldown <= 0) {
        t.cooldown = 1 / def.rate[t.level];
        t.firedAt = state.t;
        state.projectiles.push({
          id: state.nextId++,
          kind: t.kind,
          x: t.c,
          y: t.r - 0.15,
          targetId: target.id,
          tx: p.x,
          ty: p.y,
          speed: t.kind === "bage" ? 9 : t.kind === "snoboll" ? 6.5 : 5,
          damage: def.damage[t.level],
          splash: def.splash?.[t.level] ?? 0,
          slow: def.slow?.[t.level] ?? 0,
        });
      }
    }
  }

  // Projektiler (målsökande)
  const keep: Projectile[] = [];
  for (const pr of state.projectiles) {
    const target = state.enemies.find((e) => e.id === pr.targetId);
    if (target) {
      const p = enemyPos(target);
      pr.tx = p.x;
      pr.ty = p.y;
    }
    const dx = pr.tx - pr.x;
    const dy = pr.ty - pr.y;
    const d = Math.hypot(dx, dy);
    const move = pr.speed * dt;
    if (d <= move + 0.05) {
      hit(state, pr);
    } else {
      pr.x += (dx / d) * move;
      pr.y += (dy / d) * move;
      keep.push(pr);
    }
  }
  state.projectiles = keep;

  // Döda fiender
  const alive: Enemy[] = [];
  for (const e of state.enemies) {
    if (e.hp > 0) alive.push(e);
    else {
      const def = ENEMIES[e.kind];
      const p = enemyPos(e);
      state.wood += def.reward;
      state.score += def.points;
      state.kills += 1;
      state.events.push({ type: "kill", x: p.x, y: p.y, enemy: e.kind, reward: def.reward, t: state.t });
    }
  }
  state.enemies = alive;

  // Rensa gamla effekter
  if (state.events.length > 80) state.events = state.events.filter((ev) => state.t - ev.t < 3);
}

function hit(state: DefenseState, pr: Projectile) {
  state.events.push({ type: "hit", x: pr.tx, y: pr.ty, kind: pr.kind, t: state.t });
  const victims = pr.splash > 0 ? state.enemies.filter((e) => {
    const p = enemyPos(e);
    return Math.hypot(p.x - pr.tx, p.y - pr.ty) <= pr.splash;
  }) : state.enemies.filter((e) => e.id === pr.targetId);
  for (const e of victims) {
    e.hp -= pr.damage;
    e.hitAt = state.t;
    if (pr.slow > 0) {
      e.slowFactor = 1 - pr.slow;
      e.slowUntil = state.t + 1.6;
    }
  }
}

/** Slutpoäng: kills + vågor (redan i score) + rätta svar + kvarvarande liv. */
export function finalScore(state: DefenseState, correct: number): number {
  return state.score + correct * 25 + state.hp * 5;
}

/* ---------- Hjälp för bottar och balans ---------- */

/** Rutor rankade efter hur mycket stig de täcker (för autobygge). */
export function bestSpots(range = 2.4): { c: number; r: number; cover: number }[] {
  const out: { c: number; r: number; cover: number }[] = [];
  const empty = createDefense();
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < ROWS; r++) {
      if (!canBuildAt(empty, c, r)) continue;
      let cover = 0;
      for (let d = 0; d <= PATH_LENGTH; d += 0.25) {
        const p = pathPoint(d);
        if (Math.hypot(p.x - c, p.y - r) <= range) cover++;
      }
      out.push({ c, r, cover });
    }
  }
  return out.sort((a, b) => b.cover - a.cover);
}

/** Enkel bot-strategi: bygg på bästa platsen, annars uppgradera billigast. */
export function botSpend(state: DefenseState, rng: Rng, spots = bestSpots()): void {
  for (let guard = 0; guard < 6; guard++) {
    const free = spots.find((s) => canBuildAt(state, s.c, s.r));
    const nTowers = state.towers.length;
    const kind: TowerKind = nTowers % 4 === 1 ? "snoboll" : nTowers % 4 === 3 ? "lykta" : "bage";
    const upgradable = state.towers
      .filter((t) => t.kind !== "bastu" && upgradeCost(t) !== null)
      .sort((a, b) => (upgradeCost(a) ?? 0) - (upgradeCost(b) ?? 0))[0];
    const preferBuild = nTowers < 6 || rng() < 0.4;
    if (preferBuild && free && state.wood >= TOWERS[kind].cost[0]) {
      build(state, kind, free.c, free.r);
      continue;
    }
    if (upgradable && state.wood >= (upgradeCost(upgradable) ?? Infinity)) {
      upgrade(state, upgradable.id);
      continue;
    }
    break;
  }
}
