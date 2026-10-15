/**
 * Isfiske – renderare. Världen ritas i halv upplösning (320×240) till en
 * buffert som skalas upp utan utjämning: äkta pixelgrafik. Text och
 * siffror ritas ovanpå i full upplösning så att de går att läsa.
 */

import { BOTTOM, FISH, H, HOLE_X, SURFACE, W, WATER, lineDepth, meters, type FishEvent, type FishingState } from "@/lib/game/fishing";
import { fishSprite, fisherSprite, shade } from "./sprites";

const S = 0.5; // värld → buffert
const BW = W * S;
const BH = H * S;

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  kind: "bubble" | "drop" | "text" | "spark";
  color: string;
  text?: string;
  big?: boolean;
}

export interface FishUi {
  reducedMotion: boolean;
  coat: string;
  hat: string;
}

function hash(a: number, b: number) {
  const n = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

const WATER_BANDS = ["#58b3d3", "#3f97bf", "#2f7ca6", "#23628a", "#194b6d", "#123a56", "#0d2b42"];

export class FishRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private buf: HTMLCanvasElement;
  private b: CanvasRenderingContext2D;
  private bg: HTMLCanvasElement | null = null;
  private dpr = 1;
  private cssW = 640;
  private cssH = 480;
  private parts: Particle[] = [];
  private lastEvent = -1;
  private time = 0;
  private shake = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.buf = document.createElement("canvas");
    this.buf.width = BW;
    this.buf.height = BH;
    this.b = this.buf.getContext("2d")!;
  }

  resize(cssWidth: number) {
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.cssW = Math.round(cssWidth);
    this.cssH = Math.round((cssWidth * H) / W);
    this.canvas.style.width = `${this.cssW}px`;
    this.canvas.style.height = `${this.cssH}px`;
    this.canvas.width = Math.round(this.cssW * this.dpr);
    this.canvas.height = Math.round(this.cssH * this.dpr);
  }

  /** Skärmkoordinater (CSS-px) → värld */
  toWorld(px: number, py: number) {
    return { x: (px / this.cssW) * W, y: (py / this.cssH) * H };
  }

  /* ---------- Bakgrund (cachas) ---------- */

  private buildBg() {
    const c = document.createElement("canvas");
    c.width = BW;
    c.height = BH;
    const g = c.getContext("2d")!;
    const sy = SURFACE * S;
    // Himmel i band
    const sky = ["#a9d4ee", "#bcdff2", "#cfe8f6", "#e1f1fa"];
    for (let y = 0; y < 36; y++) {
      const band = Math.min(sky.length - 1, Math.floor(y / 9));
      const next = Math.min(sky.length - 1, band + 1);
      const inBand = y % 9;
      g.fillStyle = sky[band];
      g.fillRect(0, y, BW, 1);
      if (inBand >= 7)
        for (let x = (y % 2); x < BW; x += 2) {
          g.fillStyle = sky[next];
          g.fillRect(x, y, 1, 1);
        }
    }
    // Sol
    g.fillStyle = "#fff6d6";
    for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) if (dx * dx + dy * dy <= 17) g.fillRect(262 + dx, 10 + dy, 1, 1);
    // Avlägsna fjäll
    for (let x = 0; x < BW; x++) {
      const hgt = 10 + Math.sin(x * 0.03) * 5 + Math.sin(x * 0.081 + 1) * 3;
      const top = Math.round(36 - hgt);
      for (let y = top; y < 40; y++) {
        g.fillStyle = y - top < 3 ? "#f6fbff" : y - top < 6 ? "#dbe9f2" : "#bcd3e2";
        g.fillRect(x, y, 1, 1);
      }
    }
    // Granskog på stranden
    for (let i = 0; i < 46; i++) {
      const x = Math.floor(hash(i, 3) * BW);
      const hgt = 7 + Math.floor(hash(i, 5) * 8);
      const base = 41;
      for (let k = 0; k < hgt; k++) {
        const w = Math.max(0, Math.round(((k / hgt) * hgt) / 3));
        g.fillStyle = k % 3 === 0 ? "#1f4b3c" : "#2a5f4a";
        g.fillRect(x - w, base - hgt + k, w * 2 + 1, 1);
        if (k % 3 === 0 && w > 0) {
          g.fillStyle = "#eef6fa";
          g.fillRect(x - w, base - hgt + k, 1, 1);
        }
      }
      g.fillStyle = "#4a3426";
      g.fillRect(x, base, 1, 1);
    }
    // Snö på isen
    const iceTop = 40;
    for (let y = iceTop; y < sy; y++) {
      for (let x = 0; x < BW; x++) {
        let col = "#f4f9fc";
        const d = y - iceTop;
        if (d > 2 && hash(x, y) > 0.93) col = "#dbe8f0";
        if (d > 6) col = hash(x, y) > 0.5 ? "#e8f2f7" : "#f4f9fc";
        if (y >= sy - 4) col = y >= sy - 2 ? "#7fbfd8" : "#a9d8ea";
        g.fillStyle = col;
        g.fillRect(x, y, 1, 1);
      }
    }
    // Snövallar
    for (let x = 0; x < BW; x++) {
      const bump = Math.round(Math.sin(x * 0.07) * 1.5 + Math.sin(x * 0.19) * 0.8);
      g.fillStyle = "#ffffff";
      g.fillRect(x, iceTop - 1 + bump, 1, 2);
    }
    // Vatten: band med dither emellan
    const bandH = (BH - sy) / WATER_BANDS.length;
    for (let y = Math.floor(sy); y < BH; y++) {
      const t = (y - sy) / bandH;
      const band = Math.min(WATER_BANDS.length - 1, Math.floor(t));
      const next = Math.min(WATER_BANDS.length - 1, band + 1);
      const f = t - band;
      g.fillStyle = WATER_BANDS[band];
      g.fillRect(0, y, BW, 1);
      if (f > 0.7) {
        g.fillStyle = WATER_BANDS[next];
        for (let x = y % 2; x < BW; x += f > 0.85 ? 1 : 2) g.fillRect(x, y, 1, 1);
      }
    }
    // Isens undersida: is-kristaller
    for (let x = 0; x < BW; x++) {
      const d = 1 + Math.floor(hash(x, 9) * 3);
      g.fillStyle = "#9ad2e6";
      g.fillRect(x, sy, 1, d);
      if (hash(x, 11) > 0.85) {
        g.fillStyle = "#c6e8f3";
        g.fillRect(x, sy + d, 1, 1);
      }
    }
    // Botten
    const by = BOTTOM * S;
    for (let x = 0; x < BW; x++) {
      const top = Math.round(by + Math.sin(x * 0.05) * 2 + Math.sin(x * 0.17) * 1);
      for (let y = top; y < BH; y++) {
        g.fillStyle = y === top ? "#7a6a45" : hash(x, y) > 0.7 ? "#4a3f28" : "#5b4d31";
        g.fillRect(x, y, 1, 1);
      }
    }
    // Stenar
    for (let i = 0; i < 9; i++) {
      const x = Math.floor(hash(i, 21) * BW);
      const r = 3 + Math.floor(hash(i, 22) * 4);
      for (let dy = -r; dy <= 0; dy++)
        for (let dx = -r - 1; dx <= r + 1; dx++) {
          if ((dx * dx) / ((r + 1) * (r + 1)) + (dy * dy) / (r * r) > 1) continue;
          g.fillStyle = dy < -r * 0.5 && dx < 0 ? "#7d8a8c" : "#56625f";
          g.fillRect(x + dx, by + dy + 1, 1, 1);
        }
    }
    // Hålet i isen
    const hx = Math.round(HOLE_X * S);
    for (let y = 44; y < sy; y++) {
      const w = y < 47 ? 9 - (47 - y) * 1 : 9;
      for (let dx = -w; dx <= w; dx++) {
        g.fillStyle = y === 44 || Math.abs(dx) === w ? "#bfe0ee" : y < 47 ? "#1d4f6a" : "#2b6f92";
        g.fillRect(hx + dx, y, 1, 1);
      }
    }
    // Isbitar runt hålet
    g.fillStyle = "#cfeaf5";
    [-13, -11, 12, 14, 16].forEach((dx, i) => g.fillRect(hx + dx, 42 + (i % 2), 2, 1));
    this.bg = c;
  }

  /* ---------- Rita ---------- */

  draw(gm: FishingState, ui: FishUi, dt: number) {
    this.time += dt;
    if (!this.bg) this.buildBg();
    const b = this.b;
    b.imageSmoothingEnabled = false;
    b.drawImage(this.bg!, 0, 0);
    this.handleEvents(gm, ui);
    const t = this.time;
    const sy = SURFACE * S;

    // Ljusstrålar
    if (!ui.reducedMotion) {
      b.globalAlpha = 0.07;
      b.fillStyle = "#e9fbff";
      for (let i = 0; i < 5; i++) {
        const x0 = ((i * 83 + t * 4) % (BW + 60)) - 30;
        b.beginPath();
        b.moveTo(x0, sy);
        b.lineTo(x0 + 14, sy);
        b.lineTo(x0 + 44, sy + 90);
        b.lineTo(x0 + 22, sy + 90);
        b.fill();
      }
      b.globalAlpha = 1;
    }

    // Vass/sjögräs
    for (let i = 0; i < 26; i++) {
      const x = Math.floor(hash(i, 31) * BW);
      const hgt = 8 + Math.floor(hash(i, 32) * 18);
      const base = BOTTOM * S + 1;
      for (let k = 0; k < hgt; k++) {
        const sway = ui.reducedMotion ? 0 : Math.round(Math.sin(t * 1.4 + i + k * 0.25) * (k / hgt) * 2.5);
        b.fillStyle = k % 4 === 0 ? "#2f6b3e" : "#3f8a4e";
        b.fillRect(x + sway, base - k, 1, 1);
        if (k > 3 && k % 5 === 2) b.fillRect(x + sway + 1, base - k, 1, 1);
      }
    }

    // Linans gräns: mörkt under
    const maxY = (SURFACE + lineDepth(gm.correct)) * S;
    if (maxY < BOTTOM * S - 2) {
      b.fillStyle = "rgba(4,14,24,0.38)";
      b.fillRect(0, maxY + 6, BW, BH - maxY - 6);
      b.fillStyle = "rgba(255,255,255,0.5)";
      for (let x = (Math.floor(t * 8) % 6); x < BW; x += 6) b.fillRect(x, Math.round(maxY + 6), 3, 1);
    }

    // Fiskar
    const frame = Math.floor(t * 5) % 2;
    for (const f of gm.fish) {
      const spr = fishSprite(f.kind, f.kind === "kanga" ? 0 : frame);
      const x = Math.round(f.x * S);
      const y = Math.round(f.y * S);
      b.save();
      b.translate(x, y);
      if (f.dir === -1) b.scale(-1, 1);
      if (f.kind === "guld" && !ui.reducedMotion) b.globalAlpha = f.ttl !== undefined && f.ttl < 3 ? 0.6 + Math.sin(t * 20) * 0.3 : 1;
      b.drawImage(spr, -Math.round(spr.width / 2), -Math.round(spr.height / 2));
      b.restore();
      if (f.kind === "guld" && !ui.reducedMotion && Math.floor(t * 8 + f.id) % 3 === 0) {
        b.fillStyle = "#fff7c2";
        b.fillRect(x + Math.round(Math.sin(t * 9) * 6), y - 5 + Math.round(Math.cos(t * 7) * 3), 1, 1);
      }
    }

    // Fiskaren
    const hx = Math.round(HOLE_X * S);
    const fisher = fisherSprite(ui.coat, ui.hat);
    const fx = hx - 27;
    const fy = 44 - fisher.height + 4;
    b.drawImage(fisher, fx, fy);
    // Spö: från handen ut över hålet
    const handX = fx + 12;
    const handY = fy + 8;
    const bob = gm.reeling && !ui.reducedMotion ? Math.round(Math.sin(t * 30)) : 0;
    const tipX = hx - 1;
    const tipY = 33 + bob;
    b.strokeStyle = "#2a1f18";
    b.lineWidth = 1;
    this.pixLine(b, handX, handY, tipX, tipY, "#6b4a2c");
    b.fillStyle = "#d9483b";
    b.fillRect(tipX, tipY, 1, 1);

    // Linan
    const kx = Math.round(gm.hx * S);
    const ky = Math.round(gm.hy * S);
    this.pixLine(b, tipX, tipY + 1, hx, sy, "rgba(240,240,240,0.9)");
    this.pixLine(b, hx, sy, kx, ky, "rgba(225,240,245,0.75)");
    // Pimpel/krok med bete
    b.fillStyle = "#c9d2d6";
    b.fillRect(kx - 1, ky - 3, 3, 3);
    b.fillStyle = "#8a979c";
    b.fillRect(kx - 1, ky - 1, 3, 1);
    b.fillStyle = "#e0e6e8";
    b.fillRect(kx, ky, 1, 2);
    b.fillRect(kx + 1, ky + 1, 1, 1);
    if (gm.bait > 0 && !gm.hooked) {
      const w = ui.reducedMotion ? 0 : Math.round(Math.sin(t * 9));
      b.fillStyle = "#e86a6a";
      b.fillRect(kx + 1, ky + 2, 1, 1);
      b.fillRect(kx + 2 + w, ky + 3, 1, 1);
      b.fillStyle = "#c94a52";
      b.fillRect(kx + 1 + w, ky + 4, 1, 1);
    }

    // Partiklar (i bufferten)
    for (const p of this.parts) {
      if (p.kind === "text") continue;
      const a = Math.max(0, p.life / p.max);
      b.globalAlpha = a;
      b.fillStyle = p.color;
      const px = Math.round(p.x * S);
      const py = Math.round(p.y * S);
      if (p.kind === "bubble") {
        b.fillRect(px, py - 1, 1, 1);
        b.fillRect(px - 1, py, 1, 1);
        b.fillRect(px + 1, py, 1, 1);
        b.fillRect(px, py + 1, 1, 1);
      } else b.fillRect(px, py, p.kind === "spark" ? 2 : 1, p.kind === "spark" ? 2 : 1);
      b.globalAlpha = 1;
    }

    // Skala upp till skärmen
    const ctx = this.ctx;
    const d = this.dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = false;
    let ox = 0;
    let oy = 0;
    if (this.shake > 0 && !ui.reducedMotion) {
      ox = (Math.random() - 0.5) * this.shake * 8;
      oy = (Math.random() - 0.5) * this.shake * 8;
      this.shake = Math.max(0, this.shake - dt * 2.5);
    }
    ctx.fillStyle = "#0d2b42";
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.drawImage(this.buf, ox, oy, this.canvas.width, this.canvas.height);

    // Text i full upplösning
    ctx.setTransform(d * (this.cssW / W), 0, 0, d * (this.cssH / H), 0, 0);
    const k = W / this.cssW; // world px per css px – för att hålla textstorleken stadig
    ctx.textBaseline = "middle";
    // Djupskala
    ctx.font = `800 ${11 * k}px Nunito, system-ui, sans-serif`;
    ctx.textAlign = "left";
    for (let m = 4; m <= 24; m += 4) {
      const y = SURFACE + (m / 24) * WATER;
      if (y > BOTTOM - 10) break;
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.fillRect(0, y, 8 * k, 2);
      ctx.fillText(`${m} m`, 11 * k, y);
    }
    if (maxY < BOTTOM * S - 2) {
      ctx.textAlign = "center";
      ctx.font = `800 ${12 * k}px Nunito, system-ui, sans-serif`;
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.fillText(`Linan räcker ${meters(lineDepth(gm.correct))} m – svara rätt för längre lina`, W / 2, maxY / S + 26);
    }
    // Djup vid kroken
    ctx.textAlign = "left";
    ctx.font = `900 ${12 * k}px Nunito, system-ui, sans-serif`;
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    if (gm.hy > SURFACE + 20) ctx.fillText(`${meters(gm.hy - SURFACE)} m`, gm.hx + 10 * k, gm.hy - 6 * k);
    // Flytande text
    for (const p of this.parts) {
      if (p.kind !== "text") continue;
      const a = Math.max(0, Math.min(1, p.life / p.max) * 1.6);
      ctx.globalAlpha = Math.min(1, a);
      ctx.textAlign = "center";
      ctx.font = `900 ${(p.big ? 26 : 17) * k}px Nunito, system-ui, sans-serif`;
      ctx.lineWidth = 4 * k;
      ctx.strokeStyle = "rgba(10,30,40,0.85)";
      ctx.strokeText(p.text!, p.x, p.y);
      ctx.fillStyle = p.color;
      ctx.fillText(p.text!, p.x, p.y);
      ctx.globalAlpha = 1;
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    // Uppdatera partiklar
    for (const p of this.parts) {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.kind === "drop") p.vy += 380 * dt;
      if (p.kind === "bubble") {
        p.x += Math.sin((p.life + p.x) * 6) * 0.3;
        if (p.y < SURFACE + 4) p.life = 0;
      }
    }
    this.parts = this.parts.filter((p) => p.life > 0);
    // Små bubblor från fiskar ibland
    if (!ui.reducedMotion && Math.random() < dt * 2.2 && gm.fish.length) {
      const f = gm.fish[Math.floor(Math.random() * gm.fish.length)];
      if (f.kind !== "kanga") this.parts.push({ x: f.x, y: f.y - 4, vx: 0, vy: -26, life: 3, max: 3, kind: "bubble", color: "#bfe8f6" });
    }
  }

  private pixLine(b: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, color: string) {
    b.fillStyle = color;
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const n = Math.max(dx, dy);
    for (let i = 0; i <= n; i++) {
      const u = n ? i / n : 0;
      b.fillRect(Math.round(x0 + (x1 - x0) * u), Math.round(y0 + (y1 - y0) * u), 1, 1);
    }
  }

  private handleEvents(gm: FishingState, ui: FishUi) {
    for (const e of gm.events) {
      if (e.t <= this.lastEvent) continue;
      this.onEvent(e, gm, ui);
    }
    if (gm.events.length) this.lastEvent = gm.events[gm.events.length - 1].t;
  }

  private onEvent(e: FishEvent, gm: FishingState, ui: FishUi) {
    const lots = ui.reducedMotion ? 0.3 : 1;
    if (e.type === "splash" || e.type === "catch") {
      for (let i = 0; i < 14 * lots; i++)
        this.parts.push({ x: HOLE_X + (Math.random() - 0.5) * 16, y: SURFACE - 16, vx: (Math.random() - 0.5) * 140, vy: -120 - Math.random() * 120, life: 0.8, max: 0.8, kind: "drop", color: Math.random() < 0.5 ? "#d8f2fb" : "#8fd0ea" });
    }
    if (e.type === "catch") {
      const info = FISH[e.kind];
      const big = e.value >= 50;
      this.parts.push({ x: HOLE_X, y: SURFACE - 52, vx: 0, vy: -26, life: 2, max: 2, kind: "text", text: e.value ? `+${e.value} ${info.name}` : "En gammal känga …", color: e.kind === "guld" ? "#ffd84a" : big ? "#ffe39a" : "#ffffff", big });
      if (big) {
        this.shake = 0.6;
        for (let i = 0; i < 22 * lots; i++)
          this.parts.push({ x: HOLE_X, y: SURFACE - 30, vx: (Math.random() - 0.5) * 260, vy: -60 - Math.random() * 200, life: 1, max: 1, kind: "spark", color: ["#ffd84a", "#fff3b0", "#ff9c1a"][i % 3] });
      }
    }
    if (e.type === "bite") {
      this.parts.push({ x: gm.hx, y: gm.hy - 30, vx: 0, vy: -20, life: 0.9, max: 0.9, kind: "text", text: "Napp!", color: "#ffe39a" });
      for (let i = 0; i < 6 * lots; i++) this.parts.push({ x: gm.hx, y: gm.hy, vx: (Math.random() - 0.5) * 40, vy: -30 - Math.random() * 30, life: 1.4, max: 1.4, kind: "bubble", color: "#d8f2fb" });
    }
    if (e.type === "steal") {
      this.shake = 0.4;
      this.parts.push({ x: gm.hx, y: gm.hy - 30, vx: 0, vy: -20, life: 1.3, max: 1.3, kind: "text", text: "Gäddan snodde den!", color: "#ffb3a8" });
      for (let i = 0; i < 10 * lots; i++) this.parts.push({ x: gm.hx, y: gm.hy, vx: (Math.random() - 0.5) * 60, vy: -30 - Math.random() * 40, life: 1.4, max: 1.4, kind: "bubble", color: "#d8f2fb" });
    }
    if (e.type === "snag") this.parts.push({ x: gm.hx, y: gm.hy - 30, vx: 0, vy: -20, life: 1, max: 1, kind: "text", text: "Fast i något …", color: "#ffffff" });
    if (e.type === "bait") this.parts.push({ x: HOLE_X + 70, y: SURFACE - 60, vx: 0, vy: -24, life: 1.4, max: 1.4, kind: "text", text: `+${e.amount} bete`, color: "#ffb3b3" });
  }
}

export { shade };
