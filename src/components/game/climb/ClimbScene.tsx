"use client";

import { useEffect, useRef } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Avatar } from "@/components/avatar";
import { PAL, drawPine, drawRock, hash, shadow, type Ctx } from "@/components/game/defense/sprites";
import { useStore } from "@/lib/store";

/**
 * Klättervyn för Topptur: ett fjäll i sidovy med parallax, där din figur
 * vandrar och klättrar uppför stigen för varje rätt svar. Klassens figurer
 * syns som skuggor (utan namn). Samma ritstil som Fjällförsvar.
 */

const cache = new Map<string, HTMLImageElement>();
function avatarImage(skin: string): HTMLImageElement | null {
  if (typeof window === "undefined") return null;
  let img = cache.get(skin);
  if (!img) {
    const svg = renderToStaticMarkup(<Avatar skin={skin} size={100} />).replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
    img = new Image();
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    cache.set(skin, img);
  }
  return img.complete && img.naturalWidth ? img : null;
}

export interface ClimbProps {
  /** Din figur. Utelämna för projektorn (bara klassen syns). */
  skin?: string;
  score: number;
  maxScore: number;
  /** name/rank visas som etikett ovanför figuren (projektorn) */
  field?: { skinId: string; score: number; name?: string; rank?: number }[];
  height?: number;
  /** Etiketter för etapper längs stigen */
  legs?: string[];
  showGhosts?: boolean;
  className?: string;
}

/** Stigen som funktion av andel (0–1) i en normaliserad ruta 0..1. */
function trail(f: number): { x: number; y: number } {
  // Mjuk kurva med små serpentiner som blir brantare mot toppen
  const x = 0.06 + f * 0.78 + Math.sin(f * Math.PI * 5) * 0.015;
  const y = 0.9 - Math.pow(f, 1.25) * 0.6 + Math.sin(f * Math.PI * 7) * 0.012;
  return { x, y };
}

export default function ClimbScene({ skin, score, maxScore, field = [], height = 130, legs = [], showGhosts = true, className }: ClimbProps) {
  const ref = useRef<HTMLCanvasElement>(null);
  const reduced = useStore((x) => x.prefs.reducedMotion);
  const target = useRef(0);
  const props = useRef({ skin, field, legs, showGhosts, reduced });
  props.current = { skin, field: field.map((p) => ({ ...p, f: Math.min(1, p.score / Math.max(1, maxScore)) })), legs, showGhosts, reduced } as never;
  target.current = Math.min(1, score / Math.max(1, maxScore));

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d")!;
    let raf = 0;
    let shown = target.current;
    let last = performance.now();
    let t = 0;
    let dust: { x: number; y: number; life: number }[] = [];
    let W = 0;
    let H = 0;
    let dpr = 1;
    const fit = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      W = canvas.clientWidth;
      H = canvas.clientHeight;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(canvas);

    const P = (f: number) => {
      const p = trail(f);
      return { x: p.x * W, y: p.y * H };
    };

    const ridge = (base: number, amp: number, seed: number, color: string, offset: number) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(0, H);
      for (let x = 0; x <= W + 10; x += 10) {
        const k = (x + offset) / W;
        const y = H * base - (Math.sin(k * 5 + seed) * 0.5 + Math.sin(k * 11 + seed * 2) * 0.25 + 0.6) * H * amp;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(W, H);
      ctx.closePath();
      ctx.fill();
    };

    const loop = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      t += dt;
      const pr = props.current as unknown as { skin?: string; field: { skinId: string; f: number; name?: string; rank?: number }[]; legs: string[]; showGhosts: boolean; reduced: boolean };
      const moving = Math.abs(target.current - shown) > 0.002;
      shown += (target.current - shown) * Math.min(1, dt * (pr.reduced ? 20 : 2.2));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Himmel
      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, "#cfe9f2");
      sky.addColorStop(1, "#eef6ee");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, H);
      // Sol
      ctx.fillStyle = "rgba(255,201,60,0.9)";
      ctx.beginPath();
      ctx.arc(W * 0.93, H * 0.2, Math.min(W, H) * 0.09, 0, Math.PI * 2);
      ctx.fill();
      // Moln (parallax)
      for (let i = 0; i < 3; i++) {
        const cx = ((i * 0.37 + t * 0.008 * (i + 1)) % 1.2) * W - W * 0.1;
        const cy = H * (0.12 + i * 0.08);
        ctx.fillStyle = "rgba(255,255,255,0.85)";
        ctx.beginPath();
        ctx.ellipse(cx, cy, W * 0.05, H * 0.05, 0, 0, Math.PI * 2);
        ctx.ellipse(cx + W * 0.035, cy - H * 0.025, W * 0.04, H * 0.05, 0, 0, Math.PI * 2);
        ctx.ellipse(cx + W * 0.07, cy, W * 0.045, H * 0.04, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      // Bakre fjällkedjor (parallax efter din höjd)
      ridge(0.75, 0.42, 1, "#b9dccd", shown * W * 0.08);
      ridge(0.92, 0.35, 3, "#9fcfb7", shown * W * 0.16);

      // Huvudfjället
      const top = P(1);
      ctx.fillStyle = "#7cc2a3";
      ctx.beginPath();
      ctx.moveTo(0, H);
      ctx.lineTo(0, H * 0.92);
      for (let f = 0; f <= 1.0001; f += 0.02) {
        const p = P(f);
        ctx.lineTo(p.x + W * 0.02, p.y + H * 0.04);
      }
      ctx.lineTo(top.x + W * 0.05, top.y + H * 0.02);
      ctx.lineTo(W, H * 0.62);
      ctx.lineTo(W, H);
      ctx.closePath();
      ctx.fill();
      // Skuggsida
      ctx.fillStyle = "#6ab595";
      ctx.beginPath();
      ctx.moveTo(top.x + W * 0.05, top.y + H * 0.02);
      ctx.lineTo(W, H * 0.62);
      ctx.lineTo(W, H);
      ctx.lineTo(top.x - W * 0.05, H);
      ctx.closePath();
      ctx.fill();
      // Snötopp
      ctx.fillStyle = PAL.snow;
      ctx.beginPath();
      ctx.moveTo(top.x - W * 0.07, top.y + H * 0.14);
      ctx.lineTo(top.x + W * 0.05, top.y + H * 0.02);
      ctx.lineTo(top.x + W * 0.14, top.y + H * 0.16);
      ctx.quadraticCurveTo(top.x + W * 0.04, top.y + H * 0.1, top.x - W * 0.07, top.y + H * 0.14);
      ctx.fill();

      // Granar på nedre delen, stenar högre upp
      for (let i = 0; i < 14; i++) {
        const f = hash(i, 4) * 0.45;
        const p = P(f);
        const below = H * (0.06 + hash(i, 5) * 0.08);
        if (p.y + below > H - 2) continue;
        drawPine(ctx, p.x + (hash(i, 6) - 0.5) * W * 0.06, p.y + below, H * 0.16);
      }
      for (let i = 0; i < 4; i++) {
        const p = P(0.55 + i * 0.09);
        drawRock(ctx, p.x + W * 0.03, p.y + H * 0.06, H * 0.12);
      }

      // Stig
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = PAL.dirtEdge;
      ctx.lineWidth = Math.max(4, H * 0.045);
      ctx.beginPath();
      for (let f = 0; f <= 1.0001; f += 0.01) {
        const p = P(f);
        f ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y);
      }
      ctx.stroke();
      ctx.strokeStyle = PAL.dirt;
      ctx.lineWidth = Math.max(2.5, H * 0.03);
      ctx.stroke();
      // Avklarad del av stigen
      ctx.strokeStyle = "#ffcf5c";
      ctx.lineWidth = Math.max(2, H * 0.018);
      ctx.beginPath();
      for (let f = 0; f <= shown + 0.0001; f += 0.01) {
        const p = P(Math.min(f, shown));
        f ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y);
      }
      ctx.stroke();
      // Rep på den branta sista biten
      const rope0 = P(0.82);
      ctx.strokeStyle = "#c9673f";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(rope0.x, rope0.y - H * 0.04);
      for (let f = 0.82; f <= 1; f += 0.02) {
        const p = P(f);
        ctx.lineTo(p.x, p.y - H * 0.04);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      // Etappskyltar
      pr.legs.forEach((label, i) => {
        if (i === pr.legs.length - 1) return;
        const f = (i + 1) / pr.legs.length;
        const p = P(f);
        ctx.fillStyle = PAL.woodDark;
        ctx.fillRect(p.x - 1, p.y - H * 0.18, 2.5, H * 0.18);
        ctx.font = `800 ${Math.max(10, H * 0.085)}px "Nunito Variable", system-ui, sans-serif`;
        const w = ctx.measureText(label).width + 10;
        ctx.fillStyle = PAL.wood;
        ctx.beginPath();
        ctx.roundRect(p.x - w / 2, p.y - H * 0.28, w, H * 0.11, 4);
        ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(label, p.x, p.y - H * 0.225);
      });

      // Toppflagga
      ctx.strokeStyle = PAL.ink;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(top.x, top.y);
      ctx.lineTo(top.x, top.y - H * 0.2);
      ctx.stroke();
      ctx.fillStyle = PAL.fire;
      ctx.beginPath();
      ctx.moveTo(top.x, top.y - H * 0.2);
      ctx.lineTo(top.x + H * 0.13 + Math.sin(t * 5) * 2, top.y - H * 0.16);
      ctx.lineTo(top.x, top.y - H * 0.12);
      ctx.fill();

      // Skuggor av klasskamrater
      const size = Math.max(18, H * 0.24);
      if (pr.showGhosts) {
        for (const g of pr.field.slice(0, 40)) {
          const img = avatarImage(g.skinId);
          const p = P(g.f);
          ctx.globalAlpha = pr.skin ? 0.32 : 0.95;
          if (img) ctx.drawImage(img, p.x - size * 0.35, p.y - size * 0.72, size * 0.7, size * 0.7);
          ctx.globalAlpha = 1;
        }
        // Namnskyltar (projektorn), de bästa sist så att de hamnar överst
        const labeled = pr.field.filter((g) => g.name).sort((a, b) => (b.rank ?? 99) - (a.rank ?? 99));
        const fs = Math.max(11, Math.min(15, H * 0.05));
        ctx.font = `800 ${fs}px Nunito, system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        for (const g of labeled) {
          const p = P(g.f);
          const medal = g.rank === 1 ? "#ffcf3f" : g.rank === 2 ? "#cfd6dc" : g.rank === 3 ? "#e0a070" : null;
          const label = g.name!;
          const w = ctx.measureText(label).width + (medal ? 30 : 14);
          const y = p.y - size * 0.72 - fs * 0.9;
          ctx.fillStyle = "rgba(255,255,255,0.95)";
          ctx.beginPath();
          ctx.roundRect(p.x - w / 2, y - fs * 0.75, w, fs * 1.5, fs * 0.75);
          ctx.fill();
          if (medal) {
            ctx.fillStyle = medal;
            ctx.beginPath();
            ctx.arc(p.x - w / 2 + fs * 0.85, y, fs * 0.55, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "#1d2326";
            ctx.font = `900 ${fs * 0.75}px Nunito, system-ui, sans-serif`;
            ctx.fillText(String(g.rank), p.x - w / 2 + fs * 0.85, y + 0.5);
            ctx.font = `800 ${fs}px Nunito, system-ui, sans-serif`;
          }
          ctx.fillStyle = "#1d2326";
          ctx.fillText(label, p.x + (medal ? fs * 0.55 : 0), y + 0.5);
        }
      }

      // Damm när du rör dig
      const me = P(shown);
      if (moving && !pr.reduced && Math.random() < 0.5) dust.push({ x: me.x - 4, y: me.y, life: 0 });
      dust = dust.filter((d) => (d.life += dt) < 0.6);
      for (const d of dust) {
        ctx.fillStyle = `rgba(231,203,152,${0.7 * (1 - d.life / 0.6)})`;
        ctx.beginPath();
        ctx.arc(d.x - d.life * 14, d.y - d.life * 8, 2 + d.life * 6, 0, Math.PI * 2);
        ctx.fill();
      }

      // Du
      if (!pr.skin) {
        raf = requestAnimationFrame(loop);
        return;
      }
      const img = avatarImage(pr.skin);
      const bob = moving && !pr.reduced ? Math.abs(Math.sin(t * 14)) * size * 0.12 : Math.sin(t * 2) * size * 0.02;
      const tilt = shown > 0.82 ? -0.25 : moving ? Math.sin(t * 14) * 0.08 : 0;
      shadow(ctx, me.x, me.y + 1, size * 0.32, size * 0.08, 0.25);
      ctx.save();
      ctx.translate(me.x, me.y - bob);
      ctx.rotate(tilt);
      ctx.fillStyle = "#fff";
      ctx.strokeStyle = PAL.fire;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, -size * 0.5, size * 0.56, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      if (img) ctx.drawImage(img, -size * 0.45, -size * 0.95, size * 0.9, size * 0.9);
      ctx.restore();

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return <canvas ref={ref} className={className} style={{ width: "100%", height, display: "block", borderRadius: 18 }} aria-hidden="true" />;
}
