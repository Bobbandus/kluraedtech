/**
 * Biljakt – motor.
 *
 * Ren simulering utan DOM. Eleven kör själv runt i en stad (bilen gasar av sig
 * själv) och polisen jagar. En mätare fylls medan man kör; när den är full
 * kommer en fråga. Rätt svar = en stjärna till (poängen) och fler poliser.
 * Fel svar = ingen stjärna och halv mätare. Blir man fast tappar man en stjärna.
 *
 * Staden genereras från ett frö, så alla elever i samma rum kör i samma stad
 * och projektorn kan visa allas positioner på en gemensam karta.
 */

import { mulberry32, type Energy, type Rng } from "./engine.ts";

/* ---------- Stad ---------- */

export const CELL = 64;
export const ROAD = 2; // vägbredd i celler
export const NAV = 32;
export const SIDEWALK = 16;
/** Rondellens yttre radie (asfalt) */
export const ROUNDABOUT_R = 128;

export type BlockKind = "villor" | "lamell" | "affar" | "park" | "parkering";
export type RoofKind = "sadel" | "platt";

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Building extends Rect {
  kind: "villa" | "lamell" | "affar";
  wall: string;
  roof: string;
  roofKind: RoofKind;
  /** Nocken går längs x-axeln (true) eller y-axeln */
  ridgeX: boolean;
  height: number;
  /** Markisfärg för affärer, vilken sida som vetter mot gatan */
  awning?: { color: string; side: "n" | "s" | "w" | "e" };
  seed: number;
}

export interface Tree {
  x: number;
  y: number;
  r: number;
  kind: "lov" | "gran" | "bjork";
  seed: number;
}

export interface Parked {
  x: number;
  y: number;
  a: number;
  model: CarModel;
  color: string;
}

export interface Block extends Rect {
  kind: BlockKind;
}

export type Solid = { t: "r"; x: number; y: number; w: number; h: number } | { t: "c"; x: number; y: number; r: number };

export interface City {
  seed: number;
  cols: number;
  rows: number;
  w: number;
  h: number;
  /** Vägarnas startcell (vägen är ROAD celler bred) */
  roadsX: number[];
  roadsY: number[];
  /** Borttagna vägsträckor: "h:i:j" (horisontell mellan roadsX[i] och [i+1] på roadsY[j]) */
  removed: Set<string>;
  /** 1 = väg för varje cell */
  road: Uint8Array;
  blocks: Block[];
  buildings: Building[];
  trees: Tree[];
  parked: Parked[];
  ponds: { x: number; y: number; rx: number; ry: number }[];
  canal: { y: number; h: number } | null;
  bridges: Rect[];
  islands: { x: number; y: number; r: number }[];
  plazas: Rect[];
  lamps: { x: number; y: number }[];
  solids: Solid[];
  hash: Map<number, number[]>;
  nav: Uint8Array;
  navCols: number;
  navRows: number;
  spawns: { x: number; y: number; a: number }[];
}

const HASH = 128;
const hkey = (cx: number, cy: number) => cx * 4096 + cy;

function addSolid(city: City, s: Solid) {
  const idx = city.solids.push(s) - 1;
  const [x0, y0, x1, y1] = s.t === "r" ? [s.x, s.y, s.x + s.w, s.y + s.h] : [s.x - s.r, s.y - s.r, s.x + s.r, s.y + s.r];
  for (let cx = Math.floor(x0 / HASH); cx <= Math.floor(x1 / HASH); cx++)
    for (let cy = Math.floor(y0 / HASH); cy <= Math.floor(y1 / HASH); cy++) {
      const k = hkey(cx, cy);
      const list = city.hash.get(k);
      if (list) list.push(idx);
      else city.hash.set(k, [idx]);
    }
}

function solidsNear(city: City, x: number, y: number, r: number, out: number[]) {
  out.length = 0;
  for (let cx = Math.floor((x - r) / HASH); cx <= Math.floor((x + r) / HASH); cx++)
    for (let cy = Math.floor((y - r) / HASH); cy <= Math.floor((y + r) / HASH); cy++) {
      const list = city.hash.get(hkey(cx, cy));
      if (list) for (const i of list) if (!out.includes(i)) out.push(i);
    }
  return out;
}

/** Är punkten inne i ett hinder (med marginal)? */
export function blockedAt(city: City, x: number, y: number, margin = 0): boolean {
  if (x < margin || y < margin || x > city.w - margin || y > city.h - margin) return true;
  const near = solidsNear(city, x, y, margin + 2, tmpNear);
  for (const i of near) {
    const s = city.solids[i];
    if (s.t === "r") {
      if (x > s.x - margin && x < s.x + s.w + margin && y > s.y - margin && y < s.y + s.h + margin) return true;
    } else if (Math.hypot(x - s.x, y - s.y) < s.r + margin) return true;
  }
  return false;
}
const tmpNear: number[] = [];

const WALLS = {
  villa: ["#9b3426", "#9b3426", "#d9a441", "#e8e1d0", "#7f9cb0", "#9b3426"],
  lamell: ["#e6d6b3", "#d7a65a", "#b9c9a8", "#b5613f", "#d9cfc2"],
  affar: ["#efe9de", "#c9b49a", "#a95a45", "#e7dcc6"],
};
const ROOFS = {
  villa: ["#3d4248", "#4a3b36", "#a8483a", "#3d4248"],
  platt: ["#8a8f93", "#7d8387", "#a39b8e", "#6d7377", "#8e9a7c", "#b0a796"],
};
const AWNINGS = ["#c7402d", "#2f6db5", "#2c8a57", "#e0a42a", "#7c4ab0"];
export const CAR_COLORS = ["#d9483b", "#2f6db5", "#f0b429", "#2c8a57", "#e9e6df", "#3a3f45", "#7c4ab0", "#e5703a", "#6fb1c8"];

export type CarModel = "halvkombi" | "kombi" | "sport" | "pickup" | "polis";

function pickR<T>(rng: Rng, list: readonly T[]): T {
  return list[Math.floor(rng() * list.length)];
}

function overlaps(a: Rect, b: Rect, pad = 0) {
  return a.x < b.x + b.w + pad && a.x + a.w + pad > b.x && a.y < b.y + b.h + pad && a.y + a.h + pad > b.y;
}

export function createCity(seed: number): City {
  const rng = mulberry32(seed ^ 0x5eed);
  // Vägpositioner med varierande kvartersstorlek
  const lines = () => {
    const out: number[] = [1];
    const sizes = [5, 6, 5, 7, 6, 5];
    let p = 1;
    while (true) {
      const next = p + ROAD + sizes[Math.floor(rng() * sizes.length)];
      if (next > 40) break;
      out.push(next);
      p = next;
    }
    return out;
  };
  const roadsX = lines();
  const roadsY = lines();
  const cols = roadsX[roadsX.length - 1] + ROAD + 1;
  const rows = roadsY[roadsY.length - 1] + ROAD + 1;
  const city: City = {
    seed,
    cols,
    rows,
    w: cols * CELL,
    h: rows * CELL,
    roadsX,
    roadsY,
    removed: new Set(),
    road: new Uint8Array(cols * rows),
    blocks: [],
    buildings: [],
    trees: [],
    parked: [],
    ponds: [],
    canal: null,
    bridges: [],
    islands: [],
    plazas: [],
    lamps: [],
    solids: [],
    hash: new Map(),
    nav: new Uint8Array(0),
    navCols: 0,
    navRows: 0,
    spawns: [],
  };
  const setRoad = (c: number, r: number) => {
    if (c >= 0 && r >= 0 && c < cols && r < rows) city.road[r * cols + c] = 1;
  };
  const nx = roadsX.length;
  const ny = roadsY.length;

  // Ta bort några inre vägsträckor så att kvarteren blir olika stora
  const removable: string[] = [];
  for (let j = 1; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) removable.push(`h:${i}:${j}`);
  for (let i = 1; i < nx - 1; i++) for (let j = 0; j < ny - 1; j++) removable.push(`v:${i}:${j}`);
  const mergedBlock = new Set<string>();
  for (const key of removable) {
    if (rng() > 0.14) continue;
    const [d, a, b] = key.split(":");
    const i = Number(a);
    const j = Number(b);
    // h:i:j skiljer kvarter (i, j-1) och (i, j); v:i:j skiljer (i-1, j) och (i, j)
    const b1 = d === "h" ? `${i}:${j - 1}` : `${i - 1}:${j}`;
    const b2 = d === "h" ? `${i}:${j}` : `${i}:${j}`;
    if (mergedBlock.has(b1) || mergedBlock.has(b2)) continue;
    mergedBlock.add(b1);
    mergedBlock.add(b2);
    city.removed.add(key);
  }

  // Lägg vägceller
  for (let j = 0; j < ny; j++)
    for (let i = 0; i < nx - 1; i++) {
      if (city.removed.has(`h:${i}:${j}`)) continue;
      for (let c = roadsX[i]; c < roadsX[i + 1] + ROAD; c++) for (let k = 0; k < ROAD; k++) setRoad(c, roadsY[j] + k);
    }
  for (let i = 0; i < nx; i++)
    for (let j = 0; j < ny - 1; j++) {
      if (city.removed.has(`v:${i}:${j}`)) continue;
      for (let r = roadsY[j]; r < roadsY[j + 1] + ROAD; r++) for (let k = 0; k < ROAD; k++) setRoad(roadsX[i] + k, r);
    }

  // Kvarter (sammanslagna där en väg tagits bort)
  const blockRect = (i: number, j: number): Rect => ({
    x: (roadsX[i] + ROAD) * CELL,
    y: (roadsY[j] + ROAD) * CELL,
    w: (roadsX[i + 1] - roadsX[i] - ROAD) * CELL,
    h: (roadsY[j + 1] - roadsY[j] - ROAD) * CELL,
  });
  const used = new Set<string>();
  const rects: Rect[] = [];
  for (let j = 0; j < ny - 1; j++)
    for (let i = 0; i < nx - 1; i++) {
      if (used.has(`${i}:${j}`)) continue;
      let r = blockRect(i, j);
      if (city.removed.has(`h:${i}:${j + 1}`) && j + 1 < ny - 1) {
        const o = blockRect(i, j + 1);
        r = { x: r.x, y: r.y, w: r.w, h: o.y + o.h - r.y };
        used.add(`${i}:${j + 1}`);
      } else if (city.removed.has(`v:${i + 1}:${j}`) && i + 1 < nx - 1) {
        const o = blockRect(i + 1, j);
        r = { x: r.x, y: r.y, w: o.x + o.w - r.x, h: r.h };
        used.add(`${i + 1}:${j}`);
      }
      used.add(`${i}:${j}`);
      rects.push(r);
    }

  // Kanal genom en kvartersrad med plats för den
  const canalRows = [];
  for (let j = 1; j < ny - 2; j++) if (roadsY[j + 1] - roadsY[j] - ROAD >= 6) canalRows.push(j);
  if (canalRows.length) {
    const j = pickR(rng, canalRows);
    const top = roadsY[j] + ROAD;
    const size = roadsY[j + 1] - top;
    const cy = (top + Math.floor(size / 2) - 0.5) * CELL;
    city.canal = { y: cy, h: CELL };
    // Kvarteren i raden delas av kanalen
    for (let k = rects.length - 1; k >= 0; k--) {
      const r = rects[k];
      if (r.y < cy && r.y + r.h > cy + CELL) {
        rects.splice(k, 1, { x: r.x, y: r.y, w: r.w, h: cy - r.y - 8 }, { x: r.x, y: cy + CELL + 8, w: r.w, h: r.y + r.h - cy - CELL - 8 });
      }
    }
    // Broar där vertikala vägar korsar
    for (let i = 0; i < nx; i++) city.bridges.push({ x: roadsX[i] * CELL, y: cy - 8, w: ROAD * CELL, h: CELL + 16 });
    // Vattnet är ett hinder utom på broarna
    let x = 0;
    for (const b of city.bridges) {
      if (b.x > x) addSolid(city, { t: "r", x, y: cy, w: b.x - x, h: CELL });
      x = b.x + b.w;
    }
    if (x < city.w) addSolid(city, { t: "r", x, y: cy, w: city.w - x, h: CELL });
  }

  // Rondeller i några korsningar där alla fyra vägar finns
  const cands: [number, number][] = [];
  for (let i = 1; i < nx - 1; i++)
    for (let j = 1; j < ny - 1; j++) {
      const all = !city.removed.has(`h:${i - 1}:${j}`) && !city.removed.has(`h:${i}:${j}`) && !city.removed.has(`v:${i}:${j - 1}`) && !city.removed.has(`v:${i}:${j}`);
      const cx = (roadsX[i] + 1) * CELL;
      const cy = (roadsY[j] + 1) * CELL;
      const nearCanal = city.canal && Math.abs(cy - city.canal.y) < CELL * 4;
      if (all && !nearCanal) cands.push([i, j]);
    }
  for (let n = 0; n < 3 && cands.length; n++) {
    const [i, j] = cands.splice(Math.floor(rng() * cands.length), 1)[0];
    if (city.islands.some((o) => Math.abs(o.x - (roadsX[i] + 1) * CELL) < CELL * 9 && Math.abs(o.y - (roadsY[j] + 1) * CELL) < CELL * 9)) continue;
    const x = (roadsX[i] + 1) * CELL;
    const y = (roadsY[j] + 1) * CELL;
    city.islands.push({ x, y, r: 54 });
    city.plazas.push({ x: x - ROUNDABOUT_R, y: y - ROUNDABOUT_R, w: ROUNDABOUT_R * 2, h: ROUNDABOUT_R * 2 });
    addSolid(city, { t: "c", x, y, r: 54 });
  }

  // Innehåll i kvarteren
  const weights: [BlockKind, number][] = [
    ["villor", 0.3],
    ["lamell", 0.24],
    ["affar", 0.16],
    ["park", 0.16],
    ["parkering", 0.14],
  ];
  for (const r of rects) {
    let roll = rng();
    let kind: BlockKind = "villor";
    for (const [k, w] of weights) {
      if ((roll -= w) <= 0) {
        kind = k;
        break;
      }
    }
    if (r.w < CELL * 3 || r.h < CELL * 3) kind = "park";
    city.blocks.push({ ...r, kind });
    fillBlock(city, rng, r, kind);
  }

  // Gatlampor längs vägkanterna
  for (let j = 0; j < ny; j++)
    for (let i = 0; i < nx - 1; i++) {
      if (city.removed.has(`h:${i}:${j}`)) continue;
      const x0 = (roadsX[i] + ROAD) * CELL;
      const x1 = roadsX[i + 1] * CELL;
      for (let x = x0 + 96; x < x1 - 48; x += 192) {
        city.lamps.push({ x, y: roadsY[j] * CELL - 6 });
        city.lamps.push({ x: x + 96, y: (roadsY[j] + ROAD) * CELL + 6 });
      }
    }

  // Bilar parkerade längs trottoarkanten (går att byta till)
  for (let j = 0; j < ny; j++)
    for (let i = 0; i < nx - 1; i++) {
      if (city.removed.has(`h:${i}:${j}`) || rng() > 0.4) continue;
      const x0 = (roadsX[i] + ROAD) * CELL + 70;
      const x1 = roadsX[i + 1] * CELL - 70;
      const side = rng() < 0.5;
      const y = roadsY[j] * CELL + (side ? 15 : ROAD * CELL - 15);
      for (let x = x0; x < x1; x += 120 + rng() * 120) {
        if (city.plazas.some((q) => Math.abs(q.x + q.w / 2 - x) < q.w / 2 + 40 && Math.abs(q.y + q.h / 2 - y) < q.h / 2 + 40)) continue;
        if (city.canal && Math.abs(y - city.canal.y - city.canal.h / 2) < CELL) continue;
        city.parked.push({ x, y, a: side ? 0 : Math.PI, model: rng() < 0.5 ? "halvkombi" : rng() < 0.5 ? "kombi" : "sport", color: pickR(rng, CAR_COLORS) });
      }
    }

  // Kanten runt staden
  addSolid(city, { t: "r", x: -200, y: -200, w: city.w + 400, h: 200 + CELL });
  addSolid(city, { t: "r", x: -200, y: city.h - CELL, w: city.w + 400, h: 200 + CELL });
  addSolid(city, { t: "r", x: -200, y: -200, w: 200 + CELL, h: city.h + 400 });
  addSolid(city, { t: "r", x: city.w - CELL, y: -200, w: 200 + CELL, h: city.h + 400 });

  // Navigeringsnät för polisen
  city.navCols = Math.ceil(city.w / NAV);
  city.navRows = Math.ceil(city.h / NAV);
  city.nav = new Uint8Array(city.navCols * city.navRows);
  for (let r = 0; r < city.navRows; r++)
    for (let c = 0; c < city.navCols; c++) {
      const x = c * NAV + NAV / 2;
      const y = r * NAV + NAV / 2;
      city.nav[r * city.navCols + c] = blockedAt(city, x, y, 14) ? 0 : 1;
    }

  // Startpunkter mitt i körfälten
  for (let j = 0; j < ny; j++)
    for (let i = 0; i < nx - 1; i++) {
      if (city.removed.has(`h:${i}:${j}`)) continue;
      const y = roadsY[j] * CELL + CELL * 1.5;
      const x = (roadsX[i] + ROAD) * CELL + (roadsX[i + 1] - roadsX[i] - ROAD) * CELL * 0.5;
      if (!blockedAt(city, x, y, 20)) city.spawns.push({ x, y, a: 0 });
    }
  for (let i = 0; i < nx; i++)
    for (let j = 0; j < ny - 1; j++) {
      if (city.removed.has(`v:${i}:${j}`)) continue;
      const x = roadsX[i] * CELL + CELL * 0.5;
      const y = (roadsY[j] + ROAD) * CELL + (roadsY[j + 1] - roadsY[j] - ROAD) * CELL * 0.5;
      if (!blockedAt(city, x, y, 20)) city.spawns.push({ x, y, a: Math.PI / 2 });
    }
  return city;
}

function fillBlock(city: City, rng: Rng, block: Rect, kind: BlockKind) {
  const inner = { x: block.x + SIDEWALK, y: block.y + SIDEWALK, w: block.w - SIDEWALK * 2, h: block.h - SIDEWALK * 2 };
  const clearOfPlaza = (r: Rect) => !city.plazas.some((p) => overlaps(r, p, 10));
  const addBuilding = (b: Building) => {
    if (!clearOfPlaza(b)) return false;
    city.buildings.push(b);
    addSolid(city, { t: "r", x: b.x, y: b.y, w: b.w, h: b.h });
    return true;
  };
  const addTree = (x: number, y: number, r: number, k: Tree["kind"]) => {
    const rect = { x: x - r, y: y - r, w: r * 2, h: r * 2 };
    if (!clearOfPlaza(rect)) return;
    if (city.buildings.some((b) => overlaps(rect, b, 4))) return;
    if (city.trees.some((t) => Math.hypot(t.x - x, t.y - y) < t.r + r - 6)) return;
    city.trees.push({ x, y, r, kind: k, seed: Math.floor(rng() * 1e6) });
    addSolid(city, { t: "c", x, y, r: r * 0.55 });
  };
  const seed = () => Math.floor(rng() * 1e6);

  if (kind === "villor") {
    const nx = Math.max(1, Math.floor(inner.w / 128));
    const ny = Math.max(1, Math.floor(inner.h / 128));
    const lw = inner.w / nx;
    const lh = inner.h / ny;
    for (let i = 0; i < nx; i++)
      for (let j = 0; j < ny; j++) {
        const lot = { x: inner.x + i * lw, y: inner.y + j * lh, w: lw, h: lh };
        const wide = rng() < 0.5;
        const w = Math.min(lw - 30, wide ? 78 + rng() * 12 : 58 + rng() * 10);
        const h = Math.min(lh - 34, wide ? 56 + rng() * 10 : 72 + rng() * 12);
        const x = lot.x + (lot.w - w) / 2 + (rng() - 0.5) * 18;
        const y = lot.y + (lot.h - h) / 2 + (rng() - 0.5) * 18;
        addBuilding({ x, y, w, h, kind: "villa", wall: pickR(rng, WALLS.villa), roof: pickR(rng, ROOFS.villa), roofKind: "sadel", ridgeX: w > h, height: 20, seed: seed() });
        // Trädgårdsträd i ett hörn
        const cx = rng() < 0.5 ? lot.x + 22 : lot.x + lot.w - 22;
        const cy = rng() < 0.5 ? lot.y + 22 : lot.y + lot.h - 22;
        if (rng() < 0.75) addTree(cx, cy, 18 + rng() * 6, rng() < 0.3 ? "bjork" : "lov");
      }
  } else if (kind === "lamell") {
    const horiz = inner.w >= inner.h;
    const len = horiz ? inner.w : inner.h;
    const span = horiz ? inner.h : inner.w;
    const count = span > 260 ? 2 : 1;
    const depth = 78;
    const wall = pickR(rng, WALLS.lamell);
    for (let k = 0; k < count; k++) {
      const off = count === 1 ? (span - depth) / 2 : k === 0 ? 14 : span - depth - 14;
      const total = len - 40;
      const parts = total > 420 ? 3 : total > 240 ? 2 : 1;
      const gap = 34;
      const l = (total - gap * (parts - 1)) / parts;
      const roof = pickR(rng, ROOFS.platt);
      for (let q = 0; q < parts; q++) {
        const o = 20 + q * (l + gap);
        const b: Building = horiz
          ? { x: inner.x + o, y: inner.y + off, w: l, h: depth, kind: "lamell", wall, roof, roofKind: "platt", ridgeX: true, height: 30, seed: seed() }
          : { x: inner.x + off, y: inner.y + o, w: depth, h: l, kind: "lamell", wall, roof, roofKind: "platt", ridgeX: false, height: 30, seed: seed() };
        addBuilding(b);
      }
    }
    // Gård med träd
    for (let k = 0; k < 6; k++) addTree(inner.x + 30 + rng() * (inner.w - 60), inner.y + 30 + rng() * (inner.h - 60), 20 + rng() * 6, rng() < 0.4 ? "bjork" : "lov");
  } else if (kind === "affar") {
    const d = 70;
    const awn = () => pickR(rng, AWNINGS);
    const seg = (len: number) => {
      const out: number[] = [];
      let p = 0;
      while (p < len - 60) {
        const s = Math.min(len - p, 90 + rng() * 70);
        out.push(s);
        p += s;
      }
      return out;
    };
    let p = inner.x;
    for (const s of seg(inner.w)) {
      addBuilding({ x: p + 2, y: inner.y, w: s - 4, h: d, kind: "affar", wall: pickR(rng, WALLS.affar), roof: pickR(rng, ROOFS.platt), roofKind: "platt", ridgeX: true, height: 20, awning: { color: awn(), side: "n" }, seed: seed() });
      p += s;
    }
    p = inner.x;
    for (const s of seg(inner.w)) {
      addBuilding({ x: p + 2, y: inner.y + inner.h - d, w: s - 4, h: d, kind: "affar", wall: pickR(rng, WALLS.affar), roof: pickR(rng, ROOFS.platt), roofKind: "platt", ridgeX: true, height: 20, awning: { color: awn(), side: "s" }, seed: seed() });
      p += s;
    }
    // Innergård: parkering
    const yard = { x: inner.x + 10, y: inner.y + d + 14, w: inner.w - 20, h: inner.h - d * 2 - 28 };
    if (yard.h > 60) parkingRows(city, rng, yard);
  } else if (kind === "park") {
    if (inner.w > 200 && inner.h > 200 && rng() < 0.7) {
      const pond = { x: inner.x + inner.w / 2 + (rng() - 0.5) * 40, y: inner.y + inner.h / 2 + (rng() - 0.5) * 40, rx: 50 + rng() * 30, ry: 34 + rng() * 18 };
      if (clearOfPlaza({ x: pond.x - pond.rx, y: pond.y - pond.ry, w: pond.rx * 2, h: pond.ry * 2 })) {
        city.ponds.push(pond);
        addSolid(city, { t: "c", x: pond.x, y: pond.y, r: Math.min(pond.rx, pond.ry) * 0.9 });
        // Ellipsen approximeras med två cirklar till
        addSolid(city, { t: "c", x: pond.x - pond.rx * 0.45, y: pond.y, r: pond.ry * 0.85 });
        addSolid(city, { t: "c", x: pond.x + pond.rx * 0.45, y: pond.y, r: pond.ry * 0.85 });
      }
    }
    const n = Math.floor((inner.w * inner.h) / 9000);
    for (let k = 0; k < n; k++) {
      const x = inner.x + 20 + rng() * (inner.w - 40);
      const y = inner.y + 20 + rng() * (inner.h - 40);
      if (city.ponds.some((p) => ((x - p.x) / (p.rx + 26)) ** 2 + ((y - p.y) / (p.ry + 26)) ** 2 < 1)) continue;
      addTree(x, y, 18 + rng() * 10, rng() < 0.35 ? "gran" : rng() < 0.3 ? "bjork" : "lov");
    }
  } else {
    parkingRows(city, rng, { x: inner.x + 8, y: inner.y + 8, w: inner.w - 16, h: inner.h - 16 });
  }
}

function parkingRows(city: City, rng: Rng, area: Rect) {
  // Rader med fickor (bilar står vinkelrätt). Gång i mitten.
  const bay = 34;
  const depth = 60;
  for (let y = area.y + 6; y + depth <= area.y + area.h; y += depth + 64) {
    for (let x = area.x + 10; x + bay <= area.x + area.w - 10; x += bay) {
      if (rng() < 0.55) {
        const p: Parked = { x: x + bay / 2, y: y + depth / 2, a: rng() < 0.5 ? Math.PI / 2 : -Math.PI / 2, model: rng() < 0.6 ? "halvkombi" : rng() < 0.6 ? "kombi" : "pickup", color: pickR(rng, CAR_COLORS) };
        if (city.plazas.some((q) => overlaps({ x: x, y, w: bay, h: depth }, q, 6))) continue;
        city.parked.push(p);
      }
    }
  }
}

/* ---------- Bilar ---------- */

export interface Car {
  x: number;
  y: number;
  a: number;
  vx: number;
  vy: number;
  /** Utjämnad styrning -1..1 (för hjulens vinkel) */
  steer: number;
  braking: boolean;
  /** Sidled-hastighet, för sladdspår och rök */
  slip: number;
  model: CarModel;
  color: string;
  /** Polis: tid fast mot vägg, backtid, tid till nästa skott */
  stuck: number;
  reverse: number;
  fireCd: number;
  /** Polis: konstapeln är ute ur bilen / tid tills hen får kliva ur igen */
  out?: boolean;
  exitCd?: number;
  /** Polis: egen sökpunkt när spåret är tappat */
  search?: { x: number; y: number; t: number };
  id: number;
}

export interface CarSpec {
  accel: number;
  vmax: number;
  turn: number;
  grip: number;
}

export const PLAYER_SPEC: CarSpec = { accel: 380, vmax: 410, turn: 3.4, grip: 10 };

/** Spelarens bil: lite lugnare i början, snabbare ju fler stjärnor man har. */
export function playerSpec(s: { stars: number; energy: Energy }): CarSpec {
  const base = s.energy === "lugn" ? 305 : s.energy === "fullfart" ? 370 : 335;
  return { ...PLAYER_SPEC, vmax: Math.min(PLAYER_SPEC.vmax, base + s.stars * 6) };
}
export const CAR_RADIUS = 17;
export const FOOT_RADIUS = 8;
export const WALK_SPEED = 150;
export const GHOST_SPEED = 430;
export const GHOST_TIME = 5;
export const GHOST_HOLD = 0.6;
export const GHOST_COOLDOWN = 16;
export const LOSE_TIME = 6;
export const CAR_HP = 100;
export const BULLET_DAMAGE = 6;
export const ENTER_RANGE = 48;

export interface EnergyTuning {
  heatBase: number;
  policeStart: number;
  policePerStar: number;
  policeMax: number;
  policeSpeed: number;
  /** Från hur många stjärnor polisen skjuter mot bilen (till fots skjuter de alltid) */
  shootFrom: number;
}

export const TUNING: Record<Energy, EnergyTuning> = {
  lugn: { heatBase: 1 / 13, policeStart: 1, policePerStar: 0.34, policeMax: 4, policeSpeed: 0.82, shootFrom: 4 },
  standard: { heatBase: 1 / 11, policeStart: 1, policePerStar: 0.5, policeMax: 6, policeSpeed: 0.88, shootFrom: 2 },
  fullfart: { heatBase: 1 / 9, policeStart: 2, policePerStar: 0.67, policeMax: 8, policeSpeed: 0.94, shootFrom: 1 },
};

export function policeSpec(stars: number, t: EnergyTuning, playerVmax = PLAYER_SPEC.vmax): CarSpec {
  const k = Math.min(1.02, t.policeSpeed + stars * 0.012);
  return { accel: 430, vmax: playerVmax * k, turn: 3.5, grip: 10 };
}

/** Poäng: stjärnorna är en multiplikator, inte själva poängen. */
export const multiplier = (stars: number) => 1 + stars * 0.5;
export const POINTS = { perSecond: 3, nearMiss: 25, correct: 100, escape: 150 };

/* ---------- Tillstånd ---------- */

export type ChasePhase = "drive" | "question" | "busted";
export type BodyMode = "car" | "foot" | "ghost";

export interface ChaseEvent {
  t: number;
  kind: "crash" | "busted" | "respawn" | "star" | "miss" | "spawn" | "nearmiss" | "boost" | "shot" | "hit" | "escape" | "ghost" | "possess" | "exit" | "enter" | "wreck" | "spotted" | "officer" | "knock";
  x: number;
  y: number;
  power: number;
}

export interface ParkedCar {
  id: number;
  x: number;
  y: number;
  a: number;
  model: CarModel;
  color: string;
}

/** Polis till fots: kliver ur bilen, springer efter dig och skjuter. */
export interface Officer {
  id: number;
  carId: number;
  x: number;
  y: number;
  a: number;
  vx: number;
  vy: number;
  fireCd: number;
  /** Omkullkörd: ligger ner i några sekunder */
  down: number;
  /** På väg tillbaka till bilen */
  returning: boolean;
  outT: number;
}

export const OFFICER_SPEED = 170;

export interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
}

export interface ChaseState {
  city: City;
  t: number;
  rng: Rng;
  energy: Energy;
  tuning: EnergyTuning;
  /** Spelarens bil (används också som position till fots/spöke) */
  player: Car;
  mode: BodyMode;
  hp: number;
  /** Till fots eller som spöke: egen position och riktning */
  body: { x: number; y: number; a: number; vx: number; vy: number };
  /** Bilen man lämnade (id i parked) – spöket återvänder dit om tiden tar slut */
  homeCar: number | null;
  ghostT: number;
  ghostHold: number;
  ghostCd: number;
  parked: ParkedCar[];
  bullets: Bullet[];
  police: Car[];
  officers: Officer[];
  stars: number;
  bestStars: number;
  score: number;
  busts: number;
  escapes: number;
  /** Tappade senaste fasttagningen en stjärna? */
  lostStar: boolean;
  heat: number;
  phase: ChasePhase;
  /** 0..1 – hur nära man är att åka fast */
  bust: number;
  bustedT: number;
  invuln: number;
  boost: number;
  nearCd: number;
  /** Sekunder sedan någon polis såg dig */
  unseen: number;
  /** Polisen har tappat spåret */
  lost: boolean;
  lastKnown: { x: number; y: number };
  input: { steer: number; brake: boolean; ghost: boolean };
  events: ChaseEvent[];
  flow: Int32Array;
  flowAt: number;
  flowFrom: number;
  /** Tidsskala (slowmotion under frågor) */
  timeScale: number;
  nextId: number;
}

export const BUST_TIME = 1.8;
export const BUSTED_PAUSE = 2.6;
export const RESPAWN_INVULN = 3;
export const QUESTION_SLOWMO = 0.12;
export const READ_LOCK = 0.8;
export const FEEDBACK_CORRECT = 0.9;
export const FEEDBACK_WRONG = 4;

function mkCar(id: number, x: number, y: number, a: number, model: CarModel, color: string): Car {
  return { id, x, y, a, vx: 0, vy: 0, steer: 0, braking: false, slip: 0, model, color, stuck: 0, reverse: 0, fireCd: 1.5 };
}

export function createChase(seed: number, energy: Energy = "standard", citySeed = seed): ChaseState {
  const city = createCity(citySeed);
  const rng = mulberry32(seed);
  const central = city.spawns.filter((p) => Math.abs(p.x / city.w - 0.5) < 0.3 && Math.abs(p.y / city.h - 0.5) < 0.3);
  const pool = central.length ? central : city.spawns;
  const sp = pool[Math.floor(rng() * pool.length)];
  let nextId = 1;
  const s: ChaseState = {
    city,
    t: 0,
    rng,
    energy,
    tuning: TUNING[energy],
    player: mkCar(0, sp.x, sp.y, sp.a, "sport", "#7a3fd1"),
    mode: "car",
    hp: CAR_HP,
    body: { x: sp.x, y: sp.y, a: sp.a, vx: 0, vy: 0 },
    homeCar: null,
    ghostT: 0,
    ghostHold: 0,
    ghostCd: 0,
    parked: city.parked.map((p) => ({ ...p, id: 1000 + nextId++ })),
    bullets: [],
    police: [],
    officers: [],
    stars: 0,
    bestStars: 0,
    score: 0,
    busts: 0,
    escapes: 0,
    lostStar: false,
    heat: 0,
    phase: "drive",
    bust: 0,
    bustedT: 0,
    invuln: RESPAWN_INVULN,
    boost: 0,
    nearCd: 0,
    unseen: 0,
    lost: false,
    lastKnown: { x: sp.x, y: sp.y },
    input: { steer: 0, brake: false, ghost: false },
    events: [],
    flow: new Int32Array(city.navCols * city.navRows),
    flowAt: -1,
    flowFrom: -1,
    timeScale: 1,
    nextId: 1,
  };
  syncPolice(s);
  return s;
}

export function wantedPolice(s: ChaseState) {
  const t = s.tuning;
  return Math.min(t.policeMax, Math.floor(t.policeStart + s.stars * t.policePerStar));
}

/** Var spelaren är just nu (bil, till fots eller spöke). */
export function playerPos(s: ChaseState): { x: number; y: number; a: number; vx: number; vy: number } {
  return s.mode === "car" ? s.player : s.body;
}

/** Hitta en vägpunkt på lagom avstånd från spelaren. */
function spawnPoint(s: ChaseState, minD: number, maxD: number) {
  const { spawns } = s.city;
  const me = playerPos(s);
  let best = spawns[0];
  let bestScore = Infinity;
  for (let k = 0; k < 40; k++) {
    const p = spawns[Math.floor(s.rng() * spawns.length)];
    const d = Math.hypot(p.x - me.x, p.y - me.y);
    const score = d < minD ? minD - d + 1000 : d > maxD ? d - maxD : 0;
    if (score < bestScore && !s.police.some((q) => Math.hypot(q.x - p.x, q.y - p.y) < 120)) {
      bestScore = score;
      best = p;
      if (score === 0) break;
    }
  }
  return best;
}

function syncPolice(s: ChaseState) {
  const want = wantedPolice(s);
  const me = playerPos(s);
  while (s.police.length < want) {
    const p = spawnPoint(s, 650, 1100);
    const a = Math.atan2(me.y - p.y, me.x - p.x);
    s.police.push(mkCar(s.nextId++, p.x, p.y, Math.round(a / (Math.PI / 2)) * (Math.PI / 2), "polis", "#ffffff"));
    s.events.push({ t: s.t, kind: "spawn", x: p.x, y: p.y, power: 1 });
  }
}

/* ---------- Fysik ---------- */

const wrap = (a: number) => {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
};

function grassAt(city: City, x: number, y: number) {
  const c = Math.floor(x / CELL);
  const r = Math.floor(y / CELL);
  if (c < 0 || r < 0 || c >= city.cols || r >= city.rows) return false;
  if (city.road[r * city.cols + c]) return false;
  if (city.islands.some((i) => Math.hypot(x - i.x, y - i.y) < ROUNDABOUT_R)) return false;
  return city.blocks.some((b) => (b.kind === "park" || b.kind === "villor" || b.kind === "lamell") && x > b.x + SIDEWALK && x < b.x + b.w - SIDEWALK && y > b.y + SIDEWALK && y < b.y + b.h - SIDEWALK);
}

function drive(s: ChaseState, car: Car, spec: CarSpec, steerIn: number, brake: boolean, dt: number, throttle = 1) {
  const fx = Math.cos(car.a);
  const fy = Math.sin(car.a);
  let vf = car.vx * fx + car.vy * fy;
  let vl = -car.vx * fy + car.vy * fx;
  car.steer += (steerIn - car.steer) * Math.min(1, dt * 10);
  const grass = grassAt(s.city, car.x, car.y);
  const vmax = spec.vmax * (grass ? 0.62 : 1);
  car.braking = brake;
  if (brake) {
    if (vf > 30) vf -= 980 * dt;
    else vf = Math.max(-160, vf - 360 * dt);
  } else if (vf < vmax) vf = Math.min(vmax, vf + spec.accel * throttle * dt * (vf < 0 ? 2.5 : 1));
  else vf -= (vf - vmax) * Math.min(1, dt * 3);
  vf -= vf * (grass ? 0.9 : 0.12) * dt;
  // Svängning: kräver fart, lite trögare i hög fart
  const speedK = Math.min(1, Math.abs(vf) / 160);
  const turn = spec.turn * (1 - 0.22 * Math.min(1, Math.abs(vf) / spec.vmax));
  car.a = wrap(car.a + car.steer * turn * speedK * Math.sign(vf || 1) * dt);
  // Grepp – hårda svängar i hög fart ger sladd
  const driftK = Math.min(1, Math.max(0, (Math.abs(vf) - 230) / 160)) * Math.abs(car.steer);
  const grip = spec.grip * (1 - 0.62 * driftK) * (grass ? 0.7 : 1);
  vl *= Math.exp(-grip * dt);
  const nfx = Math.cos(car.a);
  const nfy = Math.sin(car.a);
  car.vx = nfx * vf - nfy * vl;
  car.vy = nfy * vf + nfx * vl;
  car.slip = vl;
  car.x += car.vx * dt;
  car.y += car.vy * dt;
  return collideWorld(s, car, CAR_RADIUS);
}

const near: number[] = [];
type Mover = { x: number; y: number; vx: number; vy: number };

function pushOut(o: Mover, nx: number, ny: number, pen: number): number {
  o.x += nx * pen;
  o.y += ny * pen;
  const vn = o.vx * nx + o.vy * ny;
  if (vn < 0) {
    o.vx -= vn * nx * 1.3;
    o.vy -= vn * ny * 1.3;
    o.vx *= 0.9;
    o.vy *= 0.9;
    return -vn;
  }
  return 0;
}

/** Knuffa ut ur hinder (hus, träd, vatten, parkerade bilar). Returnerar krockens styrka. */
function collideWorld(s: ChaseState, car: Mover, R: number): number {
  let hit = 0;
  solidsNear(s.city, car.x, car.y, R + 4, near);
  for (const i of near) {
    const o = s.city.solids[i];
    if (o.t === "r") {
      const cx = Math.max(o.x, Math.min(car.x, o.x + o.w));
      const cy = Math.max(o.y, Math.min(car.y, o.y + o.h));
      const dx = car.x - cx;
      const dy = car.y - cy;
      const d = Math.hypot(dx, dy);
      if (d >= R) continue;
      if (d > 0.001) hit = Math.max(hit, pushOut(car, dx / d, dy / d, R - d));
      else {
        // Mitten är inne i rektangeln – ut genom närmaste sida
        const l = car.x - o.x;
        const r = o.x + o.w - car.x;
        const t = car.y - o.y;
        const b = o.y + o.h - car.y;
        const m = Math.min(l, r, t, b);
        if (m === l) hit = Math.max(hit, pushOut(car, -1, 0, l + R));
        else if (m === r) hit = Math.max(hit, pushOut(car, 1, 0, r + R));
        else if (m === t) hit = Math.max(hit, pushOut(car, 0, -1, t + R));
        else hit = Math.max(hit, pushOut(car, 0, 1, b + R));
      }
    } else {
      const dx = car.x - o.x;
      const dy = car.y - o.y;
      const d = Math.hypot(dx, dy);
      if (d >= R + o.r) continue;
      hit = Math.max(hit, pushOut(car, d > 0.001 ? dx / d : 1, d > 0.001 ? dy / d : 0, R + o.r - d));
    }
  }
  // Parkerade bilar: två cirklar längs bilen
  for (const p of s.parked) {
    if (Math.abs(p.x - car.x) > 60 || Math.abs(p.y - car.y) > 60) continue;
    for (const k of [-12, 12]) {
      const cx = p.x + Math.cos(p.a) * k;
      const cy = p.y + Math.sin(p.a) * k;
      const dx = car.x - cx;
      const dy = car.y - cy;
      const d = Math.hypot(dx, dy);
      const min = R + 13;
      if (d < min) hit = Math.max(hit, pushOut(car, d > 0.001 ? dx / d : 1, d > 0.001 ? dy / d : 0, min - d));
    }
  }
  return hit;
}

function collideCars(a: Mover, b: Mover, ra = CAR_RADIUS, rb = CAR_RADIUS): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const d = Math.hypot(dx, dy);
  const min = ra + rb - 2;
  if (d >= min || d < 0.001) return 0;
  const nx = dx / d;
  const ny = dy / d;
  const pen = (min - d) / 2;
  a.x -= nx * pen;
  a.y -= ny * pen;
  b.x += nx * pen;
  b.y += ny * pen;
  const rel = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
  if (rel < 0) {
    const j = -rel * 0.6;
    a.vx -= nx * j;
    a.vy -= ny * j;
    b.vx += nx * j;
    b.vy += ny * j;
  }
  return Math.max(0, -rel);
}

/* ---------- Polisens vägval ---------- */

function navIndex(city: City, x: number, y: number) {
  const c = Math.max(0, Math.min(city.navCols - 1, Math.floor(x / NAV)));
  const r = Math.max(0, Math.min(city.navRows - 1, Math.floor(y / NAV)));
  return r * city.navCols + c;
}

function nearestOpen(city: City, idx: number) {
  if (city.nav[idx]) return idx;
  const c0 = idx % city.navCols;
  const r0 = Math.floor(idx / city.navCols);
  for (let rad = 1; rad < 6; rad++)
    for (let dc = -rad; dc <= rad; dc++)
      for (let dr = -rad; dr <= rad; dr++) {
        const c = c0 + dc;
        const r = r0 + dr;
        if (c < 0 || r < 0 || c >= city.navCols || r >= city.navRows) continue;
        const k = r * city.navCols + c;
        if (city.nav[k]) return k;
      }
  return idx;
}

const queue = new Int32Array(1 << 16);
/** Flödesfält mot målet (spelaren, eller senast kända plats om spåret är tappat). */
function updateFlow(s: ChaseState) {
  const city = s.city;
  const target = s.lost ? s.lastKnown : playerPos(s);
  const goal = nearestOpen(city, navIndex(city, target.x, target.y));
  if (goal === s.flowFrom && s.t - s.flowAt < 0.6) return;
  s.flowFrom = goal;
  s.flowAt = s.t;
  const flow = s.flow;
  flow.fill(-1);
  let head = 0;
  let tail = 0;
  flow[goal] = 0;
  queue[tail++] = goal;
  const C = city.navCols;
  while (head < tail) {
    const k = queue[head++];
    const c = k % C;
    const r = (k / C) | 0;
    const d = flow[k] + 1;
    if (c > 0 && city.nav[k - 1] && flow[k - 1] < 0) ((flow[k - 1] = d), (queue[tail++] = k - 1));
    if (c < C - 1 && city.nav[k + 1] && flow[k + 1] < 0) ((flow[k + 1] = d), (queue[tail++] = k + 1));
    if (r > 0 && city.nav[k - C] && flow[k - C] < 0) ((flow[k - C] = d), (queue[tail++] = k - C));
    if (r < city.navRows - 1 && city.nav[k + C] && flow[k + C] < 0) ((flow[k + C] = d), (queue[tail++] = k + C));
  }
}

function lineClear(city: City, x0: number, y0: number, x1: number, y1: number) {
  const d = Math.hypot(x1 - x0, y1 - y0);
  const n = Math.ceil(d / 20);
  for (let i = 1; i < n; i++) {
    const k = i / n;
    if (!city.nav[navIndex(city, x0 + (x1 - x0) * k, y0 + (y1 - y0) * k)]) return false;
  }
  return true;
}

/** Ser polisen spelaren? Spöket syns inte. */
function sees(s: ChaseState, p: Car): boolean {
  if (s.mode === "ghost") return false;
  const me = playerPos(s);
  const d = Math.hypot(me.x - p.x, me.y - p.y);
  if (d < 170) return true;
  const range = s.mode === "foot" ? 400 : 540;
  return d < range && lineClear(s.city, p.x, p.y, me.x, me.y);
}

function followFlow(s: ChaseState, p: Car): [number, number] {
  const city = s.city;
  let k = nearestOpen(city, navIndex(city, p.x, p.y));
  const C = city.navCols;
  for (let step = 0; step < 4; step++) {
    const c = k % C;
    const r = (k / C) | 0;
    let best = k;
    let bd = s.flow[k] < 0 ? 1e9 : s.flow[k];
    for (const [dc, dr] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
      [1, 1],
      [1, -1],
      [-1, 1],
      [-1, -1],
    ]) {
      const cc = c + dc;
      const rr = r + dr;
      if (cc < 0 || rr < 0 || cc >= C || rr >= city.navRows) continue;
      const kk = rr * C + cc;
      if (!city.nav[kk] || s.flow[kk] < 0) continue;
      if (dc && dr && (!city.nav[r * C + cc] || !city.nav[rr * C + c])) continue;
      const v = s.flow[kk] + (dc && dr ? 0.4 : 0);
      if (v < bd) {
        bd = v;
        best = kk;
      }
    }
    if (best === k) break;
    k = best;
  }
  return [(k % C) * NAV + NAV / 2, ((k / C) | 0) * NAV + NAV / 2];
}

function policeTarget(s: ChaseState, p: Car): [number, number] {
  const city = s.city;
  // Spåret tappat: åk till senast kända plats och sök sedan runt omkring
  if (s.lost) {
    const dk = Math.hypot(s.lastKnown.x - p.x, s.lastKnown.y - p.y);
    if (dk < 220 || p.search) {
      if (!p.search || s.t > p.search.t || Math.hypot(p.search.x - p.x, p.search.y - p.y) < 60) {
        const sp = s.city.spawns.filter((q) => Math.hypot(q.x - s.lastKnown.x, q.y - s.lastKnown.y) < 900);
        const q = sp.length ? sp[Math.floor(s.rng() * sp.length)] : s.lastKnown;
        p.search = { x: q.x, y: q.y, t: s.t + 7 };
      }
      if (lineClear(city, p.x, p.y, p.search.x, p.search.y)) return [p.search.x, p.search.y];
    }
    return followFlow(s, p);
  }
  p.search = undefined;
  const me = playerPos(s);
  const d = Math.hypot(me.x - p.x, me.y - p.y);
  // Varannan polis försöker genskjuta: siktar på där du kommer att vara
  const interceptor = p.id % 2 === 1 && s.mode === "car";
  if (interceptor && d > 140 && d < 650) {
    const lead = Math.min(1.1, d / 420);
    const tx = me.x + me.vx * lead;
    const ty = me.y + me.vy * lead;
    if (lineClear(city, p.x, p.y, tx, ty)) return [tx, ty];
  }
  if (d < 320 && lineClear(city, p.x, p.y, me.x, me.y)) {
    const lead = Math.min(0.45, d / 600);
    return [me.x + me.vx * lead, me.y + me.vy * lead];
  }
  return followFlow(s, p);
}

function drivePolice(s: ChaseState, p: Car, dt: number): number {
  p.exitCd = Math.max(0, (p.exitCd ?? 0) - dt);
  if (p.out) {
    // Bilen står still med blåljusen på medan konstapeln är ute
    p.vx *= Math.exp(-dt * 6);
    p.vy *= Math.exp(-dt * 6);
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.braking = true;
    return collideWorld(s, p, CAR_RADIUS);
  }
  const spec = policeSpec(s.stars, s.tuning, playerSpec(s).vmax);
  if (s.lost) spec.vmax *= 0.75; // söker lugnare
  const [tx, ty] = policeTarget(s, p);
  let desired = Math.atan2(ty - p.y, tx - p.x);
  // Håll lite avstånd till andra poliser
  for (const o of s.police) {
    if (o === p) continue;
    const d = Math.hypot(o.x - p.x, o.y - p.y);
    if (d < 70 && d > 0) desired += wrap(Math.atan2(p.y - o.y, p.x - o.x) - desired) * 0.08;
  }
  let diff = wrap(desired - p.a);
  const speed = Math.hypot(p.vx, p.vy);
  if (p.reverse > 0) {
    p.reverse -= dt;
    return drive(s, p, spec, -Math.sign(diff) || 1, true, dt);
  }
  if (speed < 35) p.stuck += dt;
  else p.stuck = Math.max(0, p.stuck - dt * 2);
  if (p.stuck > 0.9) {
    p.stuck = 0;
    p.reverse = 0.7;
  }
  const brake = Math.abs(diff) > 1.3 && speed > 220;
  if (Math.abs(diff) > Math.PI * 0.85 && speed < 60) diff = 0; // vänd genom att backa ut via stuck-logiken
  // Ramma: extra gas när polisen är nära och siktar rakt på dig
  const me = playerPos(s);
  const close = !s.lost && Math.hypot(me.x - p.x, me.y - p.y) < 160 && Math.abs(diff) < 0.35;
  return drive(s, p, close ? { ...spec, vmax: spec.vmax * 1.12, accel: spec.accel * 1.6 } : spec, Math.max(-1, Math.min(1, diff * 2.4)), brake, dt);
}

/* ---------- Kropp: bil, till fots, spöke ---------- */

function nearestParked(s: ChaseState, x: number, y: number, range: number): ParkedCar | null {
  let best: ParkedCar | null = null;
  let bd = range;
  for (const p of s.parked) {
    const d = Math.hypot(p.x - x, p.y - y);
    if (d < bd) ((bd = d), (best = p));
  }
  return best;
}

/** Lämna bilen (den blir parkerad) – returnerar dess id. */
function leaveCar(s: ChaseState): number {
  const pl = s.player;
  const id = s.nextId++ + 5000;
  s.parked.push({ id, x: pl.x, y: pl.y, a: pl.a, model: pl.model, color: pl.color });
  return id;
}

function takeCar(s: ChaseState, car: ParkedCar, fresh: boolean) {
  s.parked = s.parked.filter((p) => p !== car);
  Object.assign(s.player, { x: car.x, y: car.y, a: car.a, vx: 0, vy: 0, steer: 0, slip: 0, model: car.model, color: car.color });
  if (fresh) s.hp = CAR_HP;
  s.mode = "car";
  s.homeCar = null;
}

/** Kliv ur eller in i en bil (knapp E). */
export function toggleExit(s: ChaseState): boolean {
  if (s.phase !== "drive") return false;
  if (s.mode === "car") {
    const speed = Math.hypot(s.player.vx, s.player.vy);
    if (speed > 175) return false; // sakta ner först
    leaveCar(s);
    const side = s.player.a + Math.PI / 2;
    s.body = { x: s.player.x + Math.cos(side) * 26, y: s.player.y + Math.sin(side) * 26, a: s.player.a, vx: 0, vy: 0 };
    collideWorld(s, s.body, FOOT_RADIUS);
    s.mode = "foot";
    s.events.push({ t: s.t, kind: "exit", x: s.body.x, y: s.body.y, power: 1 });
    return true;
  }
  if (s.mode === "foot") {
    const car = nearestParked(s, s.body.x, s.body.y, ENTER_RANGE);
    if (!car) return false;
    const different = car.color !== s.player.color || car.model !== s.player.model;
    takeCar(s, car, different);
    s.events.push({ t: s.t, kind: "enter", x: car.x, y: car.y, power: 1 });
    return true;
  }
  return false;
}

function startGhost(s: ChaseState) {
  const me = playerPos(s);
  if (s.mode === "car") s.homeCar = leaveCar(s);
  else s.homeCar = null;
  s.body = { x: me.x, y: me.y, a: me.a, vx: 0, vy: 0 };
  s.mode = "ghost";
  s.ghostT = GHOST_TIME;
  s.ghostHold = 0;
  s.events.push({ t: s.t, kind: "ghost", x: me.x, y: me.y, power: 1 });
}

function endGhost(s: ChaseState, into: ParkedCar | null) {
  s.ghostCd = GHOST_COOLDOWN;
  if (into) {
    const fresh = into.id !== s.homeCar;
    takeCar(s, into, fresh);
    s.events.push({ t: s.t, kind: "possess", x: into.x, y: into.y, power: 1 });
    // Bytte bil utan att någon såg det: polisen tappar spåret
    if (fresh && !s.police.some((p) => Math.hypot(p.x - into.x, p.y - into.y) < 260)) loseTrack(s);
    return;
  }
  // Tiden tog slut: tillbaka till kroppen
  const home = s.homeCar !== null ? s.parked.find((p) => p.id === s.homeCar) : null;
  if (home) takeCar(s, home, false);
  else s.mode = "foot";
}

function loseTrack(s: ChaseState) {
  if (s.lost) return;
  s.lost = true;
  s.escapes++;
  const pts = Math.round(POINTS.escape * multiplier(s.stars));
  s.score += pts;
  const me = playerPos(s);
  s.events.push({ t: s.t, kind: "escape", x: me.x, y: me.y, power: pts });
}

/* ---------- Steg ---------- */

export function step(s: ChaseState, realDt: number) {
  const dt = Math.min(0.05, realDt) * s.timeScale;
  s.t += dt;
  const pl = s.player;

  if (s.phase === "busted") {
    s.bustedT -= realDt;
    pl.vx *= 0.9;
    pl.vy *= 0.9;
    for (const p of s.police) {
      p.vx *= 0.92;
      p.vy *= 0.92;
    }
    s.bullets = [];
    if (s.bustedT <= 0) respawn(s);
    return;
  }

  updateFlow(s);
  const asking = s.phase === "question";
  const steer = asking ? 0 : s.input.steer;
  const brake = asking ? false : s.input.brake;
  s.ghostCd = Math.max(0, s.ghostCd - dt);

  // Spöke: håll in knappen
  if (!asking && s.mode !== "ghost" && s.input.ghost && s.ghostCd <= 0) {
    s.ghostHold += realDt / GHOST_HOLD;
    if (s.ghostHold >= 1) startGhost(s);
  } else if (s.mode !== "ghost") s.ghostHold = Math.max(0, s.ghostHold - realDt * 3);

  if (s.mode === "car") {
    const base = playerSpec(s);
    const spec = s.boost > 0 ? { ...base, vmax: base.vmax * 1.25, accel: base.accel * 2 } : base;
    const hit = drive(s, pl, spec, steer, brake, dt);
    if (hit > 160) s.events.push({ t: s.t, kind: "crash", x: pl.x, y: pl.y, power: Math.min(1, hit / 500) });
  } else {
    // Till fots eller spöke: vänd med styrningen, gå/sväva framåt
    const b = s.body;
    const ghost = s.mode === "ghost";
    const speed = ghost ? GHOST_SPEED : WALK_SPEED;
    b.a = wrap(b.a + steer * (ghost ? 4.2 : 4.6) * dt);
    const go = brake ? 0 : 1;
    b.vx = Math.cos(b.a) * speed * go;
    b.vy = Math.sin(b.a) * speed * go;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    if (ghost) {
      b.x = Math.max(CELL, Math.min(s.city.w - CELL, b.x));
      b.y = Math.max(CELL, Math.min(s.city.h - CELL, b.y));
      s.ghostT -= dt;
      const car = nearestParked(s, b.x, b.y, 30);
      if (car && (car.id !== s.homeCar || s.ghostT < GHOST_TIME - 0.8)) endGhost(s, car);
      else if (s.ghostT <= 0) endGhost(s, null);
    } else collideWorld(s, b, FOOT_RADIUS);
    // Den parkerade bilen står still medan man går eller svävar
    if ((s.mode as BodyMode) !== "car") {
      pl.vx = 0;
      pl.vy = 0;
    }
  }
  s.boost = Math.max(0, s.boost - dt);
  s.invuln = Math.max(0, s.invuln - dt);
  s.nearCd = Math.max(0, s.nearCd - dt);

  for (const p of s.police) {
    const h = drivePolice(s, p, dt);
    if (h > 220) s.events.push({ t: s.t, kind: "crash", x: p.x, y: p.y, power: Math.min(1, h / 600) * 0.6 });
  }
  const me = playerPos(s);
  for (let i = 0; i < s.police.length; i++) {
    for (let j = i + 1; j < s.police.length; j++) collideCars(s.police[i], s.police[j]);
    if (s.mode === "car") {
      const h = collideCars(pl, s.police[i]);
      if (h > 120) s.events.push({ t: s.t, kind: "crash", x: (pl.x + s.police[i].x) / 2, y: (pl.y + s.police[i].y) / 2, power: Math.min(1, h / 500) });
    } else if (s.mode === "foot" && s.invuln <= 0 && Math.hypot(s.police[i].x - me.x, s.police[i].y - me.y) < CAR_RADIUS + FOOT_RADIUS + 4) {
      return bust(s, false);
    }
  }

  // Ser polisen dig?
  let seen = false;
  for (const p of s.police) if (sees(s, p)) seen = true;
  if (s.mode !== "ghost")
    for (const o of s.officers) if (o.down <= 0 && Math.hypot(o.x - me.x, o.y - me.y) < 360 && lineClear(s.city, o.x, o.y, me.x, me.y)) seen = true;
  if (seen) {
    if (s.lost) s.events.push({ t: s.t, kind: "spotted", x: me.x, y: me.y, power: 1 });
    s.lost = false;
    s.unseen = 0;
    s.lastKnown = { x: me.x, y: me.y };
  } else {
    s.unseen += dt;
    if (s.unseen >= LOSE_TIME) loseTrack(s);
  }

  // Poliser kliver ur när de är nära och du står still, går till fots – eller när de får skjuta
  const mySpeed = Math.hypot(me.vx, me.vy);
  const armed = s.mode === "foot" || s.stars >= s.tuning.shootFrom;
  if (!s.lost && s.mode !== "ghost" && !asking) {
    for (const p of s.police) {
      if (p.out || (p.exitCd ?? 0) > 0 || s.officers.length >= 4) continue;
      const d = Math.hypot(me.x - p.x, me.y - p.y);
      const carSlow = Math.hypot(p.vx, p.vy) < 140;
      const reason = s.mode === "foot" || mySpeed < 90 || armed;
      if (d < 260 && carSlow && reason && lineClear(s.city, p.x, p.y, me.x, me.y)) {
        p.out = true;
        const side = p.a - Math.PI / 2;
        const o: Officer = { id: s.nextId++, carId: p.id, x: p.x + Math.cos(side) * 24, y: p.y + Math.sin(side) * 24, a: Math.atan2(me.y - p.y, me.x - p.x), vx: 0, vy: 0, fireCd: 0.8 + s.rng() * 0.6, down: 0, returning: false, outT: 0 };
        collideWorld(s, o, FOOT_RADIUS);
        s.officers.push(o);
        s.events.push({ t: s.t, kind: "officer", x: o.x, y: o.y, power: 1 });
      }
    }
  }
  for (const o of s.officers) {
    const car = s.police.find((c) => c.id === o.carId);
    o.outT += dt;
    if (o.down > 0) {
      o.down -= dt;
      o.vx = o.vy = 0;
      continue;
    }
    const d = Math.hypot(me.x - o.x, me.y - o.y);
    const see = s.mode !== "ghost" && !s.lost && (d < 150 || (d < 420 && lineClear(s.city, o.x, o.y, me.x, me.y)));
    // Tillbaka till bilen om du kommit undan eller sticker iväg
    if (!o.returning && (s.lost || d > 520 || (o.outT > 6 && !see) || s.mode === "ghost")) o.returning = true;
    if (o.returning && see && d < 300 && s.mode === "foot") o.returning = false;
    let tx = me.x;
    let ty = me.y;
    if (o.returning && car) {
      tx = car.x;
      ty = car.y;
    }
    const want = Math.atan2(ty - o.y, tx - o.x);
    o.a += wrap(want - o.a) * Math.min(1, dt * 8);
    // Stannar och siktar när hen har fri sikt och är på skjutavstånd
    const aiming = !o.returning && see && armed && d < 360;
    const sp = aiming ? 30 : OFFICER_SPEED;
    o.vx = Math.cos(o.a) * sp;
    o.vy = Math.sin(o.a) * sp;
    o.x += o.vx * dt;
    o.y += o.vy * dt;
    collideWorld(s, o, FOOT_RADIUS);
    if (o.returning && car && Math.hypot(car.x - o.x, car.y - o.y) < 26) {
      car.out = false;
      car.exitCd = 4;
      o.down = -1; // markeras för borttagning
      continue;
    }
    if (!car) o.down = -1;
    // Skjuter
    o.fireCd -= dt;
    if (aiming && o.fireCd <= 0 && s.invuln <= 0) {
      const lead = (d / 760) * 0.4;
      const aim = Math.atan2(me.y + me.vy * lead - o.y, me.x + me.vx * lead - o.x) + (s.rng() - 0.5) * 0.22;
      s.bullets.push({ x: o.x + Math.cos(aim) * 14, y: o.y + Math.sin(aim) * 14, vx: Math.cos(aim) * 760, vy: Math.sin(aim) * 760, life: 0.7 });
      s.events.push({ t: s.t, kind: "shot", x: o.x, y: o.y, power: aim });
      o.a = aim;
      o.fireCd = Math.max(0.55, 1.5 - s.stars * 0.07) + s.rng() * 0.5;
    }
    // Griper dig till fots
    if (s.mode === "foot" && s.invuln <= 0 && d < FOOT_RADIUS * 2 + 6) return bust(s, false);
    // Påkörd av din bil: ramlar omkull en stund
    if (s.mode === "car" && Math.hypot(pl.x - o.x, pl.y - o.y) < CAR_RADIUS + FOOT_RADIUS && mySpeed > 90) {
      o.down = 3;
      const k = Math.atan2(o.y - pl.y, o.x - pl.x);
      o.x += Math.cos(k) * 16;
      o.y += Math.sin(k) * 16;
      collideWorld(s, o, FOOT_RADIUS);
      s.events.push({ t: s.t, kind: "knock", x: o.x, y: o.y, power: 1 });
    }
  }
  s.officers = s.officers.filter((o) => o.down !== -1);
  // Kulor
  for (const b of s.bullets) {
    b.life -= dt;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    if (blockedAt(s.city, b.x, b.y, 0)) {
      b.life = 0;
      continue;
    }
    if (s.mode === "ghost") continue;
    const r = s.mode === "car" ? CAR_RADIUS + 2 : FOOT_RADIUS + 3;
    if (Math.hypot(b.x - me.x, b.y - me.y) < r) {
      b.life = 0;
      if (s.mode === "foot") return bust(s, false);
      s.hp -= BULLET_DAMAGE;
      s.events.push({ t: s.t, kind: "hit", x: b.x, y: b.y, power: s.hp });
      if (s.hp <= 0) {
        s.events.push({ t: s.t, kind: "wreck", x: me.x, y: me.y, power: 1 });
        return bust(s, true);
      }
    }
  }
  s.bullets = s.bullets.filter((b) => b.life > 0);

  // Mätaren, nära ögat och poäng
  const speed = Math.hypot(me.vx, me.vy);
  let closest = Infinity;
  for (const p of s.police) closest = Math.min(closest, Math.hypot(p.x - me.x, p.y - me.y));
  const mult = multiplier(s.stars);
  if (s.phase === "drive") {
    s.score += POINTS.perSecond * mult * dt;
    let rate = speed > 80 ? s.tuning.heatBase : s.tuning.heatBase * 0.6;
    if (s.mode === "car" && closest < 120 && speed > 220) {
      rate += 0.3;
      if (s.nearCd <= 0) {
        s.score += POINTS.nearMiss * mult;
        s.events.push({ t: s.t, kind: "nearmiss", x: me.x, y: me.y, power: Math.round(POINTS.nearMiss * mult) });
        s.nearCd = 2.5;
      }
    }
    if (s.mode === "car" && Math.abs(pl.slip) > 120) rate += 0.12;
    s.heat = Math.min(1, s.heat + rate * dt);
    // Ingen fråga mitt i ett spökhopp
    if (s.heat >= 1 && s.mode !== "ghost") {
      s.phase = "question";
      s.timeScale = QUESTION_SLOWMO;
    }
  }

  // Fast i bilen (inträngd)?
  if (s.phase === "drive" && s.invuln <= 0 && s.mode === "car") {
    const boxed = closest < CAR_RADIUS * 2 + 16 && speed < 45;
    s.bust = boxed ? s.bust + dt / BUST_TIME : Math.max(0, s.bust - (dt / BUST_TIME) * 1.5);
    if (s.bust >= 1) bust(s, false);
  } else s.bust = Math.max(0, s.bust - dt);
}

function bust(s: ChaseState, wrecked: boolean) {
  const me = playerPos(s);
  s.phase = "busted";
  s.bustedT = BUSTED_PAUSE;
  s.bust = 1;
  s.busts++;
  s.lostStar = s.stars > 0;
  s.stars = Math.max(0, s.stars - 1);
  s.bullets = [];
  s.events.push({ t: s.t, kind: "busted", x: me.x, y: me.y, power: wrecked ? 2 : 1 });
}

function respawn(s: ChaseState) {
  const { spawns } = s.city;
  // Långt från alla poliser
  let best = spawns[0];
  let bd = -1;
  for (let k = 0; k < 60; k++) {
    const p = spawns[Math.floor(s.rng() * spawns.length)];
    const d = Math.min(...s.police.map((q) => Math.hypot(q.x - p.x, q.y - p.y)));
    if (d > bd) {
      bd = d;
      best = p;
    }
  }
  Object.assign(s.player, { x: best.x, y: best.y, a: best.a, vx: 0, vy: 0, steer: 0, slip: 0 });
  s.mode = "car";
  s.hp = CAR_HP;
  s.homeCar = null;
  s.phase = "drive";
  s.bust = 0;
  s.invuln = RESPAWN_INVULN;
  s.heat = Math.min(s.heat, 0.5);
  s.lost = false;
  s.unseen = 0;
  s.lastKnown = { x: best.x, y: best.y };
  // Polisen startar om på avstånd
  const n = s.police.length;
  s.police = [];
  s.officers = [];
  for (let i = 0; i < n; i++) {
    const p = spawnPoint(s, 900, 1500);
    s.police.push(mkCar(s.nextId++, p.x, p.y, p.a, "polis", "#ffffff"));
  }
  s.events.push({ t: s.t, kind: "respawn", x: best.x, y: best.y, power: 1 });
}

/** Svar på frågan som mätaren gav. */
export function answer(s: ChaseState, correct: boolean) {
  const me = playerPos(s);
  if (correct) {
    s.stars++;
    s.bestStars = Math.max(s.bestStars, s.stars);
    s.heat = 0;
    s.boost = 1.4;
    const pts = Math.round(POINTS.correct * multiplier(s.stars));
    s.score += pts;
    s.events.push({ t: s.t, kind: "star", x: me.x, y: me.y, power: pts });
    syncPolice(s);
  } else {
    // Mätaren börjar nästan om – att gissa snabbt ska inte löna sig
    s.heat = 0.2;
    s.events.push({ t: s.t, kind: "miss", x: me.x, y: me.y, power: 1 });
  }
}

/** Frågan stängs: tillbaka till full fart. */
export function resume(s: ChaseState) {
  if (s.phase === "question") s.phase = "drive";
  s.timeScale = 1;
  if (s.heat >= 1) s.heat = 0.2;
}

/** Normaliserad position för projektorn (0..1). */
export function mapPos(s: ChaseState): { x: number; y: number } {
  const me = playerPos(s);
  return { x: me.x / s.city.w, y: me.y / s.city.h };
}

export function seedFromCode(code: string): number {
  let h = 2166136261;
  for (const ch of code) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}

/* ---------- Autopilot (förhandsvisning och balanstest) ---------- */

/** Styr spelarbilen mellan korsningar. skill 0..1 påverkar hur hårt den kör. */
export function autopilot(s: ChaseState, skill = 0.8) {
  const c = s.city;
  const pl = s.player;
  const node = (i: number, j: number) => [(c.roadsX[i] + 1) * CELL, (c.roadsY[j] + 1) * CELL] as const;
  const st = (s as ChaseState & { auto?: { i: number; j: number; pi: number; pj: number } }).auto ?? (() => {
    // Närmaste korsning
    let bi = 0;
    let bj = 0;
    let bd = Infinity;
    for (let i = 0; i < c.roadsX.length; i++)
      for (let j = 0; j < c.roadsY.length; j++) {
        const [x, y] = node(i, j);
        const d = Math.hypot(x - pl.x, y - pl.y);
        if (d < bd) ((bd = d), (bi = i), (bj = j));
      }
    return { i: bi, j: bj, pi: bi, pj: bj };
  })();
  (s as ChaseState & { auto?: typeof st }).auto = st;
  let [tx, ty] = node(st.i, st.j);
  if (Math.hypot(tx - pl.x, ty - pl.y) < 70) {
    // Välj nästa korsning – helst bort från närmaste polis
    const opts: [number, number][] = [];
    if (st.i > 0 && !c.removed.has(`h:${st.i - 1}:${st.j}`)) opts.push([st.i - 1, st.j]);
    if (st.i < c.roadsX.length - 1 && !c.removed.has(`h:${st.i}:${st.j}`)) opts.push([st.i + 1, st.j]);
    if (st.j > 0 && !c.removed.has(`v:${st.i}:${st.j - 1}`)) opts.push([st.i, st.j - 1]);
    if (st.j < c.roadsY.length - 1 && !c.removed.has(`v:${st.i}:${st.j}`)) opts.push([st.i, st.j + 1]);
    const fwd = opts.filter(([a, b]) => a !== st.pi || b !== st.pj);
    const pool = fwd.length ? fwd : opts;
    let best = pool[Math.floor(s.rng() * pool.length)];
    if (s.rng() < skill) {
      let bd = -Infinity;
      for (const o of pool) {
        const [x, y] = node(o[0], o[1]);
        const d = Math.min(...s.police.map((p) => Math.hypot(p.x - x, p.y - y)), 99999) + s.rng() * 200;
        if (d > bd) ((bd = d), (best = o));
      }
    }
    st.pi = st.i;
    st.pj = st.j;
    [st.i, st.j] = best;
    [tx, ty] = node(st.i, st.j);
  }
  const desired = Math.atan2(ty - pl.y, tx - pl.x);
  const diff = wrap(desired - pl.a);
  const speed = Math.hypot(pl.vx, pl.vy);
  s.input.steer = Math.max(-1, Math.min(1, diff * 2.6));
  s.input.brake = Math.abs(diff) > 0.9 && speed > 150 + skill * 120;
}
