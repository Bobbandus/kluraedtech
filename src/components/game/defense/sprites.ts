/**
 * Handritade sprites för Kluras canvas-spel (Fjällförsvar och klättervyn).
 * Allt ritas med vektorer i kod – inga bildfiler – i samma palett och
 * formspråk som resten av Klura: rundade former, en ljusare kant uppe,
 * en mörkare skugga nere och mjuka markskuggor.
 *
 * Alla funktioner tar position i pixlar och en skala `s` (≈ en ruta).
 */

import type { EnemyKind, TowerKind } from "@/lib/game/defense";

export const PAL = {
  grass: "#9fd17e",
  grass2: "#93c873",
  grassDark: "#7fb862",
  grassBlade: "#b9e09a",
  dirt: "#e7cb98",
  dirtEdge: "#cfa86c",
  dirtDark: "#bf955a",
  pebble: "#d4b07a",
  water: "#7fc7e6",
  waterDeep: "#5fb0d6",
  waterLight: "#c9ecf8",
  pine: "#2f7d4f",
  pineDark: "#1e5e3b",
  pineLight: "#4a9a66",
  trunk: "#7a5232",
  rock: "#a9b1ae",
  rockDark: "#848d8a",
  rockLight: "#c8cecb",
  falu: "#b8392f",
  faluDark: "#8f2a22",
  roof: "#4a3b35",
  roofLight: "#5e4b43",
  white: "#fbf8f2",
  ink: "#1b2422",
  wood: "#a8743f",
  woodDark: "#7e5326",
  woodLight: "#c99558",
  stone: "#b8bdb8",
  stoneDark: "#8e9590",
  snow: "#f4f8fb",
  snowShade: "#cfdde8",
  fire: "#ff9b21",
  fireCore: "#ffd27a",
  troll: "#6fae5c",
  trollDark: "#4c8a3e",
  lammel: "#c98a4b",
  lammelDark: "#9a6430",
  jatte: "#8d96a0",
  jatteDark: "#6b737c",
  boss: "#5b4a8c",
  bossDark: "#40336a",
  gold: "#ffc93c",
};

export type Ctx = CanvasRenderingContext2D;

/** Deterministisk brus-funktion för variation per ruta. */
export function hash(x: number, y: number, seed = 0): number {
  let h = (x * 374761393 + y * 668265263 + seed * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export function shadow(ctx: Ctx, x: number, y: number, rx: number, ry: number, alpha = 0.18) {
  ctx.save();
  ctx.fillStyle = `rgba(27,36,34,${alpha})`;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/* ---------- Mark ---------- */

export function grassTile(ctx: Ctx, c: number, r: number, T: number) {
  const x = c * T;
  const y = r * T;
  ctx.fillStyle = (c + r) % 2 === 0 ? PAL.grass : PAL.grass2;
  ctx.fillRect(x, y, T + 0.5, T + 0.5);
  // Små grässtrån och blommor
  const n = 3;
  for (let i = 0; i < n; i++) {
    const hx = x + hash(c, r, i) * T;
    const hy = y + hash(r, c, i + 7) * T;
    const kind = hash(c, r, i + 21);
    if (kind < 0.7) {
      ctx.strokeStyle = kind < 0.35 ? PAL.grassDark : PAL.grassBlade;
      ctx.lineWidth = Math.max(1, T * 0.035);
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(hx, hy);
      ctx.lineTo(hx - T * 0.03, hy - T * 0.08);
      ctx.moveTo(hx + T * 0.04, hy);
      ctx.lineTo(hx + T * 0.06, hy - T * 0.07);
      ctx.stroke();
    } else if (kind < 0.8) {
      ctx.fillStyle = hash(c, r, i + 3) < 0.5 ? "#fff6d6" : "#ffd1dc";
      ctx.beginPath();
      ctx.arc(hx, hy, T * 0.035, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/** Stigen ritas som en mjuk, tjock linje ovanpå gräset. */
export function drawPath(ctx: Ctx, pts: [number, number][], T: number) {
  ctx.save();
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  const line = (w: number, color: string, dy = 0) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = w;
    ctx.beginPath();
    pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py + dy) : ctx.moveTo(px, py + dy)));
    ctx.stroke();
  };
  line(T * 0.86, "rgba(27,36,34,0.10)", T * 0.05);
  line(T * 0.82, PAL.dirtEdge);
  line(T * 0.68, PAL.dirt);
  // Hjulspår / mittstrimma
  ctx.setLineDash([T * 0.12, T * 0.28]);
  line(T * 0.05, "rgba(191,149,90,0.55)");
  ctx.setLineDash([]);
  ctx.restore();
}

export function pebbles(ctx: Ctx, pts: [number, number][], T: number) {
  ctx.save();
  for (let i = 0; i < pts.length; i++) {
    const [x, y] = pts[i];
    if (hash(i, 3) < 0.4) {
      ctx.fillStyle = PAL.pebble;
      ctx.beginPath();
      ctx.ellipse(x + (hash(i, 9) - 0.5) * T * 0.4, y + (hash(i, 11) - 0.5) * T * 0.4, T * 0.04, T * 0.03, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

export function drawLake(ctx: Ctx, x: number, y: number, w: number, h: number, t: number) {
  ctx.save();
  ctx.fillStyle = PAL.grassDark;
  ctx.beginPath();
  ctx.ellipse(x + w / 2, y + h / 2 + 2, w / 2, h / 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PAL.water;
  ctx.beginPath();
  ctx.ellipse(x + w / 2, y + h / 2, w / 2 - 2, h / 2 - 3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PAL.waterDeep;
  ctx.beginPath();
  ctx.ellipse(x + w / 2 + w * 0.06, y + h / 2 + h * 0.08, w * 0.3, h * 0.24, 0, 0, Math.PI * 2);
  ctx.fill();
  // Glitter
  ctx.strokeStyle = PAL.waterLight;
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  for (let i = 0; i < 3; i++) {
    const k = (t * 0.4 + i * 0.33) % 1;
    const gx = x + w * (0.25 + i * 0.22);
    const gy = y + h * (0.35 + (i % 2) * 0.2);
    ctx.globalAlpha = 0.5 + 0.5 * Math.sin(k * Math.PI * 2);
    ctx.beginPath();
    ctx.moveTo(gx - w * 0.05, gy);
    ctx.lineTo(gx + w * 0.05, gy);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawPine(ctx: Ctx, x: number, y: number, s: number, sway = 0) {
  shadow(ctx, x + s * 0.05, y + s * 0.02, s * 0.3, s * 0.11);
  ctx.fillStyle = PAL.trunk;
  ctx.fillRect(x - s * 0.05, y - s * 0.16, s * 0.1, s * 0.18);
  const tiers = [
    { w: 0.42, top: -0.62, bot: -0.12 },
    { w: 0.34, top: -0.86, bot: -0.36 },
    { w: 0.24, top: -1.06, bot: -0.6 },
  ];
  tiers.forEach((tr, i) => {
    const sx = sway * (i + 1) * 0.6;
    ctx.fillStyle = PAL.pineDark;
    ctx.beginPath();
    ctx.moveTo(x + sx, y + s * tr.top);
    ctx.lineTo(x + s * tr.w + sx * 0.5, y + s * tr.bot);
    ctx.lineTo(x - s * tr.w + sx * 0.5, y + s * tr.bot);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = i === 2 ? PAL.pineLight : PAL.pine;
    ctx.beginPath();
    ctx.moveTo(x + sx, y + s * tr.top);
    ctx.lineTo(x + sx * 0.5 - s * tr.w * 0.1, y + s * tr.bot);
    ctx.lineTo(x - s * tr.w + sx * 0.5, y + s * tr.bot);
    ctx.closePath();
    ctx.fill();
  });
}

export function drawRock(ctx: Ctx, x: number, y: number, s: number) {
  shadow(ctx, x, y + s * 0.04, s * 0.32, s * 0.1);
  ctx.fillStyle = PAL.rockDark;
  ctx.beginPath();
  ctx.moveTo(x - s * 0.3, y);
  ctx.quadraticCurveTo(x - s * 0.32, y - s * 0.26, x - s * 0.08, y - s * 0.32);
  ctx.quadraticCurveTo(x + s * 0.24, y - s * 0.34, x + s * 0.3, y - s * 0.06);
  ctx.quadraticCurveTo(x + s * 0.28, y + s * 0.03, x, y + s * 0.03);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = PAL.rock;
  ctx.beginPath();
  ctx.moveTo(x - s * 0.26, y - s * 0.06);
  ctx.quadraticCurveTo(x - s * 0.26, y - s * 0.26, x - s * 0.06, y - s * 0.29);
  ctx.quadraticCurveTo(x + s * 0.18, y - s * 0.3, x + s * 0.22, y - s * 0.12);
  ctx.quadraticCurveTo(x, y - s * 0.08, x - s * 0.26, y - s * 0.06);
  ctx.fill();
  ctx.fillStyle = PAL.rockLight;
  ctx.beginPath();
  ctx.ellipse(x - s * 0.08, y - s * 0.22, s * 0.08, s * 0.03, -0.3, 0, Math.PI * 2);
  ctx.fill();
}

export function drawBush(ctx: Ctx, x: number, y: number, s: number) {
  shadow(ctx, x, y + s * 0.03, s * 0.3, s * 0.09);
  const blobs: [number, number, number][] = [
    [-0.14, -0.12, 0.17],
    [0.12, -0.12, 0.16],
    [0, -0.22, 0.18],
  ];
  ctx.fillStyle = PAL.pineDark;
  for (const [bx, by, br] of blobs) {
    ctx.beginPath();
    ctx.arc(x + bx * s, y + by * s + s * 0.03, br * s, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = PAL.pineLight;
  for (const [bx, by, br] of blobs) {
    ctx.beginPath();
    ctx.arc(x + bx * s, y + by * s, br * s * 0.9, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "#e0533f";
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.arc(x + (hash(i, 1) - 0.5) * s * 0.4, y - s * 0.12 - hash(i, 2) * s * 0.18, s * 0.025, 0, Math.PI * 2);
    ctx.fill();
  }
}

/* ---------- Stugan ---------- */

export function drawCabin(ctx: Ctx, x: number, y: number, s: number, t: number, hurt: number, hpFrac: number) {
  shadow(ctx, x, y + s * 0.08, s * 0.5, s * 0.14, 0.22);
  const shake = hurt > 0 ? Math.sin(t * 60) * hurt * s * 0.03 : 0;
  ctx.save();
  ctx.translate(shake, 0);
  // Väggar
  ctx.fillStyle = PAL.faluDark;
  roundRect(ctx, x - s * 0.42, y - s * 0.46, s * 0.84, s * 0.52, s * 0.04);
  ctx.fill();
  ctx.fillStyle = PAL.falu;
  roundRect(ctx, x - s * 0.42, y - s * 0.46, s * 0.84, s * 0.46, s * 0.04);
  ctx.fill();
  // Panel
  ctx.strokeStyle = "rgba(0,0,0,0.12)";
  ctx.lineWidth = 1;
  for (let i = 1; i < 6; i++) {
    const lx = x - s * 0.42 + (s * 0.84 * i) / 6;
    ctx.beginPath();
    ctx.moveTo(lx, y - s * 0.44);
    ctx.lineTo(lx, y - s * 0.02);
    ctx.stroke();
  }
  // Dörr och fönster med vita knutar
  ctx.fillStyle = PAL.white;
  ctx.fillRect(x - s * 0.1, y - s * 0.3, s * 0.2, s * 0.3);
  ctx.fillStyle = "#3b6b8a";
  ctx.fillRect(x - s * 0.07, y - s * 0.27, s * 0.14, s * 0.27);
  ctx.fillStyle = PAL.white;
  ctx.fillRect(x + s * 0.18, y - s * 0.34, s * 0.16, s * 0.14);
  ctx.fillRect(x - s * 0.34, y - s * 0.34, s * 0.16, s * 0.14);
  const glow = 0.65 + 0.2 * Math.sin(t * 3);
  ctx.fillStyle = `rgba(255,201,60,${glow})`;
  ctx.fillRect(x + s * 0.2, y - s * 0.32, s * 0.12, s * 0.1);
  ctx.fillRect(x - s * 0.32, y - s * 0.32, s * 0.12, s * 0.1);
  ctx.fillStyle = PAL.white;
  ctx.fillRect(x - s * 0.44, y - s * 0.46, s * 0.04, s * 0.46);
  ctx.fillRect(x + s * 0.4, y - s * 0.46, s * 0.04, s * 0.46);
  // Tak
  ctx.fillStyle = PAL.roof;
  ctx.beginPath();
  ctx.moveTo(x - s * 0.52, y - s * 0.42);
  ctx.lineTo(x, y - s * 0.86);
  ctx.lineTo(x + s * 0.52, y - s * 0.42);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = PAL.roofLight;
  ctx.beginPath();
  ctx.moveTo(x - s * 0.52, y - s * 0.42);
  ctx.lineTo(x, y - s * 0.86);
  ctx.lineTo(x - s * 0.04, y - s * 0.42);
  ctx.closePath();
  ctx.fill();
  // Snö på taket
  ctx.fillStyle = PAL.snow;
  ctx.beginPath();
  ctx.moveTo(x - s * 0.2, y - s * 0.68);
  ctx.lineTo(x, y - s * 0.86);
  ctx.lineTo(x + s * 0.2, y - s * 0.68);
  ctx.quadraticCurveTo(x, y - s * 0.62, x - s * 0.2, y - s * 0.68);
  ctx.fill();
  // Skorsten med rök
  ctx.fillStyle = PAL.roof;
  ctx.fillRect(x + s * 0.18, y - s * 0.8, s * 0.1, s * 0.2);
  for (let i = 0; i < 3; i++) {
    const k = (t * 0.35 + i / 3) % 1;
    ctx.fillStyle = `rgba(250,250,250,${0.6 * (1 - k)})`;
    ctx.beginPath();
    ctx.arc(x + s * 0.23 + k * s * 0.18, y - s * 0.84 - k * s * 0.4, s * (0.05 + k * 0.08), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  // Livsmätare
  const bw = s * 0.8;
  ctx.fillStyle = "rgba(27,36,34,0.55)";
  roundRect(ctx, x - bw / 2, y + s * 0.14, bw, s * 0.1, s * 0.05);
  ctx.fill();
  ctx.fillStyle = hpFrac > 0.5 ? "#4cc27a" : hpFrac > 0.25 ? PAL.gold : "#e0533f";
  roundRect(ctx, x - bw / 2 + 1.5, y + s * 0.14 + 1.5, Math.max(0, (bw - 3) * hpFrac), s * 0.1 - 3, s * 0.04);
  ctx.fill();
}

/* ---------- Torn ---------- */

function towerBase(ctx: Ctx, x: number, y: number, s: number, level: number) {
  shadow(ctx, x, y + s * 0.06, s * 0.36, s * 0.12, 0.22);
  ctx.fillStyle = PAL.stoneDark;
  ctx.beginPath();
  ctx.ellipse(x, y, s * 0.34, s * 0.16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PAL.stone;
  ctx.beginPath();
  ctx.ellipse(x, y - s * 0.04, s * 0.34, s * 0.15, 0, 0, Math.PI * 2);
  ctx.fill();
  // Stenfogar
  ctx.strokeStyle = "rgba(0,0,0,0.1)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(a) * s * 0.34, y - s * 0.04 + Math.sin(a) * s * 0.15);
    ctx.lineTo(x + Math.cos(a) * s * 0.24, y - s * 0.04 + Math.sin(a) * s * 0.1);
    ctx.stroke();
  }
  // Nivåstjärnor
  for (let i = 0; i <= level; i++) {
    const px = x + (i - level / 2) * s * 0.13;
    ctx.fillStyle = PAL.gold;
    ctx.strokeStyle = PAL.ink;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let k = 0; k < 10; k++) {
      const r = k % 2 ? s * 0.025 : s * 0.055;
      const a = -Math.PI / 2 + (k * Math.PI) / 5;
      ctx.lineTo(px + Math.cos(a) * r, y + s * 0.13 + Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
}

export function drawTower(ctx: Ctx, kind: TowerKind, x: number, y: number, s: number, level: number, angle: number, t: number, recoil: number) {
  towerBase(ctx, x, y, s, level);
  const lift = 1 + level * 0.12;
  if (kind === "bage") {
    // Trätorn
    ctx.fillStyle = PAL.woodDark;
    roundRect(ctx, x - s * 0.2, y - s * 0.62 * lift, s * 0.4, s * 0.58 * lift, s * 0.05);
    ctx.fill();
    ctx.fillStyle = PAL.wood;
    roundRect(ctx, x - s * 0.2, y - s * 0.62 * lift, s * 0.32, s * 0.58 * lift, s * 0.05);
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.15)";
    ctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(x - s * 0.2, y - s * 0.62 * lift + (s * 0.58 * lift * i) / 4);
      ctx.lineTo(x + s * 0.2, y - s * 0.62 * lift + (s * 0.58 * lift * i) / 4);
      ctx.stroke();
    }
    // Plattform
    ctx.fillStyle = PAL.woodLight;
    roundRect(ctx, x - s * 0.27, y - s * 0.7 * lift, s * 0.54, s * 0.12, s * 0.04);
    ctx.fill();
    // Båge som roterar mot målet
    ctx.save();
    ctx.translate(x, y - s * 0.78 * lift);
    ctx.rotate(angle);
    ctx.translate(-recoil * s * 0.06, 0);
    ctx.strokeStyle = PAL.woodDark;
    ctx.lineWidth = s * 0.06;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.2, -Math.PI / 2.4, Math.PI / 2.4);
    ctx.stroke();
    ctx.strokeStyle = PAL.white;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(-Math.PI / 2.4) * s * 0.2, Math.sin(-Math.PI / 2.4) * s * 0.2);
    ctx.lineTo(-s * 0.04 * (1 - recoil), 0);
    ctx.lineTo(Math.cos(Math.PI / 2.4) * s * 0.2, Math.sin(Math.PI / 2.4) * s * 0.2);
    ctx.stroke();
    ctx.restore();
    // Flagga
    ctx.strokeStyle = PAL.ink;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x + s * 0.2, y - s * 0.7 * lift);
    ctx.lineTo(x + s * 0.2, y - s * 1.0 * lift);
    ctx.stroke();
    ctx.fillStyle = level >= 2 ? PAL.gold : PAL.fire;
    ctx.beginPath();
    ctx.moveTo(x + s * 0.2, y - s * 1.0 * lift);
    ctx.lineTo(x + s * 0.36 + Math.sin(t * 6) * s * 0.02, y - s * 0.95 * lift);
    ctx.lineTo(x + s * 0.2, y - s * 0.9 * lift);
    ctx.fill();
  } else if (kind === "snoboll") {
    // Snöfästning
    ctx.fillStyle = PAL.snowShade;
    ctx.beginPath();
    ctx.ellipse(x, y - s * 0.12, s * 0.3, s * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PAL.snow;
    ctx.beginPath();
    ctx.arc(x, y - s * 0.22, s * 0.28 * (0.95 + level * 0.06), Math.PI, 0);
    ctx.lineTo(x + s * 0.28, y - s * 0.12);
    ctx.lineTo(x - s * 0.28, y - s * 0.12);
    ctx.fill();
    ctx.strokeStyle = PAL.snowShade;
    ctx.lineWidth = 1.2;
    for (let i = 1; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(x, y - s * 0.22, s * 0.28 * (i / 3), Math.PI, 0);
      ctx.stroke();
    }
    // Katapultarm
    ctx.save();
    ctx.translate(x, y - s * 0.36);
    ctx.rotate(angle);
    const arm = -recoil * 0.9;
    ctx.rotate(arm);
    ctx.strokeStyle = PAL.woodDark;
    ctx.lineWidth = s * 0.06;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-s * 0.06, 0);
    ctx.lineTo(s * 0.26, 0);
    ctx.stroke();
    ctx.fillStyle = PAL.white;
    ctx.strokeStyle = PAL.snowShade;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(s * 0.27, 0, s * 0.07 * (1 - recoil * 0.8), 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  } else if (kind === "lykta") {
    // Stolpe med lykta
    ctx.fillStyle = PAL.ink;
    ctx.fillRect(x - s * 0.035, y - s * 0.8 * lift, s * 0.07, s * 0.76 * lift);
    ctx.fillRect(x - s * 0.16, y - s * 0.8 * lift, s * 0.32, s * 0.05);
    const ly = y - s * 0.8 * lift + s * 0.05;
    const pulse = 0.5 + 0.5 * Math.sin(t * 4 + x);
    const g = ctx.createRadialGradient(x, ly + s * 0.16, 0, x, ly + s * 0.16, s * (0.45 + level * 0.06));
    g.addColorStop(0, `rgba(255,201,60,${0.45 + 0.25 * pulse})`);
    g.addColorStop(1, "rgba(255,201,60,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, ly + s * 0.16, s * (0.45 + level * 0.06), 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PAL.ink;
    roundRect(ctx, x - s * 0.12, ly, s * 0.24, s * 0.3, s * 0.05);
    ctx.fill();
    ctx.fillStyle = "#fff2c4";
    roundRect(ctx, x - s * 0.085, ly + s * 0.04, s * 0.17, s * 0.22, s * 0.03);
    ctx.fill();
    ctx.fillStyle = PAL.fire;
    ctx.beginPath();
    ctx.moveTo(x, ly + s * (0.08 - recoil * 0.04));
    ctx.quadraticCurveTo(x + s * 0.06, ly + s * 0.17, x, ly + s * 0.22);
    ctx.quadraticCurveTo(x - s * 0.06, ly + s * 0.17, x, ly + s * (0.08 - recoil * 0.04));
    ctx.fill();
  } else {
    // Bastu med ånga
    ctx.fillStyle = PAL.woodDark;
    roundRect(ctx, x - s * 0.26, y - s * 0.42, s * 0.52, s * 0.38, s * 0.04);
    ctx.fill();
    ctx.fillStyle = PAL.wood;
    roundRect(ctx, x - s * 0.26, y - s * 0.42, s * 0.52, s * 0.32, s * 0.04);
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.15)";
    ctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(x - s * 0.26, y - s * 0.42 + i * s * 0.08);
      ctx.lineTo(x + s * 0.26, y - s * 0.42 + i * s * 0.08);
      ctx.stroke();
    }
    ctx.fillStyle = PAL.roof;
    ctx.beginPath();
    ctx.moveTo(x - s * 0.32, y - s * 0.4);
    ctx.lineTo(x, y - s * (0.66 + level * 0.04));
    ctx.lineTo(x + s * 0.32, y - s * 0.4);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#ffcf8a";
    ctx.fillRect(x - s * 0.06, y - s * 0.3, s * 0.12, s * 0.1);
    for (let i = 0; i < 3; i++) {
      const k = (t * 0.5 + i / 3) % 1;
      ctx.fillStyle = `rgba(255,255,255,${0.7 * (1 - k)})`;
      ctx.beginPath();
      ctx.arc(x - s * 0.1 + Math.sin(k * 6 + i) * s * 0.06, y - s * 0.6 - k * s * 0.5, s * (0.05 + k * 0.07), 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/* ---------- Fiender ---------- */

export function drawEnemy(ctx: Ctx, kind: EnemyKind, x: number, y: number, s: number, t: number, dir: number, flash: boolean, slowed: boolean) {
  const def = {
    troll: { r: 0.26, body: PAL.troll, dark: PAL.trollDark },
    lammel: { r: 0.19, body: PAL.lammel, dark: PAL.lammelDark },
    jatte: { r: 0.36, body: PAL.jatte, dark: PAL.jatteDark },
    boss: { r: 0.44, body: PAL.boss, dark: PAL.bossDark },
  }[kind];
  const R = def.r * s;
  const speed = kind === "lammel" ? 18 : kind === "troll" ? 11 : 7;
  const bob = Math.abs(Math.sin(t * speed)) * R * 0.18;
  const face = Math.cos(dir) >= 0 ? 1 : -1;
  shadow(ctx, x, y + R * 0.15, R * 0.9, R * 0.3, 0.2);
  // Fötter
  ctx.fillStyle = def.dark;
  const step = Math.sin(t * speed) * R * 0.25;
  ctx.beginPath();
  ctx.ellipse(x - R * 0.35 + step, y + R * 0.05, R * 0.22, R * 0.14, 0, 0, Math.PI * 2);
  ctx.ellipse(x + R * 0.35 - step, y + R * 0.05, R * 0.22, R * 0.14, 0, 0, Math.PI * 2);
  ctx.fill();
  const cy = y - R * 0.75 - bob;
  ctx.save();
  if (flash) ctx.filter = "brightness(1.8)";
  // Kropp
  ctx.fillStyle = def.dark;
  ctx.beginPath();
  ctx.ellipse(x, cy + R * 0.1, R, R * 0.92, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = def.body;
  ctx.beginPath();
  ctx.ellipse(x, cy, R * 0.96, R * 0.86, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.18)";
  ctx.beginPath();
  ctx.ellipse(x - R * 0.3, cy - R * 0.35, R * 0.35, R * 0.2, -0.4, 0, Math.PI * 2);
  ctx.fill();

  if (kind === "lammel") {
    // Öron och vit mage
    ctx.fillStyle = def.dark;
    ctx.beginPath();
    ctx.arc(x - R * 0.55, cy - R * 0.65, R * 0.25, 0, Math.PI * 2);
    ctx.arc(x + R * 0.55, cy - R * 0.65, R * 0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#f6e6cf";
    ctx.beginPath();
    ctx.ellipse(x + face * R * 0.1, cy + R * 0.3, R * 0.5, R * 0.42, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PAL.ink;
    ctx.beginPath();
    ctx.ellipse(x + face * R * 0.1, cy + R * 0.42, R * 0.35, R * 0.16, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Hårtofs / sten / krona
    if (kind === "troll") {
      ctx.strokeStyle = "#c9673f";
      ctx.lineWidth = R * 0.14;
      ctx.lineCap = "round";
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(x + i * R * 0.12, cy - R * 0.78);
        ctx.quadraticCurveTo(x + i * R * 0.3, cy - R * 1.2, x + i * R * 0.45 + Math.sin(t * 8) * R * 0.08, cy - R * 1.15);
        ctx.stroke();
      }
    } else if (kind === "jatte") {
      ctx.fillStyle = PAL.pineLight;
      ctx.beginPath();
      ctx.ellipse(x - R * 0.2, cy - R * 0.72, R * 0.35, R * 0.15, 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(0,0,0,0.12)";
      ctx.beginPath();
      ctx.arc(x + R * 0.45, cy + R * 0.2, R * 0.12, 0, Math.PI * 2);
      ctx.arc(x - R * 0.5, cy + R * 0.35, R * 0.08, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = PAL.gold;
      ctx.strokeStyle = "#b78300";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x - R * 0.45, cy - R * 0.62);
      ctx.lineTo(x - R * 0.45, cy - R * 1.05);
      ctx.lineTo(x - R * 0.22, cy - R * 0.82);
      ctx.lineTo(x, cy - R * 1.15);
      ctx.lineTo(x + R * 0.22, cy - R * 0.82);
      ctx.lineTo(x + R * 0.45, cy - R * 1.05);
      ctx.lineTo(x + R * 0.45, cy - R * 0.62);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#e0533f";
      ctx.beginPath();
      ctx.arc(x, cy - R * 0.8, R * 0.07, 0, Math.PI * 2);
      ctx.fill();
    }
    // Stor näsa
    if (kind !== "boss") {
      ctx.fillStyle = def.dark;
      ctx.beginPath();
      ctx.ellipse(x + face * R * 0.45, cy + R * 0.12, R * 0.26, R * 0.2, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // Mun
    ctx.strokeStyle = PAL.ink;
    ctx.lineWidth = Math.max(1.2, R * 0.08);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(x + face * R * 0.1, cy + R * 0.38, R * 0.18, 0.2, Math.PI - 0.2);
    ctx.stroke();
    if (kind === "boss" || kind === "jatte") {
      ctx.fillStyle = PAL.white;
      ctx.beginPath();
      ctx.moveTo(x + face * R * -0.02, cy + R * 0.42);
      ctx.lineTo(x + face * R * 0.04, cy + R * 0.58);
      ctx.lineTo(x + face * R * 0.1, cy + R * 0.42);
      ctx.fill();
    }
  }
  // Ögon
  const ey = cy - R * 0.15;
  for (const ex of [-0.28, 0.2]) {
    const px = x + face * R * ex + face * R * 0.08;
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(px, ey, R * 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PAL.ink;
    ctx.beginPath();
    ctx.arc(px + face * R * 0.06, ey + R * 0.03, R * 0.1, 0, Math.PI * 2);
    ctx.fill();
  }
  if (kind === "boss") {
    ctx.strokeStyle = PAL.ink;
    ctx.lineWidth = R * 0.08;
    ctx.beginPath();
    ctx.moveTo(x - R * 0.42, ey - R * 0.3);
    ctx.lineTo(x - R * 0.1, ey - R * 0.18);
    ctx.moveTo(x + R * 0.42, ey - R * 0.3);
    ctx.lineTo(x + R * 0.1, ey - R * 0.18);
    ctx.stroke();
  }
  ctx.restore();
  // Frost när den är bromsad
  if (slowed) {
    ctx.fillStyle = "rgba(201,236,248,0.55)";
    ctx.beginPath();
    ctx.ellipse(x, cy, R * 1.05, R * 0.95, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff";
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(x + Math.cos(t * 2 + i * 2) * R * 0.7, cy + Math.sin(t * 2 + i * 2) * R * 0.6, R * 0.07, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

export function hpBar(ctx: Ctx, x: number, y: number, w: number, frac: number) {
  if (frac >= 0.999) return;
  ctx.fillStyle = "rgba(27,36,34,0.6)";
  roundRect(ctx, x - w / 2, y, w, 5, 2.5);
  ctx.fill();
  ctx.fillStyle = frac > 0.5 ? "#4cc27a" : frac > 0.25 ? PAL.gold : "#e0533f";
  roundRect(ctx, x - w / 2 + 1, y + 1, Math.max(0, (w - 2) * frac), 3, 1.5);
  ctx.fill();
}

/* ---------- Projektiler ---------- */

export function drawProjectile(ctx: Ctx, kind: TowerKind, x: number, y: number, s: number, angle: number, t: number) {
  if (kind === "bage") {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.strokeStyle = PAL.woodDark;
    ctx.lineWidth = Math.max(1.5, s * 0.04);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-s * 0.18, 0);
    ctx.lineTo(s * 0.12, 0);
    ctx.stroke();
    ctx.fillStyle = PAL.ink;
    ctx.beginPath();
    ctx.moveTo(s * 0.18, 0);
    ctx.lineTo(s * 0.1, -s * 0.04);
    ctx.lineTo(s * 0.1, s * 0.04);
    ctx.fill();
    ctx.fillStyle = PAL.white;
    ctx.fillRect(-s * 0.2, -s * 0.03, s * 0.06, s * 0.06);
    ctx.restore();
  } else if (kind === "snoboll") {
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.beginPath();
    ctx.arc(x - Math.cos(angle) * s * 0.1, y - Math.sin(angle) * s * 0.1, s * 0.06, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.strokeStyle = PAL.snowShade;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x, y, s * 0.085, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else {
    const g = ctx.createRadialGradient(x, y, 0, x, y, s * 0.2);
    g.addColorStop(0, "rgba(255,210,122,1)");
    g.addColorStop(0.5, "rgba(255,155,33,0.9)");
    g.addColorStop(1, "rgba(255,155,33,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, s * 0.2 * (0.9 + 0.1 * Math.sin(t * 30)), 0, Math.PI * 2);
    ctx.fill();
  }
}

/* ---------- Ikoner för UI (ritas i små canvas) ---------- */

export function drawTowerIcon(ctx: Ctx, kind: TowerKind, w: number, h: number) {
  ctx.clearRect(0, 0, w, h);
  const s = Math.min(w, h) * 0.95;
  drawTower(ctx, kind, w / 2, h * 0.8, s, 0, -Math.PI / 4, 0.4, 0);
}
