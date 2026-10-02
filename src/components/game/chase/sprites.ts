/**
 * Biljakt – ritfunktioner. Allt ritas i kod (inga bildfiler).
 *
 * Ljuset kommer från övre vänstra hörnet. Skuggor faller nedåt höger.
 * Bilar ritas pekande åt höger (+x) runt origo och cachas per modell/färg.
 */

import type { Building, CarModel, Tree } from "@/lib/game/chase";

export type Ctx = CanvasRenderingContext2D;

export const INK = "#1d2326";
export const SHADOW = "rgba(18, 28, 30, 0.26)";

/* ---------- Färghjälp ---------- */

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Blanda mot vitt (k>0) eller svart (k<0). */
export function shade(hex: string, k: number): string {
  const [r, g, b] = hexToRgb(hex);
  const t = k > 0 ? 255 : 0;
  const a = Math.abs(k);
  return `rgb(${Math.round(r + (t - r) * a)}, ${Math.round(g + (t - g) * a)}, ${Math.round(b + (t - b) * a)})`;
}

/** Deterministisk brus (0..1) för en punkt. */
export function hash2(x: number, y: number, s = 0): number {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 1442695041)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function rrect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/* ---------- Bilar ---------- */

interface CarDims {
  L: number;
  W: number;
  /** Rundning fram/bak */
  fr: number;
  rr: number;
  /** Glas och tak (x-led, från bakre kanten mätt i andel av L) */
  rearGlass: number;
  roofStart: number;
  roofEnd: number;
  windshield: number;
  wheelbase: number;
}

export const CAR_DIMS: Record<CarModel, CarDims> = {
  halvkombi: { L: 50, W: 26, fr: 9, rr: 7, rearGlass: 0.1, roofStart: 0.18, roofEnd: 0.56, windshield: 0.68, wheelbase: 0.62 },
  kombi: { L: 58, W: 27, fr: 9, rr: 5, rearGlass: 0.07, roofStart: 0.13, roofEnd: 0.58, windshield: 0.7, wheelbase: 0.64 },
  sport: { L: 56, W: 28, fr: 12, rr: 8, rearGlass: 0.24, roofStart: 0.32, roofEnd: 0.56, windshield: 0.68, wheelbase: 0.62 },
  pickup: { L: 62, W: 28, fr: 8, rr: 4, rearGlass: 0.44, roofStart: 0.47, roofEnd: 0.66, windshield: 0.75, wheelbase: 0.66 },
  polis: { L: 60, W: 28, fr: 9, rr: 5, rearGlass: 0.07, roofStart: 0.13, roofEnd: 0.58, windshield: 0.7, wheelbase: 0.64 },
};

/** Karossens kontur, pekande åt +x. */
function bodyPath(ctx: Ctx, d: CarDims) {
  const hl = d.L / 2;
  const hw = d.W / 2;
  const { fr, rr } = d;
  ctx.beginPath();
  ctx.moveTo(-hl + rr, -hw);
  // Vänster sida (uppåt i bilden) med lätt midja
  ctx.quadraticCurveTo(0, -hw + 0.8, hl - fr * 1.3, -hw);
  // Front: rundad nos
  ctx.bezierCurveTo(hl - fr * 0.25, -hw, hl, -hw + fr * 0.45, hl, -hw + fr);
  ctx.quadraticCurveTo(hl + 1.6, 0, hl, hw - fr);
  ctx.bezierCurveTo(hl, hw - fr * 0.45, hl - fr * 0.25, hw, hl - fr * 1.3, hw);
  ctx.quadraticCurveTo(0, hw - 0.8, -hl + rr, hw);
  // Bak
  ctx.quadraticCurveTo(-hl, hw, -hl, hw - rr);
  ctx.quadraticCurveTo(-hl - 1, 0, -hl, -hw + rr);
  ctx.quadraticCurveTo(-hl, -hw, -hl + rr, -hw);
  ctx.closePath();
}

const ax = (d: CarDims, k: number) => -d.L / 2 + d.L * k;

function drawCarBody(ctx: Ctx, model: CarModel, color: string) {
  const d = CAR_DIMS[model];
  const hl = d.L / 2;
  const hw = d.W / 2;
  const base = model === "polis" ? "#f4f6f7" : color;

  // Kaross med ljus från vänster/upp
  const g = ctx.createLinearGradient(0, -hw, 0, hw);
  g.addColorStop(0, shade(base, 0.28));
  g.addColorStop(0.35, base);
  g.addColorStop(1, shade(base, -0.28));
  bodyPath(ctx, d);
  ctx.fillStyle = g;
  ctx.fill();

  ctx.save();
  bodyPath(ctx, d);
  ctx.clip();

  // Polisdekor: blått/gult rutmönster längs sidorna
  if (model === "polis") {
    const sq = 4;
    for (let x = -hl; x < hl; x += sq) {
      for (let row = 0; row < 2; row++) {
        const blue = (Math.floor((x + hl) / sq) + row) % 2 === 0;
        ctx.fillStyle = blue ? "#1f4fa8" : "#f3c522";
        ctx.fillRect(x, -hw + row * sq - 0.5, sq, sq);
        ctx.fillRect(x, hw - (row + 1) * sq + 0.5, sq, sq);
      }
    }
  }

  // Sportbil: ränder
  if (model === "sport") {
    ctx.fillStyle = "rgba(255,255,255,0.82)";
    ctx.fillRect(-hl, -4.5, d.L, 3);
    ctx.fillRect(-hl, 1.5, d.L, 3);
  }

  // Panellinjer (motorhuv och baklucka)
  ctx.strokeStyle = "rgba(0,0,0,0.22)";
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  const hood = ax(d, d.windshield + 0.06);
  ctx.moveTo(hood, -hw + 2);
  ctx.quadraticCurveTo(hood + 2, 0, hood, hw - 2);
  if (model !== "pickup") {
    const trunk = ax(d, d.rearGlass - 0.02);
    ctx.moveTo(trunk, -hw + 3);
    ctx.quadraticCurveTo(trunk - 1, 0, trunk, hw - 3);
  }
  ctx.stroke();

  // Glans på motorhuven
  const sh = ctx.createRadialGradient(hl - d.L * 0.12, -hw * 0.35, 1, hl - d.L * 0.12, -hw * 0.35, d.W * 0.6);
  sh.addColorStop(0, "rgba(255,255,255,0.35)");
  sh.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = sh;
  ctx.fillRect(hood, -hw, hl - hood, d.W);
  ctx.restore();

  // Flak på pickup
  if (model === "pickup") {
    const bx0 = -hl + 3;
    const bx1 = ax(d, d.rearGlass - 0.03);
    ctx.fillStyle = shade(base, -0.45);
    rrect(ctx, bx0, -hw + 3, bx1 - bx0, d.W - 6, 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.25)";
    ctx.lineWidth = 1;
    for (let y = -hw + 6.5; y < hw - 4; y += 3.5) {
      ctx.beginPath();
      ctx.moveTo(bx0 + 1, y);
      ctx.lineTo(bx1 - 1, y);
      ctx.stroke();
    }
  }

  // Glas: vindruta, sidorutor, bakruta
  const wx = ax(d, d.windshield);
  const rs = ax(d, d.roofStart);
  const re = ax(d, d.roofEnd);
  const rg = ax(d, d.rearGlass);
  const gin = 2.2; // glasets indrag från kanten
  const glass = ctx.createLinearGradient(0, -hw, 0, hw);
  glass.addColorStop(0, "#5d7486");
  glass.addColorStop(0.5, "#2c3d4b");
  glass.addColorStop(1, "#1d2a35");
  ctx.fillStyle = glass;
  ctx.beginPath();
  ctx.moveTo(wx, -hw + gin + 1.5);
  ctx.quadraticCurveTo(wx + 3, 0, wx, hw - gin - 1.5);
  ctx.lineTo(rg + 1, hw - gin - 1);
  ctx.quadraticCurveTo(rg - 1.5, 0, rg + 1, -hw + gin + 1);
  ctx.closePath();
  ctx.fill();

  // Tak
  const roof = ctx.createLinearGradient(0, -hw, 0, hw);
  roof.addColorStop(0, shade(base, 0.38));
  roof.addColorStop(0.6, shade(base, 0.08));
  roof.addColorStop(1, shade(base, -0.12));
  ctx.fillStyle = roof;
  rrect(ctx, rs, -hw + gin + 2.6, re - rs, d.W - (gin + 2.6) * 2, 3);
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.18)";
  ctx.lineWidth = 0.8;
  ctx.stroke();

  // Takräcke på kombi
  if (model === "kombi") {
    ctx.strokeStyle = "rgba(25,28,30,0.7)";
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(rs + 2, -hw + 6);
    ctx.lineTo(re - 2, -hw + 6);
    ctx.moveTo(rs + 2, hw - 6);
    ctx.lineTo(re - 2, hw - 6);
    ctx.stroke();
  }
  if (model === "polis") {
    // "POLIS" på motorhuven (läses från förarplats – roterad)
    ctx.save();
    ctx.translate((hood + hl) / 2 + 1, 0);
    ctx.rotate(Math.PI / 2);
    ctx.fillStyle = "#1f4fa8";
    ctx.font = "900 5.4px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("POLIS", 0, 0);
    ctx.restore();
    // Nummer på taket
    ctx.save();
    ctx.translate((rs + re) / 2 - 3, 0);
    ctx.rotate(Math.PI / 2);
    ctx.fillStyle = "#1d2326";
    ctx.font = "800 7px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("24", 0, 0);
    ctx.restore();
  }

  // Reflex i vindrutan
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(wx, -hw + gin + 1.5);
  ctx.quadraticCurveTo(wx + 3, 0, wx, hw - gin - 1.5);
  ctx.lineTo(re, hw - gin - 2);
  ctx.lineTo(re, -hw + gin + 2);
  ctx.closePath();
  ctx.clip();
  ctx.fillStyle = "rgba(255,255,255,0.28)";
  ctx.beginPath();
  ctx.moveTo(wx - 2, -hw);
  ctx.lineTo(wx + 3, -hw);
  ctx.lineTo(wx - 4, hw);
  ctx.lineTo(wx - 9, hw);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Backspeglar
  ctx.fillStyle = shade(base, -0.15);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1;
  for (const s of [-1, 1]) {
    rrect(ctx, wx - 3.5, s * (hw + 0.5) - 1.6, 4, 3.2, 1.2);
    ctx.fill();
    ctx.stroke();
  }

  // Lampor
  ctx.fillStyle = "#fff4cf";
  for (const s of [-1, 1]) {
    rrect(ctx, hl - 4.5, s * (hw - 4.5) - 2.2, 3.4, 4.4, 1.4);
    ctx.fill();
  }
  ctx.fillStyle = "#b8202a";
  for (const s of [-1, 1]) {
    rrect(ctx, -hl + 0.6, s * (hw - 4) - 2.4, 2.4, 4.8, 1);
    ctx.fill();
  }

  // Spoiler på sportbilen
  if (model === "sport") {
    ctx.fillStyle = "#23282b";
    rrect(ctx, -hl + 1, -hw - 1, 3.5, d.W + 2, 1.2);
    ctx.fill();
  }

  // Kontur
  bodyPath(ctx, d);
  ctx.strokeStyle = "rgba(16, 20, 22, 0.92)";
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

interface CarSprite {
  canvas: HTMLCanvasElement;
  shadow: HTMLCanvasElement;
  w: number;
  h: number;
  scale: number;
}

const carCache = new Map<string, CarSprite>();

export function carSprite(model: CarModel, color: string, scale: number): CarSprite {
  const key = `${model}|${color}|${scale}`;
  const hit = carCache.get(key);
  if (hit) return hit;
  const d = CAR_DIMS[model];
  const w = d.L + 14;
  const h = d.W + 14;
  const mk = () => {
    const c = document.createElement("canvas");
    c.width = Math.ceil(w * scale);
    c.height = Math.ceil(h * scale);
    return c;
  };
  const canvas = mk();
  const ctx = canvas.getContext("2d")!;
  ctx.scale(scale, scale);
  ctx.translate(w / 2, h / 2);
  drawCarBody(ctx, model, color);

  // Mjuk skugga
  const shadow = mk();
  const sx = shadow.getContext("2d")!;
  sx.scale(scale, scale);
  sx.translate(w / 2, h / 2);
  sx.filter = `blur(${2.2}px)`;
  bodyPath(sx, { ...d, L: d.L + 1, W: d.W + 1 });
  sx.fillStyle = "rgba(10, 18, 20, 0.42)";
  sx.fill();
  const sp = { canvas, shadow, w, h, scale };
  carCache.set(key, sp);
  return sp;
}

/** Hjul under karossen. Framhjulen följer styrningen. */
export function drawWheels(ctx: Ctx, model: CarModel, steer: number) {
  const d = CAR_DIMS[model];
  const hw = d.W / 2;
  const wb = (d.L * d.wheelbase) / 2;
  const ww = model === "sport" || model === "pickup" ? 6 : 5;
  ctx.fillStyle = "#16191b";
  for (const [x, s, turn] of [
    [wb, -1, steer],
    [wb, 1, steer],
    [-wb, -1, 0],
    [-wb, 1, 0],
  ] as [number, number, number][]) {
    ctx.save();
    ctx.translate(x, s * (hw - 1.5));
    ctx.rotate(turn * 0.45);
    rrect(ctx, -5.5, -ww / 2, 11, ww, 2);
    ctx.fill();
    ctx.restore();
  }
}

export function drawCar(
  ctx: Ctx,
  x: number,
  y: number,
  a: number,
  model: CarModel,
  color: string,
  scale: number,
  opts: { steer?: number; braking?: boolean; lights?: number; alpha?: number; noShadow?: boolean } = {},
) {
  const sp = carSprite(model, color, scale);
  const d = CAR_DIMS[model];
  ctx.save();
  if (opts.alpha !== undefined) ctx.globalAlpha = opts.alpha;
  if (!opts.noShadow) {
    ctx.save();
    ctx.translate(x + 3.5, y + 5);
    ctx.rotate(a);
    ctx.drawImage(sp.shadow, -sp.w / 2, -sp.h / 2, sp.w, sp.h);
    ctx.restore();
  }
  ctx.translate(x, y);
  ctx.rotate(a);
  drawWheels(ctx, model, opts.steer ?? 0);
  ctx.drawImage(sp.canvas, -sp.w / 2, -sp.h / 2, sp.w, sp.h);
  const hl = d.L / 2;
  const hw = d.W / 2;
  if (opts.braking) {
    ctx.globalCompositeOperation = "lighter";
    for (const s of [-1, 1]) {
      const g = ctx.createRadialGradient(-hl, s * (hw - 4), 0, -hl, s * (hw - 4), 9);
      g.addColorStop(0, "rgba(255,60,50,0.9)");
      g.addColorStop(1, "rgba(255,60,50,0)");
      ctx.fillStyle = g;
      ctx.fillRect(-hl - 10, s * (hw - 4) - 10, 20, 20);
    }
    ctx.globalCompositeOperation = "source-over";
  }
  if (model === "polis") drawLightbar(ctx, d, opts.lights ?? 0);
  ctx.restore();
}

/** Ljusrampen på polisbilen. phase är tid i sekunder. */
function drawLightbar(ctx: Ctx, d: CarDims, phase: number) {
  const x = ax(d, d.roofEnd) - 7;
  const hw = d.W / 2;
  ctx.fillStyle = "#24292c";
  rrect(ctx, x - 2.5, -hw + 4, 5, d.W - 8, 2);
  ctx.fill();
  const left = Math.floor(phase * 6) % 2 === 0;
  const strobe = Math.floor(phase * 14) % 5 === 0;
  ctx.fillStyle = left ? "#5aa8ff" : "#16367a";
  rrect(ctx, x - 1.8, -hw + 5, 3.6, hw - 5.5, 1.3);
  ctx.fill();
  ctx.fillStyle = !left ? "#5aa8ff" : "#16367a";
  rrect(ctx, x - 1.8, 0.5, 3.6, hw - 5.5, 1.3);
  ctx.fill();
  if (strobe) {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(x - 1, -1.2, 2, 2.4);
  }
}

/** Blått sken från ljusrampen på marken (ritas med "lighter"). */
export function drawSirenGlow(ctx: Ctx, x: number, y: number, a: number, phase: number) {
  const left = Math.floor(phase * 6) % 2 === 0;
  const side = left ? -1 : 1;
  const gx = x + Math.cos(a + (side * Math.PI) / 2) * 14;
  const gy = y + Math.sin(a + (side * Math.PI) / 2) * 14;
  const g = ctx.createRadialGradient(gx, gy, 2, gx, gy, 72);
  g.addColorStop(0, "rgba(60,120,255,0.3)");
  g.addColorStop(0.5, "rgba(40,90,255,0.08)");
  g.addColorStop(1, "rgba(40,90,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(gx - 72, gy - 72, 144, 144);
}

/* ---------- Byggnader ---------- */

/** Hur mycket taket lyfts uppåt (sned vy ovanifrån). */
export const lift = (b: Building) => b.height * 0.85;

export function drawBuildingShadow(ctx: Ctx, b: Building) {
  const l = lift(b);
  const d = l * 1.25;
  ctx.fillStyle = "rgba(18, 30, 32, 0.3)";
  ctx.beginPath();
  ctx.moveTo(b.x + b.w, b.y - l + 2);
  ctx.lineTo(b.x + b.w + d, b.y - l + 2 + d * 0.8);
  ctx.lineTo(b.x + b.w + d, b.y + b.h + d * 0.8);
  ctx.lineTo(b.x + d * 0.6, b.y + b.h + d * 0.8);
  ctx.lineTo(b.x, b.y + b.h);
  ctx.lineTo(b.x + b.w, b.y + b.h);
  ctx.closePath();
  ctx.fill();
}

export function drawBuilding(ctx: Ctx, b: Building) {
  const l = lift(b);
  const wallH = l + 2;
  const wy = b.y + b.h - wallH;
  // Synlig fasad (södersidan)
  const wall = ctx.createLinearGradient(0, wy, 0, b.y + b.h);
  wall.addColorStop(0, shade(b.wall, -0.06));
  wall.addColorStop(1, shade(b.wall, -0.24));
  ctx.fillStyle = wall;
  ctx.fillRect(b.x, wy, b.w, wallH);

  // Fönster och detaljer på fasaden
  const rnd = (k: number) => hash2(b.seed, k);
  if (b.kind === "villa") {
    // Vita knutar och fönster med vita foder
    ctx.fillStyle = "#f4efe4";
    ctx.fillRect(b.x, wy, 3, wallH);
    ctx.fillRect(b.x + b.w - 3, wy, 3, wallH);
    const n = Math.max(2, Math.floor(b.w / 24));
    for (let i = 0; i < n; i++) {
      const fx = b.x + 8 + ((b.w - 22) * (i + 0.5)) / n;
      if (i === Math.floor(n / 2) && rnd(1) < 0.7) {
        // Dörr
        ctx.fillStyle = "#f4efe4";
        ctx.fillRect(fx - 1, wy + 2, 9, wallH - 2);
        ctx.fillStyle = shade(b.wall, -0.4);
        ctx.fillRect(fx + 0.5, wy + 3.5, 6, wallH - 3.5);
        continue;
      }
      ctx.fillStyle = "#f4efe4";
      ctx.fillRect(fx - 1, wy + 2.5, 8, Math.max(4, wallH - 5.5));
      ctx.fillStyle = "#33495a";
      ctx.fillRect(fx, wy + 3.5, 6, Math.max(2, wallH - 7.5));
    }
  } else {
    const rows = b.kind === "lamell" ? 2 : 1;
    const step = b.kind === "lamell" ? 13 : 18;
    for (let r = 0; r < rows; r++) {
      const fy = wy + 2 + r * ((wallH - 2) / rows);
      const fh = (wallH - 2) / rows - 3;
      for (let fx = b.x + 6; fx < b.x + b.w - 10; fx += step) {
        ctx.fillStyle = "#2f4454";
        ctx.fillRect(fx, fy, b.kind === "affar" ? 13 : 7, fh);
        ctx.fillStyle = "rgba(255,255,255,0.35)";
        ctx.fillRect(fx, fy, 2, fh);
        if (b.kind === "lamell" && r === 1 && hash2(b.seed, fx) < 0.35) {
          // Balkong
          ctx.fillStyle = shade(b.wall, 0.25);
          ctx.fillRect(fx - 2, fy + fh - 1, 11, 3);
        }
      }
    }
  }
  if (b.awning?.side === "s") {
    stripes(ctx, b.x + 2, b.y + b.h - 4, b.w - 4, 7, b.awning.color, false);
  }

  // Tak (lyft uppåt)
  const ry = b.y - l;
  const rh = b.h - wallH + l;
  if (b.roofKind === "sadel") {
    const roofOver = 3;
    const rx0 = b.x - roofOver;
    const rw = b.w + roofOver * 2;
    if (b.ridgeX) {
      const mid = ry + rh / 2;
      // Norra (ljusa) och södra (mörka) takfallet
      ctx.fillStyle = shade(b.roof, 0.18);
      ctx.fillRect(rx0, ry - roofOver, rw, mid - ry + roofOver);
      ctx.fillStyle = shade(b.roof, -0.12);
      ctx.fillRect(rx0, mid, rw, ry + rh - mid + 1);
      ctx.strokeStyle = "rgba(0,0,0,0.13)";
      ctx.lineWidth = 1;
      for (let y = ry; y < ry + rh; y += 4) {
        ctx.beginPath();
        ctx.moveTo(rx0, y);
        ctx.lineTo(rx0 + rw, y);
        ctx.stroke();
      }
      ctx.fillStyle = shade(b.roof, -0.35);
      ctx.fillRect(rx0, mid - 1.5, rw, 3);
    } else {
      const mid = b.x + b.w / 2;
      ctx.fillStyle = shade(b.roof, 0.18);
      ctx.fillRect(rx0, ry - roofOver, mid - rx0, rh + roofOver);
      ctx.fillStyle = shade(b.roof, -0.12);
      ctx.fillRect(mid, ry - roofOver, rx0 + rw - mid, rh + roofOver);
      ctx.strokeStyle = "rgba(0,0,0,0.13)";
      ctx.lineWidth = 1;
      for (let x = rx0; x < rx0 + rw; x += 4) {
        ctx.beginPath();
        ctx.moveTo(x, ry - roofOver);
        ctx.lineTo(x, ry + rh);
        ctx.stroke();
      }
      ctx.fillStyle = shade(b.roof, -0.35);
      ctx.fillRect(mid - 1.5, ry - roofOver, 3, rh + roofOver);
    }
    // Skorsten
    const cx = b.x + b.w * (0.25 + rnd(3) * 0.5);
    const cy = ry + rh * (0.25 + rnd(4) * 0.3);
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.fillRect(cx + 3, cy + 3, 7, 7);
    ctx.fillStyle = "#8c4a3a";
    ctx.fillRect(cx, cy, 7, 7);
    ctx.fillStyle = "#2a2a2a";
    ctx.fillRect(cx + 1.5, cy + 1.5, 4, 4);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.4;
    ctx.strokeRect(rx0, ry - roofOver, rw, rh + roofOver);
  } else {
    // Platt tak med takkant, grus och aggregat
    ctx.fillStyle = shade(b.roof, 0.22);
    ctx.fillRect(b.x, ry, b.w, rh);
    ctx.fillStyle = b.roof;
    ctx.fillRect(b.x + 4, ry + 4, b.w - 8, rh - 8);
    for (let i = 0; i < (b.w * rh) / 40; i++) {
      const px = b.x + 5 + hash2(b.seed, i, 1) * (b.w - 10);
      const py = ry + 5 + hash2(b.seed, i, 2) * (rh - 10);
      ctx.fillStyle = hash2(b.seed, i, 3) < 0.5 ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.1)";
      ctx.fillRect(px, py, 1.5, 1.5);
    }
    if (b.kind === "lamell") {
      // Sektioner per trapphus med ljusare takhuvar
      const along = b.w >= b.h;
      const L = along ? b.w : rh;
      const n = Math.max(1, Math.round(L / 70));
      ctx.strokeStyle = "rgba(0,0,0,0.16)";
      ctx.lineWidth = 1.5;
      for (let i = 1; i < n; i++) {
        ctx.beginPath();
        if (along) {
          ctx.moveTo(b.x + (b.w * i) / n, ry + 4);
          ctx.lineTo(b.x + (b.w * i) / n, ry + rh - 4);
        } else {
          ctx.moveTo(b.x + 4, ry + (rh * i) / n);
          ctx.lineTo(b.x + b.w - 4, ry + (rh * i) / n);
        }
        ctx.stroke();
      }
      for (let i = 0; i < n; i++) {
        const cx = along ? b.x + (b.w * (i + 0.5)) / n : b.x + b.w / 2;
        const cy = along ? ry + rh / 2 : ry + (rh * (i + 0.5)) / n;
        ctx.fillStyle = "rgba(0,0,0,0.22)";
        ctx.fillRect(cx - 7 + 3, cy - 6 + 3, 14, 12);
        ctx.fillStyle = shade(b.roof, 0.35);
        ctx.fillRect(cx - 7, cy - 6, 14, 12);
        ctx.strokeStyle = "rgba(0,0,0,0.3)";
        ctx.lineWidth = 1;
        ctx.strokeRect(cx - 6.5, cy - 5.5, 13, 11);
      }
    }
    const units = b.kind === "lamell" ? 0 : Math.max(1, Math.floor((b.w * rh) / 3500));
    for (let i = 0; i < units; i++) {
      const ux = b.x + 10 + rnd(10 + i) * (b.w - 34);
      const uy = ry + 8 + rnd(20 + i) * (rh - 28);
      const kind = rnd(30 + i);
      if (kind < 0.5) {
        // Ventilationsaggregat med fläkt
        ctx.fillStyle = "rgba(0,0,0,0.22)";
        ctx.fillRect(ux + 3, uy + 3, 18, 14);
        ctx.fillStyle = "#c9cdd0";
        ctx.fillRect(ux, uy, 18, 14);
        ctx.strokeStyle = "#6f777c";
        ctx.lineWidth = 1;
        ctx.strokeRect(ux + 0.5, uy + 0.5, 17, 13);
        ctx.beginPath();
        ctx.arc(ux + 9, uy + 7, 4.5, 0, Math.PI * 2);
        ctx.stroke();
      } else if (kind < 0.8) {
        // Takfönster
        ctx.fillStyle = "rgba(0,0,0,0.2)";
        ctx.fillRect(ux + 2, uy + 2, 14, 10);
        ctx.fillStyle = "#7fa9c4";
        ctx.fillRect(ux, uy, 14, 10);
        ctx.fillStyle = "rgba(255,255,255,0.45)";
        ctx.fillRect(ux, uy, 4, 10);
      } else {
        ctx.fillStyle = "#6c7378";
        ctx.beginPath();
        ctx.arc(ux + 5, uy + 5, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.4;
    ctx.strokeRect(b.x, ry, b.w, rh);
  }
  // Fasadens kontur
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.4;
  ctx.strokeRect(b.x, wy, b.w, wallH);
  if (b.awning?.side === "n") stripes(ctx, b.x + 4, ry - 7, b.w - 8, 8, b.awning.color, true);
}

function stripes(ctx: Ctx, x: number, y: number, w: number, h: number, color: string, up: boolean) {
  ctx.fillStyle = "rgba(0,0,0,0.18)";
  ctx.fillRect(x + 2, y + 3, w, h);
  for (let i = 0, sx = x; sx < x + w; sx += 6, i++) {
    ctx.fillStyle = i % 2 ? "#f7f3ea" : color;
    ctx.fillRect(sx, y, Math.min(6, x + w - sx), h);
  }
  ctx.fillStyle = up ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.12)";
  ctx.fillRect(x, up ? y : y + h - 2, w, 2);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, w, h);
}

/* ---------- Natur ---------- */

export function drawTreeShadow(ctx: Ctx, t: Tree) {
  ctx.fillStyle = SHADOW;
  ctx.beginPath();
  ctx.ellipse(t.x + t.r * 0.45, t.y + t.r * 0.55, t.r * 1.02, t.r * 0.86, 0, 0, Math.PI * 2);
  ctx.fill();
}

export function drawTree(ctx: Ctx, t: Tree) {
  const r = t.r;
  if (t.kind === "gran") {
    const pts = 9;
    const layer = (rad: number, col: string, off: number) => {
      ctx.fillStyle = col;
      ctx.beginPath();
      for (let i = 0; i < pts * 2; i++) {
        const a = (i / (pts * 2)) * Math.PI * 2 + off;
        const rr = i % 2 ? rad * 0.62 : rad;
        ctx.lineTo(t.x + Math.cos(a) * rr - (rad - r) * 0.2, t.y + Math.sin(a) * rr - (rad - r) * 0.25);
      }
      ctx.closePath();
      ctx.fill();
    };
    layer(r, "#25523a", 0);
    ctx.strokeStyle = "#173a29";
    ctx.lineWidth = 1.2;
    ctx.stroke();
    layer(r * 0.72, "#2f6a48", 0.3);
    layer(r * 0.42, "#3d8257", 0.1);
    return;
  }
  const dark = t.kind === "bjork" ? "#6f9a3c" : "#3e7a3a";
  const mid = t.kind === "bjork" ? "#8fb54e" : "#559446";
  const light = t.kind === "bjork" ? "#b5d26a" : "#78b25a";
  // Klumpig krona av flera cirklar
  const blobs = 6;
  ctx.fillStyle = dark;
  ctx.beginPath();
  for (let i = 0; i < blobs; i++) {
    const a = (i / blobs) * Math.PI * 2 + hash2(t.seed, i) * 0.6;
    const d = r * 0.42;
    const br = r * (0.56 + hash2(t.seed, i, 1) * 0.12);
    ctx.moveTo(t.x + Math.cos(a) * d + br, t.y + Math.sin(a) * d);
    ctx.arc(t.x + Math.cos(a) * d, t.y + Math.sin(a) * d, br, 0, Math.PI * 2);
  }
  ctx.fill();
  ctx.strokeStyle = "rgba(20,50,25,0.7)";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.fill();
  ctx.fillStyle = mid;
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const a = -2.3 + i * 0.55;
    ctx.moveTo(t.x + Math.cos(a) * r * 0.28 - r * 0.12 + r * 0.42, t.y + Math.sin(a) * r * 0.28 - r * 0.14);
    ctx.arc(t.x + Math.cos(a) * r * 0.28 - r * 0.12, t.y + Math.sin(a) * r * 0.28 - r * 0.14, r * 0.42, 0, Math.PI * 2);
  }
  ctx.fill();
  ctx.fillStyle = light;
  ctx.beginPath();
  ctx.arc(t.x - r * 0.32, t.y - r * 0.36, r * 0.24, 0, Math.PI * 2);
  ctx.arc(t.x - r * 0.05, t.y - r * 0.5, r * 0.16, 0, Math.PI * 2);
  ctx.fill();
}

export function drawLamp(ctx: Ctx, x: number, y: number) {
  ctx.fillStyle = SHADOW;
  ctx.beginPath();
  ctx.ellipse(x + 6, y + 6, 4, 3, 0.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#3a4045";
  ctx.beginPath();
  ctx.arc(x, y, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#e9e2c8";
  ctx.beginPath();
  ctx.arc(x - 0.8, y - 0.8, 1.3, 0, Math.PI * 2);
  ctx.fill();
}

/* ---------- Till fots och spöke ---------- */

/** Person ovanifrån: axlar, huvud och armar som pendlar när hen går. */
export function drawPerson(ctx: Ctx, x: number, y: number, a: number, color: string, time: number, walking: boolean, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  // Markering så att man ser sig själv
  ctx.strokeStyle = "rgba(255,255,255,0.85)";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(x, y, 22 + Math.sin(time * 5) * 1.5, 0, Math.PI * 2);
  ctx.stroke();
  ctx.translate(x, y);
  ctx.scale(1.5, 1.5);
  ctx.translate(-x, -y);
  ctx.fillStyle = "rgba(10,18,20,0.3)";
  ctx.beginPath();
  ctx.ellipse(x + 3, y + 4, 10, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.translate(x, y);
  ctx.rotate(a);
  const swing = walking ? Math.sin(time * 12) * 4 : 0;
  // Fötter
  ctx.fillStyle = "#2a2f33";
  ctx.beginPath();
  ctx.ellipse(swing, -4, 4, 2.6, 0, 0, Math.PI * 2);
  ctx.ellipse(-swing, 4, 4, 2.6, 0, 0, Math.PI * 2);
  ctx.fill();
  // Axlar/jacka
  ctx.fillStyle = color;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.ellipse(-1, 0, 5.5, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // Armar
  ctx.beginPath();
  ctx.ellipse(-swing * 0.6, -8.5, 3.5, 2.6, 0, 0, Math.PI * 2);
  ctx.ellipse(swing * 0.6, 8.5, 3.5, 2.6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // Huvud
  ctx.fillStyle = "#f2c9a0";
  ctx.beginPath();
  ctx.arc(1, 0, 4.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#4a3426";
  ctx.beginPath();
  ctx.arc(-0.5, 0, 4.2, Math.PI * 0.55, Math.PI * 1.45);
  ctx.fill();
  ctx.restore();
}

/** Spöke: genomskinligt, glödande, vågig kjol som fladdrar bakåt. */
export function drawGhost(ctx: Ctx, x: number, y: number, a: number, time: number, left: number) {
  ctx.save();
  ctx.translate(x, y);
  // Glöd
  const g = ctx.createRadialGradient(0, 0, 4, 0, 0, 46);
  g.addColorStop(0, "rgba(200,170,255,0.55)");
  g.addColorStop(1, "rgba(200,170,255,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, 46, 0, Math.PI * 2);
  ctx.fill();
  ctx.rotate(a);
  ctx.globalAlpha = 0.55 + 0.35 * Math.min(1, left * 3);
  ctx.fillStyle = "#f4f0ff";
  ctx.strokeStyle = "#7a5bd1";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(12, 0);
  ctx.bezierCurveTo(12, -14, -6, -15, -8, -11);
  for (let i = 0; i <= 4; i++) {
    const yy = -11 + i * 5.5;
    const xx = -18 + Math.sin(time * 10 + i) * 3;
    ctx.quadraticCurveTo(xx - 4, yy + 2.5, i === 4 ? -8 : -12, yy + 5.5 > 11 ? 11 : yy + 5.5);
  }
  ctx.bezierCurveTo(-6, 15, 12, 14, 12, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Ögon
  ctx.fillStyle = "#3b2a6b";
  ctx.beginPath();
  ctx.ellipse(5, -4, 2, 2.6, 0, 0, Math.PI * 2);
  ctx.ellipse(5, 4, 2, 2.6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
