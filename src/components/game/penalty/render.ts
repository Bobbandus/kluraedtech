/**
 * Straffar – renderare i pixelgrafik (320×200 buffert som skalas upp).
 */

import type { Shot } from "@/lib/game/penalty";

type Px = (string | null)[][];
const BW = 320;
const BH = 200;
/** Målets mått i bufferten */
const GX = 160;
const GW = 72; // halva bredden
const GY = 122; // mållinjen (marken)
const GH = 52; // höjd

const cache = new Map<string, HTMLCanvasElement>();

function hash(a: number, b: number) {
  const n = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

function toCanvas(grid: Px) {
  const c = document.createElement("canvas");
  c.width = grid[0].length;
  c.height = grid.length;
  const ctx = c.getContext("2d")!;
  grid.forEach((row, y) =>
    row.forEach((v, x) => {
      if (!v) return;
      ctx.fillStyle = v;
      ctx.fillRect(x, y, 1, 1);
    }),
  );
  return c;
}

function outline(grid: Px, color: string): Px {
  const out = grid.map((r) => r.slice());
  for (let y = 0; y < grid.length; y++)
    for (let x = 0; x < grid[0].length; x++) {
      if (grid[y][x]) continue;
      const n = (dx: number, dy: number) => grid[y + dy]?.[x + dx];
      if (n(1, 0) || n(-1, 0) || n(0, 1) || n(0, -1)) out[y][x] = color;
    }
  return out;
}

function grid(rows: string[], map: Record<string, string>): Px {
  const w = Math.max(...rows.map((r) => r.length)) + 2;
  const g: Px = [Array(w).fill(null)];
  for (const r of rows) g.push([null, ...r.padEnd(w - 2, ".").split("").map((ch) => map[ch] ?? null), null]);
  g.push(Array(w).fill(null));
  return g;
}

const KEEPER: Record<string, string[]> = {
  stand: [
    "....HHHH....",
    "...HSSSSH...",
    "...SSoSoS...",
    "....SSSS....",
    ".GJJJJJJJJG.",
    "GGJJJJJJJJGG",
    "G.JJJJJJJJ.G",
    "G.JJJJJJJJ.G",
    "...PPPPPP...",
    "...PPPPPP...",
    "...SS..SS...",
    "...SS..SS...",
    "..KKK..KKK..",
  ],
  dive: [
    "GG..............",
    "GGJJJJ..........",
    ".JJJJJJJ.HHH....",
    "..JJJJJJJSSSH...",
    "...JJJJJJSoSS...",
    "....PPPPPPSS....",
    "......PPPPSSSKK.",
    ".........SSSKKK.",
  ],
  jump: [
    "G..........G",
    "GG.HHHH...GG",
    ".GJSSSSHJJG.",
    "..JSoSoSJJ..",
    "..JJSSSSJJ..",
    "..JJJJJJJJ..",
    "..JJJJJJJJ..",
    "...PPPPPP...",
    "..SS....SS..",
    ".KKK....KKK.",
  ],
};

function keeperSprite(pose: "stand" | "dive" | "jump", kit: string) {
  const key = `keeper:${pose}:${kit}`;
  let c = cache.get(key);
  if (!c) {
    const map = { H: "#3a2a1c", S: "#f2c9a0", o: "#1b2226", J: kit, G: "#f4f1e8", P: "#1b2226", K: "#e0e6e8" };
    c = toCanvas(outline(grid(KEEPER[pose], map), "#10161a"));
    cache.set(key, c);
  }
  return c;
}

function ballSprite(size: number) {
  const key = `ball:${size}`;
  let c = cache.get(key);
  if (!c) {
    const g: Px = Array.from({ length: size + 2 }, () => Array(size + 2).fill(null));
    const r = size / 2;
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        const dx = x - r + 0.5;
        const dy = y - r + 0.5;
        if (dx * dx + dy * dy > r * r) continue;
        const patch = size >= 6 && ((Math.abs(dx) < 1.2 && Math.abs(dy) < 1.2) || (Math.abs(dx + 2) < 0.8 && dy > 1.2) || (Math.abs(dx - 2) < 0.8 && dy < -1.2));
        g[y + 1][x + 1] = patch ? "#1b2226" : dx + dy > 1.5 ? "#c9d2d6" : "#ffffff";
      }
    c = toCanvas(outline(g, "#1b2226"));
    cache.set(key, c);
  }
  return c;
}

const SHOOTER = [
  "....HHHH....",
  "...HHHHHH...",
  "...HHHHHH...",
  "....SSSS....",
  "..CCCCCCCC..",
  ".CCCCCCCCCC.",
  "SCCCWWWWCCCS",
  "SCCCCWWCCCCS",
  "SCCCCWWCCCCS",
  "SCCCWWWWCCCS",
  ".CCCCCCCCCC.",
  "..CCCCCCCC..",
  "..PPPPPPPP..",
  "..PPPPPPPP..",
  "..PPP..PPP..",
  "..SSS..SSS..",
  "..WWW..WWW..",
  "..WWW..WWW..",
  "..BBB..BBB..",
];
const SHOOTER_KICK = [
  "....HHHH....",
  "...HHHHHH...",
  "...HHHHHH...",
  "....SSSS....",
  "..CCCCCCCC..",
  ".CCCCCCCCCC.",
  "SCCCWWWWCCCS",
  "SCCCCWWCCCCS",
  ".CCCCWWCCCCS",
  ".CCCWWWWCCC.",
  ".CCCCCCCCCC.",
  "..CCCCCCCC..",
  "..PPPPPPPP..",
  "..PPPPPPPPP.",
  "..PPP...PPP.",
  "..SSS....SSS",
  "..WWW....WWW",
  "..WWW.....BB",
  "..BBB.......",
];

function shooterSprite(shirt: string, kick: boolean) {
  const key = `shooter:${shirt}:${kick}`;
  let c = cache.get(key);
  if (!c) {
    const map = { H: "#3a2a1c", S: "#f2c9a0", C: shirt, W: "#f4f1e8", P: "#1b2226", B: "#10161a" };
    c = toCanvas(outline(grid(kick ? SHOOTER_KICK : SHOOTER, map), "#10161a"));
    cache.set(key, c);
  }
  return c;
}

export interface Flight {
  shot: Shot;
  t: number;
}

export interface PenaltyUi {
  reducedMotion: boolean;
  kit: string;
  shirt: string;
  /** Markören (null = syns inte) */
  aim: { u: number; v: number | null } | null;
  flight: Flight | null;
  cheer: number;
}

export class PenaltyRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private buf: HTMLCanvasElement;
  private b: CanvasRenderingContext2D;
  private bg: HTMLCanvasElement | null = null;
  private dpr = 1;
  private cssW = 1;
  private cssH = 1;
  private time = 0;
  private confetti: { x: number; y: number; vx: number; vy: number; c: string; life: number }[] = [];
  private lastFlight: Flight | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.buf = document.createElement("canvas");
    this.buf.width = BW;
    this.buf.height = BH;
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
  }

  /** Bufferten täcker hela ytan (beskärs på bredden/höjden) */
  private fit() {
    // Fyll ytan, men hela målet (med lite luft) ska alltid synas
    const s = Math.min(Math.max(this.cssW / BW, this.cssH / BH), this.cssW / (GW * 2 + 44));
    const ox = (this.cssW - BW * s) / 2;
    let oy = (this.cssH - BH * s) / 2;
    if (BH * s < this.cssH) oy = Math.min(this.cssH - BH * s, Math.max(0, this.cssH * 0.47 - (GY - GH / 2) * s));
    return { s, ox, oy };
  }

  /** Målkoordinater → skärm (CSS-px), för etiketter */
  goalToScreen(u: number, v: number) {
    const { s, ox, oy } = this.fit();
    return { x: ox + (GX + u * GW) * s, y: oy + (GY - v * GH) * s };
  }

  private buildBg() {
    const c = document.createElement("canvas");
    c.width = BW;
    c.height = BH;
    const g = c.getContext("2d")!;
    // Läktare
    for (let y = 0; y < 58; y++) {
      g.fillStyle = y % 6 < 3 ? "#2a3440" : "#232c36";
      g.fillRect(0, y, BW, 1);
    }
    // Reklamskyltar
    for (let x = 0; x < BW; x += 40) {
      g.fillStyle = (x / 40) % 2 ? "#0f6e56" : "#f2b705";
      g.fillRect(x, 58, 40, 9);
      g.fillStyle = "#ffffff";
      for (let k = 0; k < 5; k++) g.fillRect(x + 8 + k * 5, 61, 3, 3);
    }
    // Planen: ränder i perspektiv
    for (let y = 67; y < BH; y++) {
      const band = Math.floor(Math.pow((y - 67) / 133, 0.7) * 8);
      g.fillStyle = band % 2 ? "#3f9a4c" : "#48a856";
      g.fillRect(0, y, BW, 1);
    }
    // Linjer: mållinje och straffområde
    g.fillStyle = "#e9f5ea";
    g.fillRect(0, GY, BW, 1);
    g.fillRect(GX - 110, GY, 1, 0);
    for (let y = GY; y < BH; y++) {
      const k = (y - GY) / (BH - GY);
      g.fillRect(Math.round(GX - 118 - k * 70), y, 1, 1);
      g.fillRect(Math.round(GX + 118 + k * 70), y, 1, 1);
    }
    g.fillRect(GX - 150, 168, 300, 1);
    // Straffpunkt
    g.fillRect(GX - 1, 182, 3, 2);
    // Nät
    g.fillStyle = "rgba(255,255,255,0.08)";
    g.fillRect(GX - GW, GY - GH, GW * 2, GH);
    g.fillStyle = "rgba(255,255,255,0.35)";
    for (let x = GX - GW; x <= GX + GW; x += 4) g.fillRect(x, GY - GH, 1, GH);
    for (let y = GY - GH; y <= GY; y += 4) g.fillRect(GX - GW, y, GW * 2, 1);
    // Stolpar och ribba
    g.fillStyle = "#1b2226";
    g.fillRect(GX - GW - 2, GY - GH - 2, 4, GH + 2);
    g.fillRect(GX + GW - 2, GY - GH - 2, 4, GH + 2);
    g.fillRect(GX - GW - 2, GY - GH - 2, GW * 2 + 4, 4);
    g.fillStyle = "#ffffff";
    g.fillRect(GX - GW - 1, GY - GH - 1, 2, GH + 1);
    g.fillRect(GX + GW - 1, GY - GH - 1, 2, GH + 1);
    g.fillRect(GX - GW - 1, GY - GH - 1, GW * 2 + 2, 2);
    this.bg = c;
  }

  draw(ui: PenaltyUi, dt: number) {
    this.time += dt;
    if (!this.bg) this.buildBg();
    const b = this.b;
    const t = this.time;
    b.imageSmoothingEnabled = false;
    b.drawImage(this.bg!, 0, 0);
    // Publiken
    const jump = ui.cheer > 0 && !ui.reducedMotion;
    const colors = ["#e0483b", "#f2b705", "#2f7fc1", "#f4f1e8", "#3f9a5a", "#e0607e"];
    for (let row = 0; row < 9; row++)
      for (let i = 0; i < 54; i++) {
        const x = i * 6 + (row % 2) * 3 + 1;
        const y = row * 6 + 3 - (jump && hash(i, row + Math.floor(t * 8)) > 0.5 ? 1 : 0);
        b.fillStyle = "#f2c9a0";
        b.fillRect(x + 1, y, 2, 2);
        b.fillStyle = colors[Math.floor(hash(i, row) * colors.length)];
        b.fillRect(x, y + 2, 4, 2);
        if (jump && hash(i + 7, row) > 0.7) {
          b.fillStyle = "#f2c9a0";
          b.fillRect(x - 1, y - 1, 1, 2);
          b.fillRect(x + 4, y - 1, 1, 2);
        }
      }

    // Målvakten
    const f = ui.flight;
    if (f && f !== this.lastFlight) {
      this.lastFlight = f;
      if (f.shot.result === "goal" && !ui.reducedMotion)
        for (let i = 0; i < 70; i++) this.confetti.push({ x: Math.random() * BW, y: -Math.random() * 40, vx: (Math.random() - 0.5) * 30, vy: 30 + Math.random() * 50, c: colors[i % colors.length], life: 3 });
    }
    const dive = f ? Math.min(1, f.t / 0.42) : 0;
    let pose: "stand" | "dive" | "jump" = "stand";
    let kx = GX;
    let ky = GY;
    if (f && dive > 0.15) {
      if (f.shot.keeper === 0) {
        pose = "jump";
        ky = GY - Math.sin(dive * Math.PI) * 8;
      } else {
        pose = "dive";
        kx = GX + f.shot.keeper * dive * GW * 0.62;
        ky = GY - 6 - Math.sin(dive * Math.PI) * 10;
      }
    } else if (!f && !ui.reducedMotion) kx = GX + Math.sin(t * 2.3) * 6;
    const kspr = keeperSprite(pose, ui.kit);
    b.save();
    b.translate(Math.round(kx), Math.round(ky));
    if (pose === "dive" && f && f.shot.keeper === 1) b.scale(-1, 1);
    b.drawImage(kspr, -Math.round(kspr.width / 2), -kspr.height + 1);
    b.restore();

    // Bollen
    let bx = GX;
    let by = 182;
    let size = 7;
    if (f) {
      const k = Math.min(1, f.t / 0.5);
      const ease = 1 - (1 - k) * (1 - k);
      let tx = GX + f.shot.u * GW;
      let ty = GY - f.shot.v * GH;
      if (f.shot.result === "save" && k >= 1) {
        tx = kx + (f.shot.keeper || (f.shot.u > 0 ? 1 : -1)) * 6;
        ty = GY - 8 - (f.t - 0.5) * 0;
      }
      bx = 160 + (tx - 160) * ease;
      by = 182 + (ty - 182) * ease - Math.sin(k * Math.PI) * 10;
      size = Math.round(7 - ease * 3);
      if (k >= 1 && f.shot.result === "post") {
        const after = f.t - 0.5;
        bx = tx + after * 120 * (f.shot.u > 0 ? 1 : -1);
        by = ty + after * 60;
      }
      if (k >= 1 && f.shot.result === "save") {
        const after = f.t - 0.5;
        bx = tx + after * 40 * (f.shot.u >= 0 ? 1 : -1);
        by = ty + after * 90;
      }
    }
    // Skugga
    b.fillStyle = "rgba(0,40,10,0.3)";
    b.fillRect(Math.round(bx - size / 2), f ? Math.round(182 + (GY - 182) * Math.min(1, f.t / 0.5)) : 184, size, 2);
    const ball = ballSprite(size);
    b.drawImage(ball, Math.round(bx - ball.width / 2), Math.round(by - ball.height / 2));

    // Skytten (rygg) bredvid bollen
    {
      const kick = f ? Math.min(1, f.t / 0.15) : 0;
      const spr = shooterSprite(ui.shirt, kick > 0.5);
      const sx = 150 - Math.round(kick * 4);
      b.drawImage(spr, sx - Math.round(spr.width / 2), 186 - spr.height);
    }

    // Konfetti
    for (const c of this.confetti) {
      c.life -= dt;
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      b.fillStyle = c.c;
      b.fillRect(Math.round(c.x), Math.round(c.y), 2, 1);
    }
    this.confetti = this.confetti.filter((c) => c.life > 0 && c.y < BH);

    // Upp på skärmen
    const ctx = this.ctx;
    const { s, ox, oy } = this.fit();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = "#232c36";
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.fillStyle = "#48a856";
    ctx.fillRect(0, (oy + BH * s - 2) * this.dpr, this.canvas.width, this.canvas.height);
    ctx.drawImage(this.buf, ox * this.dpr, oy * this.dpr, BW * s * this.dpr, BH * s * this.dpr);

    // Siktet i full upplösning
    if (ui.aim) {
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      const p = this.goalToScreen(ui.aim.u, ui.aim.v ?? 0.5);
      ctx.strokeStyle = "#ffd84a";
      ctx.lineWidth = 3;
      if (ui.aim.v === null) {
        // Bara sidan vald: lodrät linje
        const top = this.goalToScreen(ui.aim.u, 1.2).y;
        const bot = this.goalToScreen(ui.aim.u, 0).y;
        ctx.setLineDash([8, 6]);
        ctx.beginPath();
        ctx.moveTo(p.x, top);
        ctx.lineTo(p.x, bot);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = "#ffd84a";
        ctx.beginPath();
        ctx.arc(p.x, bot + 10, 7, 0, Math.PI * 2);
        ctx.fill();
      } else {
        const r = 14;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(p.x - r - 6, p.y);
        ctx.lineTo(p.x - r + 5, p.y);
        ctx.moveTo(p.x + r - 5, p.y);
        ctx.lineTo(p.x + r + 6, p.y);
        ctx.moveTo(p.x, p.y - r - 6);
        ctx.lineTo(p.x, p.y - r + 5);
        ctx.moveTo(p.x, p.y + r - 5);
        ctx.lineTo(p.x, p.y + r + 6);
        ctx.stroke();
      }
    }
  }
}
