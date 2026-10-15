"use client";

import { useEffect, useRef } from "react";
import { ranked } from "@/lib/game/engine";
import type { HostView } from "@/lib/rooms/types";
import { skierSprite } from "./render";
import p from "../chase/projector.module.css";

const JACKETS = ["#e0483b", "#2f7fc1", "#f2b705", "#3f9a5a", "#8a4fc0", "#e0607e", "#1f8f8a", "#ff7a1a"];
const MEDAL = ["#f2c230", "#dfe5e8", "#e0a370"];
const PIX = 3;

function hash(a: number, b: number) {
  const n = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

/**
 * Projektorvyn för Slalom: ett störtlopp där varje rad är en elev.
 * Ju fler poäng desto längre ner i backen (till höger) har man kommit.
 */
export default function SlalomProjector({ view, remaining, joinText }: { view: HostView; remaining: string; joinText: React.ReactNode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewRef = useRef(view);
  viewRef.current = view;
  const lugn = view.settings.energy === "lugn";

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const buf = document.createElement("canvas");
    const b = buf.getContext("2d")!;
    let bw = 0;
    let bh = 0;
    let dpr = 1;
    let bg: HTMLCanvasElement | null = null;
    const pos = new Map<string, { x: number; y: number }>();
    const resize = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (!w || !h) return;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      bw = Math.ceil(w / PIX);
      bh = Math.ceil(h / PIX);
      buf.width = bw;
      buf.height = bh;
      bg = drawBg(bw, bh);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    let raf = 0;
    let last = performance.now();
    let time = 0;
    const loop = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      time += dt;
      const v = viewRef.current;
      if (!bg || !bw) {
        raf = requestAnimationFrame(loop);
        return;
      }
      b.imageSmoothingEnabled = false;
      b.drawImage(bg, 0, 0);
      const order = ranked(v.players);
      const lanes = order.slice(0, Math.min(order.length, 10));
      const top = Math.round(bh * 0.3);
      const bottom = bh - 10;
      const usable = bw * 0.78;
      const laneW = Math.floor(usable / Math.max(6, lanes.length));
      const left = Math.round((bw * 0.78 - laneW * lanes.length) / 2) + 8;
      const maxScore = Math.max(1, ...lanes.map((x) => x.score));
      // Spår nerför backen
      lanes.forEach((_, i) => {
        const x = left + i * laneW;
        b.fillStyle = i % 2 ? "#eef5f9" : "#f6fafc";
        b.fillRect(x, top - 6, laneW, bh - top + 6);
        b.fillStyle = "#d3e2ec";
        for (let y = top - 6 + (Math.floor(time * 30) % 8); y < bh; y += 8) b.fillRect(x, y, 1, 4);
        for (let gy = top + 26, k = 0; gy < bottom - 8; gy += 34, k++) {
          const col = k % 2 ? "#e0483b" : "#2f7fc1";
          const off = k % 2 ? 3 : -3;
          for (const px of [x + laneW * 0.25 + off, x + laneW * 0.75 + off]) {
            b.fillStyle = "#1b2226";
            b.fillRect(Math.round(px) - 1, gy - 7, 3, 8);
            b.fillStyle = col;
            b.fillRect(Math.round(px), gy - 6, 1, 6);
          }
        }
      });
      // Mållinje
      for (let x = left; x < left + lanes.length * laneW; x += 2) {
        b.fillStyle = Math.floor((x - left) / 2) % 2 ? "#1b2226" : "#ffffff";
        b.fillRect(x, bottom, 2, 2);
        b.fillStyle = Math.floor((x - left) / 2) % 2 ? "#ffffff" : "#1b2226";
        b.fillRect(x, bottom + 2, 2, 2);
      }
      // Åkare
      const slots: { id: string; x: number; y: number; rk: number }[] = [];
      lanes.forEach((pl, i) => {
        const tx = left + i * laneW + laneW / 2;
        const ty = top + 4 + (bottom - top - 20) * (pl.score / maxScore);
        let q = pos.get(pl.id);
        if (!q) {
          q = { x: tx, y: top };
          pos.set(pl.id, q);
        }
        q.x += (tx - q.x) * Math.min(1, dt * 3);
        q.y += (ty - q.y) * Math.min(1, dt * 1.5);
        const idx = v.players.findIndex((x) => x.id === pl.id);
        const sway = Math.sin(time * 2.2 + idx * 1.7);
        const pose = pl.downed ? "fallen" : sway > 0.55 ? "right" : sway < -0.55 ? "left" : "straight";
        const spr = skierSprite(pose, JACKETS[idx % JACKETS.length], "#1b2226");
        const sx = Math.round(q.x + (pl.downed ? 0 : sway * laneW * 0.18));
        const sy = Math.round(q.y);
        // Spår ovanför
        b.fillStyle = "#d3e2ec";
        for (let k = 2; k < 14; k += 2) {
          const ox = Math.round(Math.sin(time * 2.2 + idx * 1.7 - k * 0.12) * laneW * 0.18);
          b.fillRect(Math.round(q.x) + ox - 2, sy - spr.height - k, 1, 1);
          b.fillRect(Math.round(q.x) + ox + 2, sy - spr.height - k, 1, 1);
        }
        b.fillStyle = "rgba(40,80,110,0.2)";
        b.fillRect(sx - 5, sy + 1, 10, 2);
        b.drawImage(spr, sx - Math.round(spr.width / 2), sy - spr.height);
        slots.push({ id: pl.id, x: sx, y: sy - spr.height, rk: i + 1 });
      });

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(buf, 0, 0, bw * PIX * dpr, bh * PIX * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Namn och multiplikator ovanför varje åkare
      ctx.textBaseline = "middle";
      ctx.textAlign = "center";
      for (const sl of slots) {
        const pl = v.players.find((x) => x.id === sl.id)!;
        const x = sl.x * PIX;
        // Varannan etikett lite högre så att grannarna inte krockar
        const y = sl.y * PIX - 18 - (slots.length > 6 && sl.rk % 2 === 0 ? 44 : 0);
        const label = lugn ? "" : pl.name;
        ctx.font = `800 ${slots.length > 8 ? 14 : 15}px Nunito, system-ui, sans-serif`;
        const w = (label ? ctx.measureText(label).width : 0) + 40;
        ctx.fillStyle = sl.rk <= 3 && !lugn ? MEDAL[sl.rk - 1] : "rgba(255,255,255,0.95)";
        ctx.beginPath();
        ctx.roundRect(x - w / 2, y - 12, w, 24, 12);
        ctx.fill();
        ctx.fillStyle = "#1d2326";
        ctx.font = "900 13px Nunito, system-ui, sans-serif";
        ctx.fillText(String(sl.rk), x - w / 2 + 13, y + 1);
        if (label) {
          ctx.font = "800 15px Nunito, system-ui, sans-serif";
          ctx.fillText(label, x + 6, y + 1);
        }
        if (!lugn) {
          ctx.font = "900 12px Nunito, system-ui, sans-serif";
          ctx.fillStyle = "#3a2a00";
          const m = `×${1 + (pl.stars ?? 0)}`;
          const mw = ctx.measureText(m).width + 10;
          ctx.fillStyle = "#ffd84a";
          ctx.beginPath();
          ctx.roundRect(x - mw / 2, y + 14, mw, 18, 9);
          ctx.fill();
          ctx.fillStyle = "#3a2a00";
          ctx.fillText(m, x, y + 23.5);
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [lugn]);

  const gates = view.players.reduce((a, x) => a + (x.wave ?? 0), 0);

  return (
    <div className={p.wrap} style={{ background: "#e6eff5" }}>
      <canvas ref={canvasRef} className={p.map} style={{ imageRendering: "pixelated" }} aria-label="Störtlopp där varje elev åker i en egen bana" role="img" />
      <div className={p.topLeft}>
        <span className={p.time} role="timer" aria-label="Tid kvar">
          {remaining}
        </span>
        <span className={p.join}>{joinText}</span>
      </div>
      <aside className={p.board} aria-label="Klassen" style={{ width: "min(300px, 28vw)" }}>
        <div className={p.boardHead}>Klassen tillsammans</div>
        <div className={p.classTotal}>
          <span>{gates.toLocaleString("sv-SE")}</span>
          <small>portar avklarade</small>
        </div>
        <div className={p.foot}>{view.classCorrect} rätta svar i kunskapsportarna</div>
      </aside>
    </div>
  );
}

function drawBg(bw: number, bh: number) {
  const c = document.createElement("canvas");
  c.width = bw;
  c.height = bh;
  const g = c.getContext("2d")!;
  const horizon = Math.round(bh * 0.26);
  const sky = ["#9fcdea", "#b5d9ef", "#cbe5f4", "#def0f9"];
  for (let y = 0; y < horizon; y++) {
    g.fillStyle = sky[Math.min(3, Math.floor((y / horizon) * 4))];
    g.fillRect(0, y, bw, 1);
  }
  // Fjälltoppar
  for (let x = 0; x < bw; x++) {
    const h1 = horizon * (0.55 + 0.25 * Math.sin(x * 0.012 + 1) + 0.12 * Math.sin(x * 0.041));
    const top = Math.round(horizon - h1);
    for (let y = Math.max(0, top); y < horizon; y++) {
      const d = y - top;
      g.fillStyle = d < 4 ? "#ffffff" : d < 10 ? "#e3eef5" : "#c3d7e4";
      if (d >= 10 && (x + y) % 7 === 0) g.fillStyle = "#b2cadb";
      g.fillRect(x, y, 1, 1);
    }
  }
  // Skog vid horisonten
  for (let i = 0; i < Math.floor(bw / 5); i++) {
    const x = Math.floor(hash(i, 3) * bw);
    const h = 5 + Math.floor(hash(i, 4) * 7);
    for (let k = 0; k < h; k++) {
      const w = Math.round(k / 3);
      g.fillStyle = k % 3 === 0 ? "#1f4b3c" : "#2a5f4a";
      g.fillRect(x - w, horizon - h + k, w * 2 + 1, 1);
    }
  }
  g.fillStyle = "#f6fafc";
  g.fillRect(0, horizon, bw, bh - horizon);
  return c;
}
