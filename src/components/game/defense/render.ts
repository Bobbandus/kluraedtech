import {
  CABIN,
  COLS,
  DECOR,
  ROWS,
  TOWERS,
  WAYPOINTS,
  canBuildAt,
  pathPoint,
  type DefenseState,
  type FxEvent,
  type TowerKind,
} from "@/lib/game/defense";
import { ENEMIES } from "@/lib/game/defense";
import {
  PAL,
  drawBush,
  drawCabin,
  drawEnemy,
  drawLake,
  drawPath,
  drawPine,
  drawProjectile,
  drawRock,
  drawTower,
  grassTile,
  hpBar,
  pebbles,
  type Ctx,
} from "./sprites";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
  kind: "dot" | "puff" | "text" | "ring";
  text?: string;
}

export interface DefenseUi {
  hover: { c: number; r: number } | null;
  selectedTowerId: number | null;
  placing: TowerKind | null;
  reducedMotion: boolean;
}

export class DefenseRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: Ctx;
  private bg: HTMLCanvasElement | null = null;
  T = 40;
  private dpr = 1;
  private particles: Particle[] = [];
  private lastEventT = -1;
  private hurt = 0;
  private time = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
  }

  resize(cssWidth: number) {
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.T = cssWidth / COLS;
    const w = Math.round(cssWidth);
    const h = Math.round(this.T * ROWS);
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    this.canvas.width = Math.round(w * this.dpr);
    this.canvas.height = Math.round(h * this.dpr);
    this.bg = null;
  }

  cellAt(px: number, py: number): { c: number; r: number } | null {
    const c = Math.floor(px / this.T);
    const r = Math.floor(py / this.T);
    return c >= 0 && c < COLS && r >= 0 && r < ROWS ? { c, r } : null;
  }

  private cx(c: number) {
    return (c + 0.5) * this.T;
  }
  private cy(r: number) {
    return (r + 0.5) * this.T;
  }

  private buildBackground() {
    const T = this.T;
    const bg = document.createElement("canvas");
    bg.width = this.canvas.width;
    bg.height = this.canvas.height;
    const g = bg.getContext("2d")!;
    g.scale(this.dpr, this.dpr);
    for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) grassTile(g, c, r, T);
    const pts = WAYPOINTS.map(([x, y]) => [this.cx(x), this.cy(y)] as [number, number]);
    // Förläng stigen fram till stugans dörr
    drawPath(g, pts, T);
    const samples: [number, number][] = [];
    for (let i = 0; i < 80; i++) {
      const p = pathPoint((i / 80) * 30);
      samples.push([this.cx(p.x), this.cy(p.y)]);
    }
    pebbles(g, samples, T);
    // Sjön
    const lake = DECOR.filter((d) => d.kind === "sjo");
    if (lake.length) {
      const minC = Math.min(...lake.map((d) => d.c));
      const maxC = Math.max(...lake.map((d) => d.c));
      const minR = Math.min(...lake.map((d) => d.r));
      const maxR = Math.max(...lake.map((d) => d.r));
      drawLake(g, minC * T + 2, minR * T + 3, (maxC - minC + 1) * T - 4, (maxR - minR + 1) * T - 4, 0);
    }
    // Mjuk vinjett
    const vg = g.createRadialGradient((COLS * T) / 2, (ROWS * T) / 2, T * 2, (COLS * T) / 2, (ROWS * T) / 2, COLS * T * 0.7);
    vg.addColorStop(0, "rgba(0,0,0,0)");
    vg.addColorStop(1, "rgba(10,61,49,0.16)");
    g.fillStyle = vg;
    g.fillRect(0, 0, COLS * T, ROWS * T);
    this.bg = bg;
  }

  private spawn(p: Partial<Particle> & { x: number; y: number }, n = 1, spread = 1) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = (0.4 + Math.random()) * spread * this.T;
      this.particles.push({
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - this.T * 0.3,
        life: 0,
        max: 0.6,
        size: this.T * 0.06,
        color: "#fff",
        kind: "dot",
        ...p,
      } as Particle);
    }
  }

  private consumeEvents(events: FxEvent[], reduced: boolean) {
    for (const ev of events) {
      if (ev.t <= this.lastEventT) continue;
      const many = reduced ? 0.4 : 1;
      if (ev.type === "hit") {
        const x = this.cx(ev.x);
        const y = this.cy(ev.y) - this.T * 0.25;
        const color = ev.kind === "snoboll" ? "#ffffff" : ev.kind === "lykta" ? PAL.fire : PAL.dirtDark;
        this.spawn({ x, y, color, max: 0.4, size: this.T * 0.05 }, Math.ceil((ev.kind === "lykta" ? 10 : 5) * many), ev.kind === "lykta" ? 1.6 : 0.8);
        if (ev.kind === "lykta") this.particles.push({ x, y, vx: 0, vy: 0, life: 0, max: 0.35, size: this.T * 0.9, color: PAL.fire, kind: "ring" });
      } else if (ev.type === "kill") {
        const x = this.cx(ev.x);
        const y = this.cy(ev.y) - this.T * 0.3;
        this.spawn({ x, y, kind: "puff", color: "rgba(245,245,240,0.9)", max: 0.6, size: this.T * 0.16 }, Math.ceil(6 * many), 0.7);
        this.particles.push({ x, y: y - this.T * 0.2, vx: 0, vy: -this.T * 0.9, life: 0, max: 0.9, size: this.T * 0.32, color: PAL.gold, kind: "text", text: `+${ev.reward}` });
      } else if (ev.type === "leak") {
        this.hurt = 1;
        const x = this.cx(CABIN[0]);
        const y = this.cy(CABIN[1]) - this.T * 0.9;
        this.particles.push({ x, y, vx: 0, vy: -this.T * 0.8, life: 0, max: 1, size: this.T * 0.36, color: "#e0533f", kind: "text", text: `−${ev.damage}` });
      } else if (ev.type === "income") {
        const x = this.cx(ev.x);
        const y = this.cy(ev.y) - this.T * 0.7;
        this.particles.push({ x, y, vx: 0, vy: -this.T * 0.7, life: 0, max: 1, size: this.T * 0.3, color: PAL.gold, kind: "text", text: `+${ev.amount}` });
      } else if (ev.type === "build") {
        const x = this.cx(ev.x);
        const y = this.cy(ev.y);
        this.particles.push({ x, y, vx: 0, vy: 0, life: 0, max: 0.45, size: this.T * 0.7, color: "#fff", kind: "ring" });
        this.spawn({ x, y, kind: "puff", color: "rgba(231,203,152,0.9)", max: 0.5, size: this.T * 0.12 }, Math.ceil(8 * many), 0.9);
      }
    }
    if (events.length) this.lastEventT = Math.max(this.lastEventT, ...events.map((e) => e.t));
  }

  draw(state: DefenseState, ui: DefenseUi, dt: number) {
    const ctx = this.ctx;
    const T = this.T;
    this.time += dt;
    const t = this.time;
    if (!this.bg) this.buildBackground();
    this.consumeEvents(state.events, ui.reducedMotion);
    this.hurt = Math.max(0, this.hurt - dt * 2.5);

    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, COLS * T, ROWS * T);
    ctx.drawImage(this.bg!, 0, 0, COLS * T, ROWS * T);

    // Byggbara rutor när man placerar
    if (ui.placing) {
      for (let c = 0; c < COLS; c++) {
        for (let r = 0; r < ROWS; r++) {
          if (!canBuildAt(state, c, r)) continue;
          ctx.fillStyle = "rgba(255,255,255,0.16)";
          ctx.strokeStyle = "rgba(255,255,255,0.35)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.roundRect(c * T + 3, r * T + 3, T - 6, T - 6, T * 0.15);
          ctx.fill();
          ctx.stroke();
        }
      }
    }

    // Räckvidd för vald eller hovrad
    const sel = state.towers.find((x) => x.id === ui.selectedTowerId);
    const rangeAt = (c: number, r: number, range: number, ok = true) => {
      ctx.fillStyle = ok ? "rgba(255,255,255,0.14)" : "rgba(224,83,63,0.12)";
      ctx.strokeStyle = ok ? "rgba(255,255,255,0.7)" : "rgba(224,83,63,0.6)";
      ctx.setLineDash([6, 6]);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.cx(c), this.cy(r), range * T, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.setLineDash([]);
    };
    if (sel && sel.kind !== "bastu") rangeAt(sel.c, sel.r, TOWERS[sel.kind].range[sel.level]);
    if (ui.placing && ui.hover) {
      const ok = canBuildAt(state, ui.hover.c, ui.hover.r) && state.wood >= TOWERS[ui.placing].cost[0];
      if (ui.placing !== "bastu") rangeAt(ui.hover.c, ui.hover.r, TOWERS[ui.placing].range[0], ok);
    }

    // Djupsorterade objekt
    type Drawable = { y: number; draw: () => void };
    const items: Drawable[] = [];
    for (const d of DECOR) {
      if (d.kind === "sjo") continue;
      const x = this.cx(d.c);
      const y = this.cy(d.r) + T * 0.32;
      const sway = ui.reducedMotion ? 0 : Math.sin(t * 1.4 + d.c) * T * 0.015;
      if (d.kind === "gran") items.push({ y, draw: () => drawPine(ctx, x, y, T, sway) });
      if (d.kind === "sten") items.push({ y, draw: () => drawRock(ctx, x, y, T) });
      if (d.kind === "buske") items.push({ y, draw: () => drawBush(ctx, x, y, T) });
    }
    const cabX = this.cx(CABIN[0]);
    const cabY = this.cy(CABIN[1]) + T * 0.3;
    items.push({ y: cabY, draw: () => drawCabin(ctx, cabX, cabY, T * 1.15, t, this.hurt, state.hp / state.maxHp) });
    for (const tw of state.towers) {
      const x = this.cx(tw.c);
      const y = this.cy(tw.r) + T * 0.22;
      const recoil = Math.max(0, 1 - (state.t - tw.firedAt) * 6);
      items.push({
        y,
        draw: () => {
          if (tw.id === ui.selectedTowerId) {
            ctx.strokeStyle = "#fff";
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.ellipse(x, y - T * 0.02, T * 0.42, T * 0.2, 0, 0, Math.PI * 2);
            ctx.stroke();
          }
          drawTower(ctx, tw.kind, x, y, T, tw.level, tw.angle, t, recoil);
        },
      });
    }
    for (const e of state.enemies) {
      const p = pathPoint(e.dist);
      const x = this.cx(p.x);
      const y = this.cy(p.y) + T * 0.18;
      const flash = state.t - e.hitAt < 0.08;
      const slowed = state.t < e.slowUntil;
      const R = ENEMIES[e.kind].radius * T;
      items.push({
        y,
        draw: () => {
          drawEnemy(ctx, e.kind, x, y, T, t + e.id * 0.37, p.angle, flash, slowed);
          hpBar(ctx, x, y - R * 2.5 - T * 0.12, Math.max(T * 0.5, R * 2), e.hp / e.maxHp);
        },
      });
    }
    // Spöktorn vid placering
    if (ui.placing && ui.hover && canBuildAt(state, ui.hover.c, ui.hover.r)) {
      const x = this.cx(ui.hover.c);
      const y = this.cy(ui.hover.r) + T * 0.22;
      items.push({
        y,
        draw: () => {
          ctx.save();
          ctx.globalAlpha = 0.6;
          drawTower(ctx, ui.placing!, x, y, T, 0, -Math.PI / 2, t, 0);
          ctx.restore();
        },
      });
    }
    items.sort((a, b) => a.y - b.y);
    for (const it of items) it.draw();

    // Projektiler
    for (const pr of state.projectiles) {
      const x = this.cx(pr.x);
      const y = this.cy(pr.y) - T * 0.35;
      const arc = pr.kind === "snoboll" ? -Math.sin(Math.min(1, Math.hypot(pr.tx - pr.x, pr.ty - pr.y) / 2) * Math.PI) * T * 0.3 : 0;
      drawProjectile(ctx, pr.kind, x, y + arc, T, Math.atan2(pr.ty - pr.y, pr.tx - pr.x), t);
    }

    // Partiklar
    const keep: Particle[] = [];
    for (const p of this.particles) {
      p.life += dt;
      if (p.life >= p.max) continue;
      const k = p.life / p.max;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.kind === "dot") p.vy += T * 3 * dt;
      ctx.save();
      ctx.globalAlpha = 1 - k;
      if (p.kind === "text") {
        ctx.font = `900 ${p.size}px "Nunito Variable", system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.lineWidth = 4;
        ctx.strokeStyle = "rgba(27,36,34,0.7)";
        ctx.strokeText(p.text!, p.x, p.y);
        ctx.fillStyle = p.color;
        ctx.fillText(p.text!, p.x, p.y);
      } else if (p.kind === "ring") {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 3 * (1 - k);
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, p.size * (0.3 + k * 0.7), p.size * (0.15 + k * 0.35), 0, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (p.kind === "puff" ? 0.6 + k : 1 - k * 0.5), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      keep.push(p);
    }
    this.particles = keep.slice(-220);

    // Röd blinkning när stugan tar skada
    if (this.hurt > 0) {
      ctx.fillStyle = `rgba(224,83,63,${this.hurt * 0.12})`;
      ctx.fillRect(0, 0, COLS * T, ROWS * T);
    }
  }
}
