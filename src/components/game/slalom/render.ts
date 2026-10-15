/**
 * Slalom – renderare. Världen ritas 1:1 i världsenheter till en buffert
 * som skalas upp utan utjämning: skarp pixelgrafik i alla storlekar.
 */

import { W, type Obstacle, type SlalomEvent, type SlalomState } from "@/lib/game/slalom";

type Px = (string | null)[][];
type Ctx = CanvasRenderingContext2D;

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

function fromStrings(rows: string[], map: Record<string, string>, pad = 1): Px {
  const w = Math.max(...rows.map((r) => r.length)) + pad * 2;
  const grid: Px = [];
  for (let i = 0; i < pad; i++) grid.push(Array(w).fill(null));
  for (const r of rows) {
    const row: (string | null)[] = Array(pad).fill(null);
    for (const ch of r.padEnd(w - pad * 2, ".")) row.push(map[ch] ?? null);
    for (let i = 0; i < pad; i++) row.push(null);
    grid.push(row);
  }
  for (let i = 0; i < pad; i++) grid.push(Array(w).fill(null));
  return grid;
}

function sprite(key: string, make: () => Px): HTMLCanvasElement {
  let c = cache.get(key);
  if (!c) {
    c = toCanvas(make());
    cache.set(key, c);
  }
  return c;
}

/* ---------- Sprites ---------- */

function pine(size: number) {
  return sprite(`pine${size}`, () => {
    const h = size;
    const w = Math.round(size * 0.66) | 1;
    const grid: Px = Array.from({ length: h + 3 }, () => Array(w + 2).fill(null));
    const cx = Math.floor((w + 2) / 2);
    for (let y = 0; y < h; y++) {
      const layer = Math.floor((y / h) * 3);
      const inLayer = (y - (layer * h) / 3) / (h / 3);
      const half = Math.round((0.25 + layer * 0.22 + inLayer * 0.3) * (w / 2));
      for (let dx = -half; dx <= half; dx++) {
        const edge = Math.abs(dx) === half;
        const snow = inLayer < 0.28 && Math.abs(dx) < half;
        grid[y + 1][cx + dx] = snow ? "#f4fbff" : edge ? "#1c4a37" : dx < 0 ? "#2f6e4f" : "#25593f";
      }
    }
    grid[h + 1][cx] = "#5a3b25";
    grid[h + 2][cx] = "#5a3b25";
    return outline(grid, "#163527");
  });
}

const ROCK = ["..GGGG...", ".GLLGGG..", "GLLGGGGD.", "GGGGGGDDD", ".DDDDDDD."];
const MOGUL = ["...WWWWWW...", ".WWWWWWWWWW.", "WWWWWWWWWWWW", "SSSSSSSSSSSS", ".SSSSSSSSSS."];
const JUMP = ["....WWWWWWWWWW....", "..WWWWWWWWWWWWWW..", "WWWWWWWWWWWWWWWWWW", "BBBBBBBBBBBBBBBBBB", "DDDDDDDDDDDDDDDDDD"];

function rock() {
  return sprite("rock", () => outline(fromStrings(ROCK, { G: "#8a9599", L: "#b9c3c6", D: "#5f696c" }), "#2f3638"));
}
function mogul() {
  return sprite("mogul", () => fromStrings(MOGUL, { W: "#ffffff", S: "#cfe0ea" }, 0));
}
function jump() {
  return sprite("jump", () => outline(fromStrings(JUMP, { W: "#ffffff", B: "#7ab6d6", D: "#4c87a8" }), "#2d5870"));
}

const SKIER: Record<string, string[]> = {
  straight: [
    "...HHH...",
    "..HHHHH..",
    "..FGGGF..",
    "..FFFFF..",
    ".JJJJJJJ.",
    "PJJJJJJJP",
    "P.JJJJJ.P",
    "P.JJJJJ.P",
    "P.NN.NN.P",
    "P.NN.NN.P",
    "..BB.BB..",
    "..SS.SS..",
    "..SS.SS..",
    "..SS.SS..",
    "..SS.SS..",
  ],
  left: [
    "...HHH....",
    "..HHHHH...",
    "..GGGFF...",
    "..FFFFF...",
    ".JJJJJJJ..",
    "PJJJJJJJP.",
    "P.JJJJJ..P",
    "P.JJJJJ..P",
    "P.NN.NN..P",
    "..NN.NN...",
    ".BB.BB....",
    "SS.SS.....",
    "SSSS......",
    "SS........",
  ],
  tuck: ["...HHH...", "..HHHHH..", ".JFGGGFJ.", "PJJJJJJJP", "PJJJJJJJP", "..NNNNN..", "..BB.BB..", "..SS.SS..", "..SS.SS..", "..SS.SS..", "..SS.SS.."],
  fallen: ["..............", ".SS....SSSS...", "...SS.........", "..HHH.JJJJJNN.", ".HHHHHJJJJJNNB", "..FFF.JJJJJNN.", ".......SSSSS..", "...SSSS......."],
};

export function skierSprite(pose: "straight" | "left" | "right" | "tuck" | "fallen", jacket: string, helmet: string) {
  const base = pose === "right" ? "left" : pose;
  const key = `skier:${base}:${jacket}:${helmet}:${pose === "right" ? "m" : ""}`;
  return sprite(key, () => {
    const map: Record<string, string> = { H: helmet, F: "#f2c9a0", G: "#2b3b44", J: jacket, N: "#2a3550", B: "#1b2226", S: "#e0483b", P: "#9aa4a8" };
    let g = outline(fromStrings(SKIER[base], map), "#141a1d");
    if (pose === "right") g = g.map((r) => r.slice().reverse());
    return g;
  });
}

/* ---------- Renderare ---------- */

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  color: string;
  text?: string;
  big?: boolean;
}

export interface SlalomUi {
  reducedMotion: boolean;
  jacket: string;
  helmet: string;
}

export class SlalomRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: Ctx;
  private buf: HTMLCanvasElement;
  private b: Ctx;
  private snow: HTMLCanvasElement | null = null;
  private deep: HTMLCanvasElement | null = null;
  private dpr = 1;
  private cssW = 1;
  private cssH = 1;
  scale = 1;
  private vw = 1;
  private vh = 1;
  private parts: Particle[] = [];
  private lastEvent = -1;
  private camY = 0;
  private camX: number | null = null;
  private shake = 0;
  private time = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.buf = document.createElement("canvas");
    this.b = this.buf.getContext("2d")!;
  }

  resize(cssW: number, cssH: number) {
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.cssW = Math.max(1, Math.round(cssW));
    this.cssH = Math.max(1, Math.round(cssH));
    this.canvas.style.width = `${this.cssW}px`;
    this.canvas.style.height = `${this.cssH}px`;
    this.canvas.width = Math.round(this.cssW * this.dpr);
    this.canvas.height = Math.round(this.cssH * this.dpr);
    // Smala skärmar: zooma in och följ åkaren i sidled
    this.scale = Math.max(Math.min(this.cssW / 262, this.cssH / 250), Math.min(2.4, this.cssH / 330));
    this.vw = Math.ceil(this.cssW / this.scale);
    this.vh = Math.ceil(this.cssH / this.scale);
    this.buf.width = this.vw;
    this.buf.height = this.vh;
  }

  private textures() {
    if (this.snow) return;
    const make = (base: string, dots: string[], density: number) => {
      const c = document.createElement("canvas");
      c.width = 64;
      c.height = 64;
      const g = c.getContext("2d")!;
      g.fillStyle = base;
      g.fillRect(0, 0, 64, 64);
      for (let y = 0; y < 64; y++)
        for (let x = 0; x < 64; x++) {
          const h = hash(x, y);
          if (h < density) {
            g.fillStyle = dots[Math.floor(h * 1000) % dots.length];
            g.fillRect(x, y, 1, 1);
          }
        }
      return c;
    };
    this.snow = make("#f4f8fb", ["#e3edf3", "#eaf1f6", "#ffffff"], 0.06);
    this.deep = make("#e6eff5", ["#d6e4ed", "#f2f7fa"], 0.12);
  }

  draw(g: SlalomState, ui: SlalomUi, dt: number) {
    this.time += dt;
    this.textures();
    const b = this.b;
    b.imageSmoothingEnabled = false;
    const vw = this.vw;
    const vh = this.vh;
    const wide = vw >= W + 20;
    const want = wide ? W / 2 - vw / 2 : Math.max(-14, Math.min(W + 14 - vw, g.x - vw / 2));
    this.camX = this.camX === null || wide ? want : this.camX + (want - this.camX) * Math.min(1, dt * 6);
    const camX = Math.round(this.camX);
    const target = g.y - vh * 0.3;
    this.camY = this.camY ? this.camY + (target - this.camY) * Math.min(1, dt * 8) : target;
    if (Math.abs(this.camY - target) > 200) this.camY = target;
    const camY = Math.round(this.camY);
    const sx = (x: number) => Math.round(x - camX);
    const sy = (y: number) => Math.round(y - camY);

    // Mark: pist och djupsnö
    const off = ((camY % 64) + 64) % 64;
    for (let ty = -off; ty < vh; ty += 64)
      for (let tx = -((((camX % 64) + 64) % 64)); tx < vw; tx += 64) b.drawImage(this.deep!, tx, ty);
    b.save();
    b.beginPath();
    b.rect(sx(0), 0, W, vh);
    b.clip();
    for (let ty = -off; ty < vh; ty += 64) for (let tx = sx(0); tx < sx(W); tx += 64) b.drawImage(this.snow!, tx, ty);
    b.restore();
    // Pistkanter: blå streckad markering
    b.fillStyle = "#9cc6dd";
    for (let y = -(camY % 8); y < vh; y += 8) {
      b.fillRect(sx(0), y, 1, 4);
      b.fillRect(sx(W) - 1, y, 1, 4);
    }

    // Skog utanför pisten
    const rowH = 14;
    const r0 = Math.floor(camY / rowH) - 2;
    const r1 = Math.ceil((camY + vh) / rowH) + 2;
    const tall: { y: number; draw: () => void }[] = [];
    for (let row = r0; row <= r1; row++) {
      for (let side = 0; side < 2; side++) {
        const extent = side === 0 ? -camX : vw + camX - W;
        const n = Math.ceil(extent / 12) + 1;
        for (let k = 0; k < n; k++) {
          const h = hash(row * 3 + side, k);
          if (h < 0.25) continue;
          const x = side === 0 ? -6 - k * 12 - hash(row, k + 9) * 8 : W + 6 + k * 12 + hash(row, k + 9) * 8;
          const y = row * rowH + hash(row + 5, k) * rowH;
          const size = 16 + Math.floor(hash(k, row) * 3) * 3;
          tall.push({ y, draw: () => this.blit(pine(size), sx(x), sy(y), 0.5, 1) });
        }
      }
    }

    // Skidspår
    b.fillStyle = "#d3e2ec";
    for (const t of g.trail) {
      const x = sx(t.x);
      const y = sy(t.y);
      if (y < -4 || y > vh + 4) continue;
      b.fillRect(x - 2, y, 1, 2);
      b.fillRect(x + 2, y, 1, 2);
    }

    // Platta saker: puckel och hopp
    for (const o of g.obstacles) {
      const y = sy(o.y);
      if (y < -20 || y > vh + 30) continue;
      if (o.kind === "mogul") this.blit(mogul(), sx(o.x), y, 0.5, 0.5);
      else if (o.kind === "jump") this.blit(jump(), sx(o.x), y, 0.5, 0.5);
      else tall.push({ y: o.y, draw: () => this.drawObstacle(o, sx(o.x), y) });
    }

    // Portar
    for (const gt of g.gatesList) {
      const y = sy(gt.y);
      if (y < -30 || y > vh + 30) continue;
      if (gt.quiz) {
        tall.push({ y: gt.y, draw: () => this.drawQuizGate(sx(gt.x), y, gt.half, gt.passed === true) });
      } else {
        const col = gt.color === "red" ? "#e0483b" : "#2f7fc1";
        const dim = gt.passed === false;
        tall.push({ y: gt.y, draw: () => this.drawPole(sx(gt.x - gt.half), y, col, dim, -1) });
        tall.push({ y: gt.y, draw: () => this.drawPole(sx(gt.x + gt.half), y, col, dim, 1) });
        if (gt.passed === true && !ui.reducedMotion) {
          const t = this.time * 6;
          b.fillStyle = "rgba(255,214,90,0.6)";
          b.fillRect(sx(gt.x - gt.half) + 2, y + Math.round(Math.sin(t)) , gt.half * 2 - 3, 1);
        }
      }
    }

    // Åkaren
    const pose: "straight" | "left" | "right" | "tuck" | "fallen" = g.phase === "fallen" ? "fallen" : g.tuck ? "tuck" : g.vx < -30 ? "left" : g.vx > 30 ? "right" : "straight";
    const air = g.phase === "air" ? Math.sin(Math.max(0, g.airT) / 0.75 * Math.PI) * 9 : 0;
    tall.push({
      y: g.y,
      draw: () => {
        const x = sx(g.x);
        const y = sy(g.y);
        // Skugga
        b.fillStyle = "rgba(40,80,110,0.22)";
        b.fillRect(x - 5 + Math.round(air * 0.4), y + 1, 10, 2);
        this.blit(skierSprite(pose, ui.jacket, ui.helmet), x, y - Math.round(air), 0.5, 1);
      },
    });

    tall.sort((a, c) => a.y - c.y);
    for (const t of tall) t.draw();

    // Snörök
    if (!ui.reducedMotion && g.phase === "ski" && Math.abs(g.vx) > 50 && Math.random() < 0.8) {
      this.parts.push({ x: g.x - Math.sign(g.vx) * 3, y: g.y, vx: -g.vx * 0.3 + (Math.random() - 0.5) * 20, vy: -10 - Math.random() * 20, life: 0.5, max: 0.5, color: Math.random() < 0.5 ? "#ffffff" : "#d8e8f1" });
    }
    this.handleEvents(g, ui);
    for (const p of this.parts) {
      if (p.text) continue;
      b.globalAlpha = Math.max(0, p.life / p.max);
      b.fillStyle = p.color;
      b.fillRect(sx(p.x), sy(p.y), 1, 1);
      b.globalAlpha = 1;
    }

    // Upp på skärmen
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = false;
    let ox = 0;
    let oy = 0;
    if (this.shake > 0 && !ui.reducedMotion) {
      ox = (Math.random() - 0.5) * this.shake * 10;
      oy = (Math.random() - 0.5) * this.shake * 10;
      this.shake = Math.max(0, this.shake - dt * 3);
    }
    ctx.drawImage(this.buf, ox, oy, this.vw * this.scale * this.dpr, this.vh * this.scale * this.dpr);

    // Flytande text i full upplösning
    const k = this.scale * this.dpr;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (const p of this.parts) {
      if (!p.text) continue;
      const a = Math.min(1, (p.life / p.max) * 2);
      ctx.globalAlpha = a;
      ctx.font = `900 ${(p.big ? 26 : 17) * this.dpr}px Nunito, system-ui, sans-serif`;
      ctx.lineWidth = 4 * this.dpr;
      ctx.strokeStyle = "rgba(20,30,40,0.8)";
      const x = (p.x - camX) * k;
      const y = (p.y - camY) * k;
      ctx.strokeText(p.text, x, y);
      ctx.fillStyle = p.color;
      ctx.fillText(p.text, x, y);
      ctx.globalAlpha = 1;
    }

    for (const p of this.parts) {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (!p.text) p.vy += 60 * dt;
    }
    this.parts = this.parts.filter((p) => p.life > 0);
  }

  private blit(img: HTMLCanvasElement, x: number, y: number, ax: number, ay: number) {
    this.b.drawImage(img, Math.round(x - img.width * ax), Math.round(y - img.height * ay));
  }

  private drawObstacle(o: Obstacle, x: number, y: number) {
    if (o.kind === "tree" || o.kind === "flagTree") this.blit(pine(18), x, y + 3, 0.5, 1);
    else if (o.kind === "rock") this.blit(rock(), x, y + 2, 0.5, 1);
  }

  private drawPole(x: number, y: number, color: string, dim: boolean, side: number) {
    const b = this.b;
    b.globalAlpha = dim ? 0.45 : 1;
    b.fillStyle = "rgba(40,80,110,0.2)";
    b.fillRect(x, y, 3, 1);
    b.fillStyle = "#1b2226";
    b.fillRect(x - 1, y - 13, 3, 14);
    b.fillStyle = color;
    b.fillRect(x, y - 12, 1, 12);
    // Flagga
    const fx = side < 0 ? x + 1 : x - 6;
    b.fillStyle = "#1b2226";
    b.fillRect(fx - 1, y - 13, 7, 6);
    b.fillStyle = color;
    b.fillRect(fx, y - 12, 5, 4);
    b.fillStyle = "#ffffff";
    b.fillRect(fx + (side < 0 ? 1 : 3), y - 11, 1, 2);
    b.globalAlpha = 1;
  }

  private drawQuizGate(cx: number, y: number, half: number, done: boolean) {
    const b = this.b;
    const l = cx - half;
    const r = cx + half;
    b.globalAlpha = done ? 0.5 : 1;
    // Stolpar
    for (const x of [l, r]) {
      b.fillStyle = "#3a2303";
      b.fillRect(x - 2, y - 26, 5, 27);
      b.fillStyle = "#f2b705";
      b.fillRect(x - 1, y - 25, 3, 25);
    }
    // Banderoll
    b.fillStyle = "#3a2303";
    b.fillRect(l - 2, y - 30, r - l + 5, 10);
    for (let x = l - 1; x <= r + 1; x++) {
      b.fillStyle = (Math.floor((x - l) / 3) % 2 === 0) ? "#ffd84a" : "#f2a705";
      b.fillRect(x, y - 29, 1, 8);
    }
    // Frågetecken i pixlar
    const q = [".XXX.", "X...X", "...X.", "..X..", ".....", "..X.."];
    for (const ox of [-30, 0, 30]) {
      q.forEach((row, j) =>
        row.split("").forEach((ch, i) => {
          if (ch !== "X") return;
          b.fillStyle = "#3a2303";
          b.fillRect(cx + ox - 2 + i, y - 29 + j + 1, 1, 1);
        }),
      );
    }
    // Glitter
    if (!done) {
      b.fillStyle = "#fff6c2";
      const t = Math.floor(this.time * 6);
      for (let i = 0; i < 4; i++) b.fillRect(l + ((t * 7 + i * 37) % (r - l)), y - 31 - (i % 2) * 2, 1, 1);
    }
    b.globalAlpha = 1;
  }

  private handleEvents(g: SlalomState, ui: SlalomUi) {
    for (const e of g.events) {
      if (e.t <= this.lastEvent) continue;
      this.onEvent(e, g, ui);
    }
    if (g.events.length) this.lastEvent = g.events[g.events.length - 1].t;
  }

  private onEvent(e: SlalomEvent, g: SlalomState, ui: SlalomUi) {
    const lots = ui.reducedMotion ? 0.3 : 1;
    const text = (t: string, color: string, big = false, dy = -8) => this.parts.push({ x: g.x + 22, y: g.y + dy, vx: 0, vy: -28, life: 1.1, max: 1.1, color, text: t, big });
    if (e.type === "gate") text(`+${e.points}`, e.combo >= 5 ? "#ffd84a" : "#ffffff", e.combo >= 10);
    else if (e.type === "miss") text("Missad port", "#ffb3a8");
    else if (e.type === "land") text(`Hopp! +${e.points}`, "#9fe0ff", true, -16);
    else if (e.type === "crash") {
      this.shake = 0.7;
      text("Krasch!", "#ffb3a8", true);
      for (let i = 0; i < 26 * lots; i++) this.parts.push({ x: g.x, y: g.y - 3, vx: (Math.random() - 0.5) * 90, vy: -30 - Math.random() * 50, life: 0.9, max: 0.9, color: Math.random() < 0.6 ? "#ffffff" : "#cfe0ea" });
    } else if (e.type === "level" && e.up) {
      for (let i = 0; i < 24 * lots; i++) this.parts.push({ x: g.x, y: g.y - 8, vx: (Math.random() - 0.5) * 120, vy: -40 - Math.random() * 60, life: 1, max: 1, color: ["#ffd84a", "#fff3b0", "#ff9c1a"][i % 3] });
    }
  }
}
