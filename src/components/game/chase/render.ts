/**
 * Biljakt – rendering på canvas.
 *
 * Den statiska staden ritas i bitar (chunks) som cachas. Bilar, spår,
 * partiklar och ljus ritas varje bildruta ovanpå.
 */

import { CELL, ENTER_RANGE, GHOST_TIME, PLAYER_SPEC, ROAD, ROUNDABOUT_R, SIDEWALK, playerPos, type ChaseState, type City } from "@/lib/game/chase";
import { drawBuilding, drawBuildingShadow, drawCar, drawGhost, drawLamp, drawPerson, drawSirenGlow, drawTree, drawTreeShadow, hash2, INK, shade, type Ctx } from "./sprites";

const CHUNK = 512;
const MAX_CHUNKS = 28;

export const GROUND = {
  grass: "#86b964",
  grassDark: "#76a957",
  forest: "#3c6e3e",
  asphalt: "#50585d",
  lot: "#5c6468",
  sidewalk: "#d3cbbd",
  curb: "#eee8dc",
  paving: "#c9bfae",
  water: "#4f98c6",
  sand: "#dccb9c",
};

/* ---------- Statisk stad ---------- */

function inRect(x: number, y: number, w: number, h: number, x0: number, y0: number, s: number) {
  return x + w > x0 && x < x0 + s && y + h > y0 && y < y0 + s;
}

/** Hela staden i full detalj (projektorn). */
export function drawCityFull(ctx: Ctx, city: City, scale: number) {
  ctx.save();
  ctx.scale(scale, scale);
  chunkScale = Math.max(1, Math.min(2, Math.round(scale * 4) / 2));
  drawCityRegion(ctx, city, 0, 0, Math.max(city.w, city.h));
  ctx.restore();
}

export function drawCityRegion(ctx: Ctx, city: City, x0: number, y0: number, size: number, withParked = true) {
  const M = 90; // marginal för skuggor och tak som sticker ut
  const vis = (x: number, y: number, w: number, h: number) => inRect(x, y, w, h, x0 - M, y0 - M, size + M * 2);

  // Gräs + skog utanför
  ctx.fillStyle = GROUND.grass;
  ctx.fillRect(x0, y0, size, size);
  for (let gy = Math.floor(y0 / 12) * 12; gy < y0 + size; gy += 12)
    for (let gx = Math.floor(x0 / 12) * 12; gx < x0 + size; gx += 12) {
      const h = hash2(gx, gy, 7);
      if (h < 0.22) {
        ctx.fillStyle = h < 0.1 ? GROUND.grassDark : "#93c46f";
        ctx.fillRect(gx + h * 40, gy + hash2(gx, gy, 8) * 10, 2, 3);
      }
    }

  // Kvarter
  for (const b of city.blocks) {
    if (!vis(b.x, b.y, b.w, b.h)) continue;
    ctx.fillStyle = GROUND.sidewalk;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    // Plattor i trottoaren
    ctx.strokeStyle = "rgba(0,0,0,0.07)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = b.x; x < b.x + b.w; x += 24) {
      ctx.moveTo(x, b.y);
      ctx.lineTo(x, b.y + SIDEWALK);
      ctx.moveTo(x, b.y + b.h - SIDEWALK);
      ctx.lineTo(x, b.y + b.h);
    }
    for (let y = b.y; y < b.y + b.h; y += 24) {
      ctx.moveTo(b.x, y);
      ctx.lineTo(b.x + SIDEWALK, y);
      ctx.moveTo(b.x + b.w - SIDEWALK, y);
      ctx.lineTo(b.x + b.w, y);
    }
    ctx.stroke();
    const ix = b.x + SIDEWALK;
    const iy = b.y + SIDEWALK;
    const iw = b.w - SIDEWALK * 2;
    const ih = b.h - SIDEWALK * 2;
    if (b.kind === "parkering" || b.kind === "affar") {
      ctx.fillStyle = b.kind === "affar" ? GROUND.paving : GROUND.lot;
      ctx.fillRect(ix, iy, iw, ih);
      if (b.kind === "parkering") lotLines(ctx, ix + 8, iy + 8, iw - 16, ih - 16);
    } else {
      ctx.fillStyle = GROUND.grass;
      ctx.fillRect(ix, iy, iw, ih);
      grassTexture(ctx, ix, iy, iw, ih);
      if (b.kind === "park") parkPaths(ctx, ix, iy, iw, ih, b.x * 7 + b.y);
      if (b.kind === "villor") hedges(ctx, ix, iy, iw, ih);
      if (b.kind === "lamell") {
        // Gångar över gården
        ctx.fillStyle = GROUND.paving;
        if (iw > ih) ctx.fillRect(ix + iw / 2 - 6, iy, 12, ih);
        else ctx.fillRect(ix, iy + ih / 2 - 6, iw, 12);
      }
    }
    // Rännsten på vägsidan
    ctx.strokeStyle = "rgba(0,0,0,0.12)";
    ctx.lineWidth = 6;
    ctx.strokeRect(b.x - 3, b.y - 3, b.w + 6, b.h + 6);
    // Kantsten
    ctx.strokeStyle = GROUND.curb;
    ctx.lineWidth = 3;
    ctx.strokeRect(b.x + 1.5, b.y + 1.5, b.w - 3, b.h - 3);
    ctx.strokeStyle = "rgba(0,0,0,0.25)";
    ctx.lineWidth = 1;
    ctx.strokeRect(b.x - 0.5, b.y - 0.5, b.w + 1, b.h + 1);
  }

  // Kanal
  if (city.canal && vis(0, city.canal.y - 10, city.w, city.canal.h + 20)) {
    const { y, h } = city.canal;
    ctx.fillStyle = "#9b9488";
    ctx.fillRect(x0, y - 7, size, h + 14);
    const wg = ctx.createLinearGradient(0, y, 0, y + h);
    wg.addColorStop(0, "#3f86b5");
    wg.addColorStop(0.5, GROUND.water);
    wg.addColorStop(1, "#3f86b5");
    ctx.fillStyle = wg;
    ctx.fillRect(x0, y, size, h);
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = 1.5;
    for (let x = Math.floor(x0 / 40) * 40; x < x0 + size; x += 40) {
      const yy = y + 12 + hash2(x, 3) * (h - 24);
      ctx.beginPath();
      ctx.moveTo(x, yy);
      ctx.quadraticCurveTo(x + 7, yy - 3, x + 14, yy);
      ctx.stroke();
    }
    // Kajkant med stenar
    ctx.strokeStyle = "rgba(0,0,0,0.2)";
    ctx.lineWidth = 1;
    for (let x = Math.floor(x0 / 16) * 16; x < x0 + size; x += 16) {
      ctx.beginPath();
      ctx.moveTo(x, y - 7);
      ctx.lineTo(x, y);
      ctx.moveTo(x + 8, y + h);
      ctx.lineTo(x + 8, y + h + 7);
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.fillRect(x0, y, size, 5);
  }

  // Vägar
  const c0 = Math.max(0, Math.floor((x0 - M) / CELL));
  const c1 = Math.min(city.cols - 1, Math.ceil((x0 + size + M) / CELL));
  const r0 = Math.max(0, Math.floor((y0 - M) / CELL));
  const r1 = Math.min(city.rows - 1, Math.ceil((y0 + size + M) / CELL));
  ctx.fillStyle = GROUND.asphalt;
  for (let r = r0; r <= r1; r++)
    for (let c = c0; c <= c1; c++) if (city.road[r * city.cols + c]) ctx.fillRect(c * CELL - 0.5, r * CELL - 0.5, CELL + 1, CELL + 1);
  // Asfaltstextur
  for (let gy = Math.floor(y0 / 7) * 7; gy < y0 + size; gy += 7)
    for (let gx = Math.floor(x0 / 7) * 7; gx < x0 + size; gx += 7) {
      const c = Math.floor(gx / CELL);
      const r = Math.floor(gy / CELL);
      if (c < 0 || r < 0 || c >= city.cols || r >= city.rows || !city.road[r * city.cols + c]) continue;
      const h = hash2(gx, gy, 11);
      if (h < 0.3) {
        ctx.fillStyle = h < 0.15 ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.09)";
        ctx.fillRect(gx + hash2(gx, gy, 12) * 5, gy + hash2(gx, gy, 13) * 5, 2, 2);
      }
    }
  roadDetails(ctx, city, vis);

  // Rondeller
  for (const isl of city.islands) {
    if (!vis(isl.x - ROUNDABOUT_R - 20, isl.y - ROUNDABOUT_R - 20, ROUNDABOUT_R * 2 + 40, ROUNDABOUT_R * 2 + 40)) continue;
    ctx.fillStyle = GROUND.curb;
    ctx.beginPath();
    ctx.arc(isl.x, isl.y, ROUNDABOUT_R + 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = GROUND.asphalt;
    ctx.beginPath();
    ctx.arc(isl.x, isl.y, ROUNDABOUT_R, 0, Math.PI * 2);
    ctx.fill();
    for (let k = 0; k < 400; k++) {
      const a = hash2(isl.x, k, 1) * Math.PI * 2;
      const d = Math.sqrt(hash2(isl.x, k, 2)) * ROUNDABOUT_R;
      ctx.fillStyle = k % 2 ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.09)";
      ctx.fillRect(isl.x + Math.cos(a) * d, isl.y + Math.sin(a) * d, 2, 2);
    }
    // Vägarna in i rondellen ska inte ha kantsten tvärs över
    ctx.fillStyle = GROUND.asphalt;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const rx = isl.x + dx * (ROUNDABOUT_R - 10) - (dy ? CELL : 0) - (dx ? 0 : 0);
      if (dx) ctx.fillRect(dx > 0 ? isl.x + ROUNDABOUT_R - 12 : isl.x - ROUNDABOUT_R - 8, isl.y - CELL, 20, CELL * 2);
      else ctx.fillRect(isl.x - CELL, dy > 0 ? isl.y + ROUNDABOUT_R - 12 : isl.y - ROUNDABOUT_R - 8, CELL * 2, 20);
      void rx;
    }
    ctx.setLineDash([16, 14]);
    ctx.strokeStyle = "rgba(255,255,255,0.65)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(isl.x, isl.y, isl.r + 38, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = SHADOW_SOFT;
    ctx.beginPath();
    ctx.arc(isl.x + 4, isl.y + 5, isl.r + 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = GROUND.curb;
    ctx.beginPath();
    ctx.arc(isl.x, isl.y, isl.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.3)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = GROUND.grass;
    ctx.beginPath();
    ctx.arc(isl.x, isl.y, isl.r - 5, 0, Math.PI * 2);
    ctx.fill();
    // Blomrabatt
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * Math.PI * 2;
      ctx.fillStyle = ["#e2504c", "#f1c232", "#f6f1e5", "#c55fb6"][i % 4];
      ctx.beginPath();
      ctx.arc(isl.x + Math.cos(a) * (isl.r - 13), isl.y + Math.sin(a) * (isl.r - 13), 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Broar
  for (const br of city.bridges) {
    if (!vis(br.x, br.y, br.w, br.h)) continue;
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.fillRect(br.x + br.w, br.y + 8, 7, br.h - 8);
    for (const side of [br.x + 2, br.x + br.w - 6]) {
      ctx.fillStyle = "#8d8679";
      ctx.fillRect(side, br.y, 4, br.h);
      ctx.fillStyle = "#c9c2b4";
      for (let y = br.y + 3; y < br.y + br.h; y += 10) ctx.fillRect(side - 0.5, y, 5, 3);
    }
  }

  // Dammar
  for (const p of city.ponds) {
    if (!vis(p.x - p.rx - 10, p.y - p.ry - 10, p.rx * 2 + 20, p.ry * 2 + 20)) continue;
    ctx.fillStyle = "#b8ae98";
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, p.rx + 5, p.ry + 5, 0, 0, Math.PI * 2);
    ctx.fill();
    const wg = ctx.createRadialGradient(p.x - p.rx * 0.3, p.y - p.ry * 0.3, 2, p.x, p.y, p.rx);
    wg.addColorStop(0, "#69addb");
    wg.addColorStop(1, "#3e86b5");
    ctx.fillStyle = wg;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, p.rx, p.ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#5f9b4c";
    for (let i = 0; i < 4; i++) {
      const a = hash2(p.x, i) * 6.28;
      const lx = p.x + Math.cos(a) * p.rx * 0.55;
      const ly = p.y + Math.sin(a) * p.ry * 0.55;
      ctx.beginPath();
      ctx.arc(lx, ly, 4, 0.4, Math.PI * 2);
      ctx.lineTo(lx, ly);
      ctx.fill();
    }
  }

  // Skuggor, parkerade bilar, hus, träd, lampor
  for (const b of city.buildings) if (vis(b.x, b.y - 20, b.w + 30, b.h + 40)) drawBuildingShadow(ctx, b);
  for (const t of city.trees) if (vis(t.x - t.r, t.y - t.r, t.r * 2 + 20, t.r * 2 + 20)) drawTreeShadow(ctx, t);
  if (withParked) for (const p of city.parked) if (vis(p.x - 40, p.y - 40, 80, 80)) drawCar(ctx, p.x, p.y, p.a, p.model, p.color, chunkScale);
  const bs = city.buildings.filter((b) => vis(b.x, b.y - 20, b.w, b.h + 20)).sort((a, b) => a.y + a.h - (b.y + b.h));
  for (const b of bs) drawBuilding(ctx, b);
  for (const t of city.trees) if (vis(t.x - t.r, t.y - t.r, t.r * 2, t.r * 2)) drawTree(ctx, t);
  for (const l of city.lamps) if (vis(l.x - 5, l.y - 5, 10, 10)) drawLamp(ctx, l.x, l.y);

  // Skog runt staden
  const edge = CELL;
  for (let gy = Math.floor((y0 - 40) / 34) * 34; gy < y0 + size + 40; gy += 34)
    for (let gx = Math.floor((x0 - 40) / 34) * 34; gx < x0 + size + 40; gx += 34) {
      const inside = gx > edge * 0.6 && gy > edge * 0.6 && gx < city.w - edge * 0.6 && gy < city.h - edge * 0.6;
      if (inside) continue;
      const t = { x: gx + hash2(gx, gy, 1) * 14, y: gy + hash2(gx, gy, 2) * 14, r: 20 + hash2(gx, gy, 3) * 8, kind: hash2(gx, gy, 4) < 0.6 ? "gran" : "lov", seed: gx * 31 + gy } as const;
      drawTree(ctx, t);
    }
}

const SHADOW_SOFT = "rgba(18, 28, 30, 0.22)";
let chunkScale = 1;

function grassTexture(ctx: Ctx, x: number, y: number, w: number, h: number) {
  // Mjuka fläckar i gräset
  for (let gy = y; gy < y + h; gy += 46)
    for (let gx = x; gx < x + w; gx += 46) {
      const k = hash2(gx, gy, 31);
      if (k > 0.45) continue;
      ctx.fillStyle = k < 0.2 ? "rgba(40,90,30,0.08)" : "rgba(255,255,200,0.07)";
      ctx.beginPath();
      ctx.ellipse(gx + hash2(gx, gy, 32) * 40, gy + hash2(gx, gy, 33) * 40, 18 + k * 30, 12 + k * 20, k * 3, 0, Math.PI * 2);
      ctx.fill();
    }
  for (let gy = y + 10; gy < y + h - 6; gy += 23)
    for (let gx = x + 10; gx < x + w - 6; gx += 23)
      if (hash2(gx, gy, 34) < 0.05) {
        ctx.fillStyle = ["#f4f0e6", "#f2c94c", "#e5726a"][Math.floor(hash2(gx, gy, 35) * 3)];
        ctx.fillRect(gx, gy, 2.5, 2.5);
      }
  ctx.fillStyle = "rgba(255,255,255,0.06)";
  for (let gy = y + 6; gy < y + h; gy += 14) for (let gx = x + 4; gx < x + w; gx += 14) if (hash2(gx, gy, 21) < 0.35) ctx.fillRect(gx, gy, 3, 2);
}

function bushRow(ctx: Ctx, x1: number, y1: number, x2: number, y2: number) {
  const len = Math.hypot(x2 - x1, y2 - y1);
  const n = Math.floor(len / 9);
  ctx.fillStyle = "rgba(18,30,32,0.22)";
  for (let i = 0; i <= n; i++) {
    const k = i / n;
    if (hash2(x1 + i, y1, 41) < 0.12) continue;
    ctx.beginPath();
    ctx.arc(x1 + (x2 - x1) * k + 3, y1 + (y2 - y1) * k + 3, 6, 0, Math.PI * 2);
    ctx.fill();
  }
  for (let i = 0; i <= n; i++) {
    const k = i / n;
    if (hash2(x1 + i, y1, 41) < 0.12) continue;
    const bx = x1 + (x2 - x1) * k;
    const by = y1 + (y2 - y1) * k;
    const r = 5.5 + hash2(bx, by, 42) * 1.5;
    ctx.fillStyle = "#3f7a37";
    ctx.beginPath();
    ctx.arc(bx, by, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#5e9a48";
    ctx.beginPath();
    ctx.arc(bx - 1.5, by - 1.8, r * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function hedges(ctx: Ctx, x: number, y: number, w: number, h: number) {
  const nx = Math.max(1, Math.floor(w / 128));
  const ny = Math.max(1, Math.floor(h / 128));
  for (let i = 1; i < nx; i++) {
    const hx = x + (w / nx) * i;
    bushRow(ctx, hx, y + 12, hx, y + h * 0.42);
    bushRow(ctx, hx, y + h * 0.58, hx, y + h - 12);
  }
  for (let j = 1; j < ny; j++) {
    const hy = y + (h / ny) * j;
    bushRow(ctx, x + 12, hy, x + w * 0.4, hy);
    bushRow(ctx, x + w * 0.6, hy, x + w - 12, hy);
  }
}

function parkPaths(ctx: Ctx, x: number, y: number, w: number, h: number, seed: number) {
  ctx.strokeStyle = GROUND.sand;
  ctx.lineWidth = 9;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x, y + h * (0.3 + hash2(seed, 1) * 0.4));
  ctx.bezierCurveTo(x + w * 0.35, y + h * hash2(seed, 2), x + w * 0.65, y + h * hash2(seed, 3), x + w, y + h * (0.3 + hash2(seed, 4) * 0.4));
  ctx.moveTo(x + w * (0.3 + hash2(seed, 5) * 0.4), y);
  ctx.bezierCurveTo(x + w * hash2(seed, 6), y + h * 0.4, x + w * hash2(seed, 7), y + h * 0.6, x + w * (0.3 + hash2(seed, 8) * 0.4), y + h);
  ctx.stroke();
  ctx.lineCap = "butt";
}

function lotLines(ctx: Ctx, x: number, y: number, w: number, h: number) {
  ctx.strokeStyle = "rgba(255,255,255,0.7)";
  ctx.lineWidth = 2;
  const bay = 34;
  const depth = 60;
  for (let ry = y + 6; ry + depth <= y + h + 8; ry += depth + 64) {
    ctx.beginPath();
    for (let bx = x + 2; bx <= x + w - 2; bx += bay) {
      ctx.moveTo(bx, ry - 2);
      ctx.lineTo(bx, ry + depth - 2);
    }
    ctx.moveTo(x + 2, ry + depth - 2);
    ctx.lineTo(x + w - 2, ry + depth - 2);
    ctx.stroke();
  }
}

function roadDetails(ctx: Ctx, city: City, vis: (x: number, y: number, w: number, h: number) => boolean) {
  const { roadsX, roadsY } = city;
  const nearPlaza = (x: number, y: number) => city.plazas.some((p) => x > p.x - 6 && x < p.x + p.w + 6 && y > p.y - 6 && y < p.y + p.h + 6);
  ctx.strokeStyle = "rgba(255,255,255,0.8)";
  ctx.lineWidth = 3;
  ctx.setLineDash([22, 18]);
  // Mittlinjer
  for (let j = 0; j < roadsY.length; j++)
    for (let i = 0; i < roadsX.length - 1; i++) {
      if (city.removed.has(`h:${i}:${j}`)) continue;
      const y = (roadsY[j] + 1) * CELL;
      let xa = (roadsX[i] + ROAD) * CELL + 26;
      let xb = roadsX[i + 1] * CELL - 26;
      if (nearPlaza(xa - 30, y)) xa += CELL;
      if (nearPlaza(xb + 30, y)) xb -= CELL;
      if (!vis(xa, y - 4, xb - xa, 8)) continue;
      ctx.beginPath();
      ctx.moveTo(xa, y);
      ctx.lineTo(xb, y);
      ctx.stroke();
    }
  for (let i = 0; i < roadsX.length; i++)
    for (let j = 0; j < roadsY.length - 1; j++) {
      if (city.removed.has(`v:${i}:${j}`)) continue;
      const x = (roadsX[i] + 1) * CELL;
      let ya = (roadsY[j] + ROAD) * CELL + 26;
      let yb = roadsY[j + 1] * CELL - 26;
      if (nearPlaza(x, ya - 30)) ya += CELL;
      if (nearPlaza(x, yb + 30)) yb -= CELL;
      if (city.canal && ya < city.canal.y + city.canal.h && yb > city.canal.y) {
        // Heldragen linje över bron
      }
      if (!vis(x - 4, ya, 8, yb - ya)) continue;
      ctx.beginPath();
      ctx.moveTo(x, ya);
      ctx.lineTo(x, yb);
      ctx.stroke();
    }
  ctx.setLineDash([]);
  // Övergångsställen vid vissa korsningar
  ctx.fillStyle = "rgba(255,255,255,0.78)";
  for (let i = 0; i < roadsX.length; i++)
    for (let j = 0; j < roadsY.length; j++) {
      const cx = roadsX[i] * CELL;
      const cy = roadsY[j] * CELL;
      if (hash2(i, j, 5) > 0.55 || nearPlaza(cx + CELL, cy + CELL)) continue;
      if (!vis(cx - 30, cy - 30, CELL * 2 + 60, CELL * 2 + 60)) continue;
      const W = CELL * ROAD;
      // väster/öster
      if (i > 0 && !city.removed.has(`h:${i - 1}:${j}`)) for (let y = cy + 6; y < cy + W - 6; y += 11) ctx.fillRect(cx - 24, y, 18, 6);
      if (i < roadsX.length - 1 && !city.removed.has(`h:${i}:${j}`)) for (let y = cy + 6; y < cy + W - 6; y += 11) ctx.fillRect(cx + W + 6, y, 18, 6);
      if (j > 0 && !city.removed.has(`v:${i}:${j - 1}`)) for (let x = cx + 6; x < cx + W - 6; x += 11) ctx.fillRect(x, cy - 24, 6, 18);
      if (j < roadsY.length - 1 && !city.removed.has(`v:${i}:${j}`)) for (let x = cx + 6; x < cx + W - 6; x += 11) ctx.fillRect(x, cy + W + 6, 6, 18);
    }
  // Brunnslock och lagningar
  for (let i = 0; i < roadsX.length; i++)
    for (let j = 0; j < roadsY.length - 1; j++) {
      if (city.removed.has(`v:${i}:${j}`)) continue;
      const x = roadsX[i] * CELL + CELL * (0.5 + (hash2(i, j, 9) < 0.5 ? 0 : 1));
      const y = (roadsY[j] + ROAD) * CELL + hash2(i, j, 10) * (roadsY[j + 1] - roadsY[j] - ROAD) * CELL;
      if (!vis(x - 10, y - 10, 20, 20)) continue;
      ctx.fillStyle = "#3c4347";
      ctx.beginPath();
      ctx.arc(x, y, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.12)";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = "rgba(0,0,0,0.12)";
      ctx.beginPath();
      ctx.ellipse(x + 30, y - 40, 14, 8, 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
}

/* ---------- Översiktskarta (projektor och minikarta) ---------- */

export function drawCityOverview(ctx: Ctx, city: City, scale: number) {
  ctx.save();
  ctx.scale(scale, scale);
  ctx.fillStyle = GROUND.forest;
  ctx.fillRect(0, 0, city.w, city.h);
  ctx.fillStyle = GROUND.grass;
  ctx.fillRect(CELL * 0.6, CELL * 0.6, city.w - CELL * 1.2, city.h - CELL * 1.2);
  for (const b of city.blocks) {
    ctx.fillStyle = b.kind === "park" ? "#79ad58" : b.kind === "parkering" ? "#8d9396" : b.kind === "affar" ? "#d8cbb4" : "#a6c98a";
    ctx.fillRect(b.x, b.y, b.w, b.h);
  }
  if (city.canal) {
    ctx.fillStyle = GROUND.water;
    ctx.fillRect(0, city.canal.y, city.w, city.canal.h);
  }
  for (const p of city.ponds) {
    ctx.fillStyle = GROUND.water;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, p.rx, p.ry, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "#5b6266";
  for (let r = 0; r < city.rows; r++) for (let c = 0; c < city.cols; c++) if (city.road[r * city.cols + c]) ctx.fillRect(c * CELL - 1, r * CELL - 1, CELL + 2, CELL + 2);
  for (const isl of city.islands) {
    ctx.fillStyle = "#79ad58";
    ctx.beginPath();
    ctx.arc(isl.x, isl.y, isl.r, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const b of city.buildings) {
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.fillRect(b.x + 10, b.y + 10, b.w, b.h);
    ctx.fillStyle = b.roofKind === "sadel" ? shade(b.roof, 0.1) : shade(b.roof, 0.2);
    ctx.fillRect(b.x, b.y, b.w, b.h);
  }
  for (const t of city.trees) {
    ctx.fillStyle = t.kind === "gran" ? "#2f6a48" : "#4f8f43";
    ctx.beginPath();
    ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/* ---------- Effekter ---------- */

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  kind: "smoke" | "spark" | "star" | "ring" | "speck";
  color: string;
}

interface Skid {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  t: number;
}

export interface ChaseUi {
  reducedMotion: boolean;
  /** 0..1 – hur mycket kameran zoomar ut (fråga) */
  focus: number;
}

export class ChaseRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: Ctx;
  private chunks = new Map<string, { c: HTMLCanvasElement; used: number }>();
  private dpr = 1;
  private w = 0;
  private h = 0;
  private cam = { x: 0, y: 0, zoom: 1 };
  private shake = 0;
  private particles: Particle[] = [];
  private skids: Skid[] = [];
  private lastWheel = new Map<number, [number, number, number, number]>();
  private lastEvent = -1;
  private frame = 0;
  private time = 0;
  private city: City | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
  }

  resize(w: number, h: number) {
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.w = w;
    this.h = h;
    this.canvas.width = Math.round(w * this.dpr);
    this.canvas.height = Math.round(h * this.dpr);
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
  }

  private baseZoom() {
    return Math.max(0.62, Math.min(1.12, Math.sqrt(this.w * this.h) / 920));
  }

  private chunk(city: City, cx: number, cy: number) {
    const key = `${cx}:${cy}`;
    const hit = this.chunks.get(key);
    if (hit) {
      hit.used = this.frame;
      return hit.c;
    }
    if (this.chunks.size >= MAX_CHUNKS) {
      let old = "";
      let ou = Infinity;
      for (const [k, v] of this.chunks) if (v.used < ou) ((ou = v.used), (old = k));
      this.chunks.delete(old);
    }
    const s = Math.min(1.6, this.dpr * Math.min(1, this.baseZoom() * 1.05));
    chunkScale = Math.max(1, Math.round(s * 2) / 2);
    const c = document.createElement("canvas");
    c.width = Math.ceil(CHUNK * s);
    c.height = Math.ceil(CHUNK * s);
    const ctx = c.getContext("2d")!;
    ctx.scale(s, s);
    ctx.translate(-cx * CHUNK, -cy * CHUNK);
    ctx.save();
    ctx.beginPath();
    ctx.rect(cx * CHUNK, cy * CHUNK, CHUNK, CHUNK);
    ctx.clip();
    drawCityRegion(ctx, city, cx * CHUNK, cy * CHUNK, CHUNK, false);
    ctx.restore();
    this.chunks.set(key, { c, used: this.frame });
    return c;
  }

  /** Förbered chunks runt en punkt (anropas innan spelet startar). */
  warm(city: City, x: number, y: number) {
    this.city = city;
    const cx = Math.floor(x / CHUNK);
    const cy = Math.floor(y / CHUNK);
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) this.chunk(city, cx + dx, cy + dy);
  }

  snapCamera(s: ChaseState) {
    const me = playerPos(s);
    this.cam.x = me.x;
    this.cam.y = me.y;
    this.cam.zoom = this.baseZoom();
  }

  draw(s: ChaseState, ui: ChaseUi, dt: number) {
    this.frame++;
    this.time += dt;
    const { ctx } = this;
    const city = s.city;
    if (this.city !== city) {
      this.chunks.clear();
      this.city = city;
    }
    const pl = s.player;
    const me = playerPos(s);
    this.consumeEvents(s, ui);

    // Kamera: leder framåt, zoomar ut med farten
    const speed = Math.hypot(me.vx, me.vy);
    const lead = s.mode === "car" ? 0.42 : 0.25;
    const tx = me.x + me.vx * lead;
    const ty = me.y + me.vy * lead;
    const k = 1 - Math.exp(-dt * 4);
    this.cam.x += (tx - this.cam.x) * k;
    this.cam.y += (ty - this.cam.y) * k;
    const z = this.baseZoom() * (1 - 0.16 * Math.min(1, speed / PLAYER_SPEC.vmax)) * (1 - 0.18 * ui.focus);
    this.cam.zoom += (z - this.cam.zoom) * (1 - Math.exp(-dt * 2));
    // Visa inte för mycket skog utanför staden
    const hvw = this.w / this.cam.zoom / 2;
    const hvh = this.h / this.cam.zoom / 2;
    const pad = 90;
    this.cam.x = city.w + pad * 2 > hvw * 2 ? Math.max(hvw - pad, Math.min(city.w + pad - hvw, this.cam.x)) : city.w / 2;
    this.cam.y = city.h + pad * 2 > hvh * 2 ? Math.max(hvh - pad, Math.min(city.h + pad - hvh, this.cam.y)) : city.h / 2;
    this.shake = Math.max(0, this.shake - dt * 2.5);
    const sh = ui.reducedMotion ? 0 : this.shake * this.shake * 14;
    const camX = this.cam.x + (Math.random() - 0.5) * sh;
    const camY = this.cam.y + (Math.random() - 0.5) * sh;
    const zoom = this.cam.zoom;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = GROUND.forest;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    const sc = this.dpr * zoom;
    ctx.setTransform(sc, 0, 0, sc, this.canvas.width / 2 - camX * sc, this.canvas.height / 2 - camY * sc);

    // Synliga chunks
    const vw = this.w / zoom;
    const vh = this.h / zoom;
    const vx0 = camX - vw / 2;
    const vy0 = camY - vh / 2;
    for (let cy = Math.floor(vy0 / CHUNK); cy <= Math.floor((vy0 + vh) / CHUNK); cy++)
      for (let cx = Math.floor(vx0 / CHUNK); cx <= Math.floor((vx0 + vw) / CHUNK); cx++) {
        if (cx < -1 || cy < -1 || cx * CHUNK > city.w + CHUNK || cy * CHUNK > city.h + CHUNK) continue;
        ctx.drawImage(this.chunk(city, cx, cy), cx * CHUNK, cy * CHUNK, CHUNK, CHUNK);
      }

    // Sladdspår
    this.trackSkids(s);
    ctx.lineCap = "round";
    ctx.lineWidth = 4;
    for (const m of this.skids) {
      const age = this.time - m.t;
      const a = Math.max(0, 0.32 - age * 0.012);
      if (a <= 0) continue;
      ctx.strokeStyle = `rgba(22,24,26,${a})`;
      ctx.beginPath();
      ctx.moveTo(m.x1, m.y1);
      ctx.lineTo(m.x2, m.y2);
      ctx.stroke();
    }
    ctx.lineCap = "butt";
    if (this.skids.length > 900) this.skids.splice(0, this.skids.length - 900);

    // Blåljus på marken
    ctx.globalCompositeOperation = "lighter";
    for (const p of s.police) if (Math.abs(p.x - camX) < vw && Math.abs(p.y - camY) < vh) drawSirenGlow(ctx, p.x, p.y, p.a, this.time + p.id * 0.37);
    ctx.globalCompositeOperation = "source-over";

    // Bilar
    const scale = Math.min(3, Math.max(1, Math.ceil(sc * 2) / 2));
    for (const p of s.police) {
      if (Math.abs(p.x - camX) > vw / 2 + 60 || Math.abs(p.y - camY) > vh / 2 + 60) continue;
      drawCar(ctx, p.x, p.y, p.a, "polis", p.color, scale, { steer: p.steer, braking: p.braking || p.reverse > 0, lights: this.time + p.id * 0.37 });
    }
    // Parkerade bilar (går att byta till)
    let target: { x: number; y: number } | null = null;
    for (const p of s.parked) {
      if (Math.abs(p.x - camX) > vw / 2 + 60 || Math.abs(p.y - camY) > vh / 2 + 60) continue;
      drawCar(ctx, p.x, p.y, p.a, p.model, p.color, scale);
      const d = Math.hypot(p.x - me.x, p.y - me.y);
      if (s.mode === "foot" && d < ENTER_RANGE && (!target || d < Math.hypot(target.x - me.x, target.y - me.y))) target = p;
    }
    if (target) {
      // Markera bilen man kan kliva in i
      ctx.strokeStyle = "rgba(255,214,90,0.95)";
      ctx.lineWidth = 3;
      ctx.setLineDash([6, 5]);
      ctx.beginPath();
      ctx.arc(target.x, target.y, 34 + Math.sin(this.time * 6) * 2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    const blink = s.invuln > 0 && s.phase === "drive" ? (Math.floor(this.time * 10) % 2 ? 0.45 : 1) : 1;
    if (s.mode === "car") {
      if (s.boost > 0) this.boostFlame(pl);
      drawCar(ctx, pl.x, pl.y, pl.a, pl.model, pl.color, scale, { steer: pl.steer, braking: pl.braking, alpha: blink });
    } else if (s.mode === "foot") {
      drawPerson(ctx, me.x, me.y, me.a, pl.color, this.time, Math.hypot(me.vx, me.vy) > 10, blink);
    } else {
      // Spöke: släpar glitter efter sig
      if (Math.random() < 0.6)
        this.particles.push({ x: me.x + (Math.random() - 0.5) * 16, y: me.y + (Math.random() - 0.5) * 16, vx: 0, vy: 0, life: 0.6, max: 0.6, size: 3, kind: "speck", color: "#d9c8ff" });
      drawGhost(ctx, me.x, me.y, me.a, this.time, s.ghostT / GHOST_TIME);
    }

    // Kulor
    ctx.lineCap = "round";
    for (const b of s.bullets) {
      const len = 0.03;
      ctx.strokeStyle = "rgba(255,230,140,0.95)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(b.x - b.vx * len, b.y - b.vy * len);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(b.x - b.vx * len * 0.4, b.y - b.vy * len * 0.4);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
    ctx.lineCap = "butt";

    // Spökladdning: ring när man håller in knappen
    if (s.ghostHold > 0.02 && s.mode !== "ghost") {
      ctx.strokeStyle = "rgba(190,160,255,0.95)";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(me.x, me.y, 44, -Math.PI / 2, -Math.PI / 2 + s.ghostHold * Math.PI * 2);
      ctx.stroke();
    }

    // Polis som tappat spåret: frågetecken
    if (s.lost) {
      ctx.font = "900 22px Nunito, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      for (const p of s.police) {
        if (Math.abs(p.x - camX) > vw / 2 || Math.abs(p.y - camY) > vh / 2) continue;
        ctx.fillStyle = "rgba(16,22,24,0.7)";
        ctx.beginPath();
        ctx.arc(p.x, p.y - 42, 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.fillText("?", p.x, p.y - 41);
      }
    }

    // Partiklar
    this.drawParticles(dt);

    // Fast-ring runt spelaren
    if (s.bust > 0.05 && s.phase === "drive") {
      ctx.strokeStyle = "rgba(255,255,255,0.9)";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(me.x, me.y, 40, -Math.PI / 2, -Math.PI / 2 + s.bust * Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = "rgba(220,40,40,0.9)";
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Polis utanför bild: pilar i kanten
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    for (const p of s.police) {
      const sx = (p.x - camX) * zoom + this.w / 2;
      const sy = (p.y - camY) * zoom + this.h / 2;
      if (sx > -10 && sy > -10 && sx < this.w + 10 && sy < this.h + 10) continue;
      const a = Math.atan2(sy - this.h / 2, sx - this.w / 2);
      const m = 26;
      const ex = Math.max(m, Math.min(this.w - m, this.w / 2 + Math.cos(a) * this.w));
      const ey = Math.max(m + 70, Math.min(this.h - m, this.h / 2 + Math.sin(a) * this.h));
      const d = Math.hypot(p.x - me.x, p.y - me.y);
      const al = Math.max(0.25, Math.min(1, 1 - (d - 400) / 1200));
      ctx.save();
      ctx.translate(ex, ey);
      ctx.rotate(a);
      ctx.globalAlpha = al;
      ctx.fillStyle = Math.floor(this.time * 6 + p.id) % 2 ? "#3d8bff" : "#1f4fa8";
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(12, 0);
      ctx.lineTo(-7, -9);
      ctx.lineTo(-3, 0);
      ctx.lineTo(-7, 9);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  }

  private boostFlame(pl: ChaseState["player"]) {
    for (let i = 0; i < 2; i++) {
      const back = pl.a + Math.PI;
      this.particles.push({
        x: pl.x + Math.cos(back) * 30,
        y: pl.y + Math.sin(back) * 30,
        vx: Math.cos(back + (Math.random() - 0.5) * 0.6) * 120,
        vy: Math.sin(back + (Math.random() - 0.5) * 0.6) * 120,
        life: 0.25,
        max: 0.25,
        size: 5 + Math.random() * 3,
        kind: "spark",
        color: Math.random() < 0.5 ? "#ffd24a" : "#ff7a2f",
      });
    }
  }

  private trackSkids(s: ChaseState) {
    for (const car of s.mode === "car" ? [s.player, ...s.police] : s.police) {
      const slip = Math.abs(car.slip);
      const speed = Math.hypot(car.vx, car.vy);
      const marking = slip > 85 || (car.braking && speed > 200);
      const c = Math.cos(car.a);
      const sn = Math.sin(car.a);
      const bx = car.x - c * 16;
      const by = car.y - sn * 16;
      const w1 = [bx - sn * 10, by + c * 10, bx + sn * 10, by - c * 10] as [number, number, number, number];
      const prev = this.lastWheel.get(car.id);
      if (marking && prev) {
        this.skids.push({ x1: prev[0], y1: prev[1], x2: w1[0], y2: w1[1], t: this.time });
        this.skids.push({ x1: prev[2], y1: prev[3], x2: w1[2], y2: w1[3], t: this.time });
        if (Math.random() < 0.35)
          this.particles.push({ x: bx, y: by, vx: (Math.random() - 0.5) * 30, vy: (Math.random() - 0.5) * 30, life: 0.9, max: 0.9, size: 8 + Math.random() * 6, kind: "smoke", color: "#ece8e0" });
      }
      this.lastWheel.set(car.id, marking ? w1 : (null as unknown as [number, number, number, number]));
      if (!marking) this.lastWheel.delete(car.id);
    }
  }

  private consumeEvents(s: ChaseState, ui: ChaseUi) {
    for (const e of s.events) {
      if (e.t <= this.lastEvent) continue;
      if (e.kind === "crash") {
        this.shake = Math.min(1, this.shake + e.power * 0.7);
        for (let i = 0; i < 8 + e.power * 12; i++) {
          const a = Math.random() * Math.PI * 2;
          const v = 80 + Math.random() * 220;
          this.particles.push({ x: e.x, y: e.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.35, max: 0.35, size: 2, kind: "spark", color: Math.random() < 0.5 ? "#ffd75a" : "#fff3c4" });
        }
      } else if (e.kind === "star") {
        for (let i = 0; i < 16; i++) {
          const a = (i / 16) * Math.PI * 2;
          this.particles.push({ x: e.x, y: e.y, vx: Math.cos(a) * 160, vy: Math.sin(a) * 160, life: 0.8, max: 0.8, size: 7, kind: "star", color: "#f5c53a" });
        }
        this.particles.push({ x: e.x, y: e.y, vx: 0, vy: 0, life: 0.6, max: 0.6, size: 30, kind: "ring", color: "#f5c53a" });
      } else if (e.kind === "shot") {
        // Mynningsflamma
        const a = e.power;
        for (let i = 0; i < 3; i++)
          this.particles.push({ x: e.x + Math.cos(a) * 24, y: e.y + Math.sin(a) * 24, vx: Math.cos(a + (Math.random() - 0.5)) * 160, vy: Math.sin(a + (Math.random() - 0.5)) * 160, life: 0.12, max: 0.12, size: 4, kind: "spark", color: "#fff1a8" });
      } else if (e.kind === "hit") {
        this.shake = Math.min(1, this.shake + 0.25);
        for (let i = 0; i < 6; i++) {
          const a = Math.random() * Math.PI * 2;
          this.particles.push({ x: e.x, y: e.y, vx: Math.cos(a) * 140, vy: Math.sin(a) * 140, life: 0.25, max: 0.25, size: 2, kind: "spark", color: "#ffd75a" });
        }
      } else if (e.kind === "wreck") {
        for (let i = 0; i < 14; i++)
          this.particles.push({ x: e.x + (Math.random() - 0.5) * 30, y: e.y + (Math.random() - 0.5) * 30, vx: (Math.random() - 0.5) * 60, vy: (Math.random() - 0.5) * 60, life: 1.6, max: 1.6, size: 12 + Math.random() * 10, kind: "smoke", color: "#555" });
      } else if (e.kind === "ghost" || e.kind === "possess") {
        this.particles.push({ x: e.x, y: e.y, vx: 0, vy: 0, life: 0.7, max: 0.7, size: 24, kind: "ring", color: "#c9b2ff" });
      } else if (e.kind === "busted") {
        this.shake = ui.reducedMotion ? 0 : 0.8;
      } else if (e.kind === "respawn") {
        this.cam.x = e.x;
        this.cam.y = e.y;
        this.skids = [];
        this.particles.push({ x: e.x, y: e.y, vx: 0, vy: 0, life: 0.7, max: 0.7, size: 26, kind: "ring", color: "#ffffff" });
      }
    }
    if (s.events.length) this.lastEvent = s.events[s.events.length - 1].t;
    if (s.events.length > 40) s.events.splice(0, s.events.length - 40);
  }

  private drawParticles(dt: number) {
    const { ctx } = this;
    for (const p of this.particles) {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 1 - dt * 3;
      p.vy *= 1 - dt * 3;
      const k = Math.max(0, p.life / p.max);
      if (p.kind === "speck") {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = k;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * k, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      } else if (p.kind === "smoke") {
        ctx.fillStyle = `rgba(236,232,224,${k * 0.5})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (1.8 - k), 0, Math.PI * 2);
        ctx.fill();
      } else if (p.kind === "spark") {
        ctx.strokeStyle = p.color;
        ctx.globalAlpha = k;
        ctx.lineWidth = p.size > 3 ? p.size * k : 2;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * 0.04, p.y - p.vy * 0.04);
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.lineCap = "butt";
      } else if (p.kind === "star") {
        ctx.globalAlpha = k;
        starPath(ctx, p.x, p.y, p.size * (0.6 + k * 0.4));
        ctx.fillStyle = p.color;
        ctx.fill();
        ctx.strokeStyle = INK;
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.globalAlpha = 1;
      } else if (p.kind === "ring") {
        ctx.strokeStyle = p.color;
        ctx.globalAlpha = k;
        ctx.lineWidth = 4 * k;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size + (1 - k) * 60, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }
    this.particles = this.particles.filter((p) => p.life > 0);
  }
}

export function starPath(ctx: Ctx, x: number, y: number, r: number) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.45 : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
}
