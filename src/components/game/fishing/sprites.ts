/**
 * Isfiske – pixelsprites. Allt byggs som små pixelrutnät och ritas utan
 * utjämning, så att grafiken blir skarp pixelkonst i alla storlekar.
 */

import { FISH, type FishKind } from "@/lib/game/fishing";

type Px = (string | null)[][];

interface FishLook {
  back: string;
  side: string;
  belly: string;
  fin: string;
  outline: string;
  eye?: string;
  /** Proportioner: höjd / längd */
  tall: number;
  pattern?: "bars" | "spots" | "mottle" | "shine" | "faint";
  dorsalSpiky?: boolean;
}

const LOOK: Record<FishKind, FishLook> = {
  mort: { back: "#4c6f78", side: "#b9cdd2", belly: "#eef4f2", fin: "#d9483b", outline: "#1d2d33", eye: "#d9483b", tall: 0.4 },
  abborre: { back: "#4f6b2a", side: "#97b04a", belly: "#e7e3b4", fin: "#e8662d", outline: "#1f2a12", tall: 0.44, pattern: "bars", dorsalSpiky: true },
  sik: { back: "#5d7686", side: "#c6d3db", belly: "#f4f7f8", fin: "#8ea2ad", outline: "#1f2b33", tall: 0.36, pattern: "shine" },
  gos: { back: "#55634f", side: "#a8b39b", belly: "#e3e6d8", fin: "#7f8a74", outline: "#1d231a", eye: "#e9f0ff", tall: 0.32, pattern: "faint", dorsalSpiky: true },
  roding: { back: "#3d5160", side: "#7f96a6", belly: "#e25a3a", fin: "#f08a5d", outline: "#1a222a", tall: 0.36, pattern: "spots" },
  lake: { back: "#4a3d22", side: "#8a7442", belly: "#d2c393", fin: "#5f4f2c", outline: "#1f180c", tall: 0.3, pattern: "mottle" },
  gadda: { back: "#36522c", side: "#7d9a4e", belly: "#e2e4c2", fin: "#a8632e", outline: "#16210f", tall: 0.24, pattern: "spots" },
  guld: { back: "#d98a12", side: "#ffc93a", belly: "#fff1a8", fin: "#ff9c1a", outline: "#5a3405", tall: 0.42, pattern: "shine" },
  kanga: { back: "#4a3020", side: "#6b4630", belly: "#3a2618", fin: "#2a1a10", outline: "#140b05", tall: 0.6 },
};

const cache = new Map<string, HTMLCanvasElement>();

function hash(a: number, b: number) {
  const n = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

function toCanvas(grid: Px): HTMLCanvasElement {
  const h = grid.length;
  const w = grid[0]?.length ?? 0;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const v = grid[y][x];
      if (!v) continue;
      ctx.fillStyle = v;
      ctx.fillRect(x, y, 1, 1);
    }
  return c;
}

/** Lägg en mörk kontur runt alla fyllda pixlar. */
function outline(grid: Px, color: string): Px {
  const h = grid.length;
  const w = grid[0].length;
  const out: Px = grid.map((r) => r.slice());
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      if (grid[y][x]) continue;
      const n = (dx: number, dy: number) => grid[y + dy]?.[x + dx];
      if (n(1, 0) || n(-1, 0) || n(0, 1) || n(0, -1)) out[y][x] = color;
    }
  return out;
}

function kangaGrid(): Px {
  const m = [
    "..........oooo",
    ".........oSSSo",
    ".........oSBSo",
    ".........oSSSo",
    ".........oSBSo",
    ".........oSSSo",
    "..oooooooSSSSo",
    ".oSSSSSSSSSSSo",
    "oSSBSSSSSSSSSo",
    "oSSSSSSSSSSSSo",
    "oFFFFFFFFFFFFo",
    ".oooooooooooo.",
  ];
  const L = LOOK.kanga;
  const map: Record<string, string> = { o: L.outline, S: L.side, B: L.back, F: L.fin };
  return m.map((row) => row.split("").map((ch) => map[ch] ?? null));
}

/** Bygg en fisk (vänd åt höger) som pixelrutnät. frame 0/1 = stjärtviftning. */
function fishGrid(kind: FishKind, frame: number): Px {
  if (kind === "kanga") return kangaGrid();
  const L = LOOK[kind];
  const len = Math.max(10, Math.round(FISH[kind].len / 2));
  const maxH = Math.max(3, Math.round(len * L.tall * 0.5));
  const pad = 3;
  const w = len + 2;
  const h = maxH * 2 + 1 + pad * 2;
  const cy = maxH + pad;
  const grid: Px = Array.from({ length: h }, () => Array(w).fill(null));
  const tailEnd = Math.max(2, Math.round(len * 0.2));
  const flap = frame === 1 ? 1 : 0;
  for (let x = 0; x < len; x++) {
    const u = x / (len - 1);
    if (x < tailEnd) {
      // Kluven stjärtfena
      const t = 1 - x / tailEnd;
      const spread = Math.round(1 + t * maxH * 0.95);
      for (let k = -spread; k <= spread; k++) {
        if (Math.abs(k) < Math.round(spread * 0.45) && x < tailEnd - 1) continue;
        const yy = cy + k + (k < 0 ? -flap : flap) * (x < tailEnd / 2 ? 1 : 0);
        if (grid[yy]) grid[yy][x + 1] = L.fin;
      }
      continue;
    }
    // Kropp: tjockast lite framför mitten
    const b = (u - 0.18) / 0.82;
    let hh = Math.sin(Math.PI * Math.min(1, b * 0.92 + 0.04)) ** 0.75 * maxH;
    if (b > 0.88) hh *= 0.85;
    if (b < 0.08) hh = Math.max(1, hh * 0.6);
    const top = Math.round(cy - hh);
    const bot = Math.round(cy + hh * 0.92);
    for (let y = top; y <= bot; y++) {
      const v = (y - top) / Math.max(1, bot - top);
      let col = v < 0.32 ? L.back : v < 0.72 ? L.side : L.belly;
      if (L.pattern === "bars" && b > 0.15 && b < 0.85 && Math.floor(b * 7) % 2 === 0 && v < 0.7) col = L.back;
      if (L.pattern === "faint" && b > 0.15 && b < 0.8 && Math.floor(b * 9) % 3 === 0 && v < 0.55) col = L.back;
      if (L.pattern === "spots" && v > 0.2 && v < 0.75 && hash(x, y + (kind === "gadda" ? 3 : 0)) > 0.72) col = kind === "gadda" ? "#cfe0a0" : "#f2c7a6";
      if (L.pattern === "mottle" && hash(x * 1.7, y) > 0.6 && v < 0.8) col = L.back;
      if (L.pattern === "shine" && v > 0.34 && v < 0.46 && b > 0.2 && b < 0.8) col = "#ffffff";
      grid[y][x + 1] = col;
    }
    // Ryggfena
    if (b > 0.32 && b < 0.62) {
      const fh = L.dorsalSpiky ? (x % 2 === 0 ? 2 : 1) : b < 0.5 ? 1 : 0;
      for (let k = 1; k <= fh; k++) if (grid[top - k]) grid[top - k][x + 1] = L.dorsalSpiky && kind === "abborre" ? "#2d3b16" : L.fin;
    }
    // Buk- och analfena
    if ((b > 0.3 && b < 0.38) || (b > 0.6 && b < 0.68)) if (grid[bot + 1]) grid[bot + 1][x + 1] = L.fin;
    // Gälbåge
    if (Math.abs(b - 0.8) < 0.5 / len && grid[cy]) for (let y = top + 1; y < bot; y++) if (grid[y][x + 1] && grid[y][x + 1] !== L.belly) grid[y][x + 1] = L.back;
  }
  // Öga
  const ex = Math.round(len * 0.86) + 1;
  const ey = cy - Math.max(1, Math.round(maxH * 0.25));
  if (grid[ey]) {
    grid[ey][ex] = "#14181a";
    if (L.eye && grid[ey][ex - 1] !== null) grid[ey][ex - 1] = L.eye;
  }
  // Mun
  if (grid[cy + 1]) grid[cy + 1][len] = L.outline;
  // Lakens skäggtöm
  if (kind === "lake" && grid[cy + 3]) grid[cy + 3][len] = L.fin;
  return outline(grid, L.outline);
}

/** Fisk som canvas (vänd åt höger). */
export function fishSprite(kind: FishKind, frame: number): HTMLCanvasElement {
  const key = `${kind}:${frame}`;
  let c = cache.get(key);
  if (!c) {
    c = toCanvas(fishGrid(kind, frame));
    cache.set(key, c);
  }
  return c;
}

/* ---------- Fiskaren på isen ---------- */

const FISHER = [
  "....RRRR......",
  "...RRRRRR.....",
  "...WWWWWW.....",
  "...SSSSSS.....",
  "...SoSSSS.....",
  "...SSSSSS.....",
  "..CCCCCCCC....",
  ".CCCCCCCCCC...",
  ".CCCCCCCCCHH..",
  ".CCCCCCCCC....",
  ".CCCCCCCCC....",
  "..PPPPPPPPP...",
  "..PPPPPPPPPP..",
  "..BBBB...PPP..",
  "..BbbB...PPP..",
  "..BBBB...KKKK.",
];

export function fisherSprite(coat: string, hat: string): HTMLCanvasElement {
  const key = `fisher:${coat}:${hat}`;
  let c = cache.get(key);
  if (!c) {
    const map: Record<string, string> = {
      R: hat,
      W: "#f4f1e8",
      S: "#f2c9a0",
      o: "#2a2018",
      C: coat,
      H: "#3a2a20",
      P: "#2f3b52",
      B: "#c7d4da",
      b: "#8aa0aa",
      K: "#2a2520",
    };
    const grid: Px = FISHER.map((r) => r.split("").map((ch) => map[ch] ?? null));
    // Lite skugga i rocken
    for (let y = 6; y < 11; y++) if (grid[y][1] === coat) grid[y][1] = shade(coat, -0.25);
    c = toCanvas(outline(grid, "#1b2226"));
    cache.set(key, c);
  }
  return c;
}

export function shade(hex: string, amt: number) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(amt < 0 ? v * (1 + amt) : v + (255 - v) * amt)));
  const r = f((n >> 16) & 255);
  const g = f((n >> 8) & 255);
  const b = f(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

export const FISH_COLORS: Record<FishKind, string> = Object.fromEntries((Object.keys(LOOK) as FishKind[]).map((k) => [k, LOOK[k].side])) as Record<FishKind, string>;
