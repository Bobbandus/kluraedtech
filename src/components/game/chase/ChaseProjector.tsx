"use client";

import { useEffect, useMemo, useRef } from "react";
import { createCity, seedFromCode, CAR_COLORS } from "@/lib/game/chase";
import { ranked } from "@/lib/game/engine";
import type { HostView } from "@/lib/rooms/types";
import { drawCar } from "./sprites";
import { drawCityFull } from "./render";
import s from "./projector.module.css";

const MEDAL = ["#f2c230", "#c9d1d6", "#c8834e"];

type Pos = { x: number; y: number; a: number; tx: number; ty: number; ta: number };

/**
 * Projektorvyn för Biljakt: hela staden med allas bilar och en smal topplista.
 * Inga frågor eller svar visas.
 */
export default function ChaseProjector({ view, remaining, joinText }: { view: HostView; remaining: string; joinText: React.ReactNode }) {
  const city = useMemo(() => createCity(seedFromCode(view.code)), [view.code]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewRef = useRef(view);
  viewRef.current = view;
  const lugn = view.settings.energy === "lugn";

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const pos = new Map<string, Pos>();
    let bg: HTMLCanvasElement | null = null;
    let fit = { scale: 1, ox: 0, oy: 0, dpr: 1 };
    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (!w || !h) return;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      const scale = Math.min(w / city.w, h / city.h) * 0.96;
      fit = { scale, ox: (w - city.w * scale) / 2, oy: (h - city.h * scale) / 2, dpr };
      bg = document.createElement("canvas");
      bg.width = Math.ceil(city.w * scale * dpr);
      bg.height = Math.ceil(city.h * scale * dpr);
      drawCityFull(bg.getContext("2d")!, city, scale * dpr);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const v = viewRef.current;
      const { scale, ox, oy, dpr } = fit;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(ox, oy, city.w * scale, city.h * scale, 18);
      ctx.clip();
      if (bg && bg.width && bg.height) ctx.drawImage(bg, ox, oy, city.w * scale, city.h * scale);
      ctx.restore();

      const order = ranked(v.players);
      const rankOf = new Map(order.map((p, i) => [p.id, i + 1]));
      const top = new Set(order.slice(0, 3).map((p) => p.id));
      // Ritas i omvänd ordning så att ettan hamnar överst
      [...v.players].sort((a, b) => (rankOf.get(b.id) ?? 99) - (rankOf.get(a.id) ?? 99)).forEach((p) => {
        const i = v.players.indexOf(p);
        const rk = rankOf.get(p.id) ?? 99;
        if (p.x === undefined || p.y === undefined) return;
        const tx = p.x * city.w;
        const ty = p.y * city.h;
        let q = pos.get(p.id);
        if (!q) {
          q = { x: tx, y: ty, a: p.a ?? 0, tx, ty, ta: p.a ?? 0 };
          pos.set(p.id, q);
        }
        q.tx = tx;
        q.ty = ty;
        q.ta = p.a ?? q.ta;
        const k = 1 - Math.exp(-dt * 2.2);
        if (Math.hypot(q.tx - q.x, q.ty - q.y) > 600) ((q.x = q.tx), (q.y = q.ty));
        q.x += (q.tx - q.x) * k;
        q.y += (q.ty - q.y) * k;
        let da = q.ta - q.a;
        while (da > Math.PI) da -= Math.PI * 2;
        while (da < -Math.PI) da += Math.PI * 2;
        q.a += da * Math.min(1, dt * 5);

        const sx = ox + q.x * scale;
        const sy = oy + q.y * scale;
        const carScale = Math.max(0.55, Math.min(1.2, scale * 2.1));
        if (p.busted) {
          const on = Math.floor(now / 180) % 2;
          ctx.fillStyle = on ? "rgba(61,139,255,0.45)" : "rgba(61,139,255,0.15)";
          ctx.beginPath();
          ctx.arc(sx, sy, 26 * carScale, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.save();
        ctx.translate(sx, sy);
        ctx.scale(carScale, carScale);
        // Topp 3 kör i guld, silver och brons
        const color = !lugn && rk <= 3 ? MEDAL[rk - 1] : CAR_COLORS[i % CAR_COLORS.length];
        if (!lugn && rk <= 3) {
          const glow = ctx.createRadialGradient(0, 0, 4, 0, 0, 44);
          glow.addColorStop(0, `${color}88`);
          glow.addColorStop(1, `${color}00`);
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(0, 0, 44, 0, Math.PI * 2);
          ctx.fill();
        }
        drawCar(ctx, 0, 0, q.a, "sport", color, Math.min(3, carScale * dpr * 1.5));
        ctx.restore();
        const showName = !lugn || top.has(p.id);
        if (showName && v.players.length <= 32) {
          ctx.font = `800 ${Math.round(13 * Math.max(0.9, carScale))}px Nunito, system-ui, sans-serif`;
          const medal = top.has(p.id) && !lugn;
          const label = p.name;
          const w = ctx.measureText(label).width + (medal ? 34 : 14);
          const ly = sy - 30 * carScale;
          ctx.fillStyle = "rgba(255,255,255,0.95)";
          ctx.beginPath();
          ctx.roundRect(sx - w / 2, ly - 11, w, 22, 11);
          ctx.fill();
          if (medal) {
            ctx.fillStyle = MEDAL[rk - 1];
            ctx.beginPath();
            ctx.arc(sx - w / 2 + 11, ly, 9, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = "rgba(0,0,0,0.25)";
            ctx.lineWidth = 1.5;
            ctx.stroke();
            ctx.fillStyle = "#1d2326";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(String(rk), sx - w / 2 + 11, ly + 0.5);
          }
          ctx.fillStyle = "#1d2326";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(label, sx + (medal ? 10 : 0), ly + 0.5);
        }
      });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [city, lugn]);

  const order = ranked(view.players);
  const classStars = view.players.reduce((a, p) => a + (p.stars ?? 0), 0);

  return (
    <div className={s.wrap}>
      <canvas ref={canvasRef} className={s.map} aria-label="Karta över staden med alla elevers bilar" role="img" />
      <div className={s.topLeft}>
        <span className={s.time} role="timer" aria-label="Tid kvar">
          {remaining}
        </span>
        <span className={s.join}>{joinText}</span>
      </div>
      <aside className={s.board} aria-label={lugn ? "Klassens stjärnor" : "Flest stjärnor"}>
        <div className={s.boardHead}>
          <StarIcon /> {lugn ? "Klassen tillsammans" : "Flest poäng"}
        </div>
        {lugn ? (
          <div className={s.classTotal}>
            <span>{classStars}</span>
            <small>stjärnor totalt</small>
          </div>
        ) : (
          <ol className={s.list}>
            {order.slice(0, 8).map((p, i) => (
              <li key={p.id} className={i < 3 ? s.podium : ""}>
                <span className={`${s.rank} ${i === 0 ? s.gold : i === 1 ? s.silver : i === 2 ? s.bronze : ""}`}>{i + 1}</span>
                <span className={s.name}>{p.name}</span>
                <span className={s.mult}>×{(1 + (p.stars ?? 0) * 0.5).toLocaleString("sv-SE")}</span>
                <span className={s.points}>{p.score.toLocaleString("sv-SE")}</span>
              </li>
            ))}
          </ol>
        )}
        <div className={s.foot}>{view.classCorrect} rätta svar i klassen</div>
      </aside>
    </div>
  );
}

function StarIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2.8l2.8 5.8 6.3.8-4.6 4.4 1.2 6.3L12 17l-5.7 3.1 1.2-6.3L2.9 9.4l6.3-.8z" fill="#ffd65a" stroke="#2a2310" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}
