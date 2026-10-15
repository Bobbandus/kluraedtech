"use client";

import { useEffect, useRef, useState } from "react";
import { ranked } from "@/lib/game/engine";
import { FISH, FISH_ORDER, type FishKind } from "@/lib/game/fishing";
import type { HostView } from "@/lib/rooms/types";
import { fishSprite, fisherSprite } from "./sprites";
import { FishIcon } from "./FishGame";
import p from "../chase/projector.module.css";
import s from "./fishing.module.css";

const COATS = ["#d9483b", "#2f7fc1", "#e8a317", "#3f9a5a", "#8a4fc0", "#e0607e", "#1f8f8a", "#c46a2c"];
const HATS = ["#2f7fc1", "#d9483b", "#f2c230", "#e0607e", "#3f9a5a", "#1b2422"];
const PIX = 3;

function hash(a: number, b: number) {
  const n = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

interface Swimmer {
  kind: FishKind;
  x: number;
  y: number;
  dir: 1 | -1;
  speed: number;
}

interface Pop {
  id: string;
  text: string;
  big: boolean;
  t: number;
}

/**
 * Projektorvyn för Isfiske: hela klassen sitter vid sina hål på isen,
 * fiskar simmar under och stora fångster syns direkt.
 */
export default function FishProjector({ view, remaining, joinText }: { view: HostView; remaining: string; joinText: React.ReactNode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewRef = useRef(view);
  viewRef.current = view;
  const lugn = view.settings.energy === "lugn";
  const pops = useRef<Pop[]>([]);
  const prev = useRef(new Map<string, { fish: number; score: number }>());
  const [feed, setFeed] = useState<{ key: string; name: string; kind: FishKind }[]>([]);

  // Upptäck nya fångster genom att jämföra med förra vyn
  useEffect(() => {
    const now = performance.now();
    const add: { key: string; name: string; kind: FishKind }[] = [];
    for (const pl of view.players) {
      const before = prev.current.get(pl.id);
      const fish = pl.fish ?? 0;
      if (before && fish > before.fish) {
        const gained = pl.score - before.score;
        pops.current.push({ id: pl.id, text: `+${gained}`, big: gained >= 50, t: now });
        const kind = (pl.last ?? pl.best) as FishKind | undefined;
        if (gained >= 50 && kind && !lugn) add.push({ key: `${pl.id}-${fish}`, name: pl.name, kind });
      }
      prev.current.set(pl.id, { fish, score: pl.score });
    }
    if (add.length) setFeed((f) => [...add, ...f].slice(0, 4));
  }, [view, lugn]);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const buf = document.createElement("canvas");
    const b = buf.getContext("2d")!;
    let bg: HTMLCanvasElement | null = null;
    let bw = 0;
    let bh = 0;
    let dpr = 1;
    const fishes: Swimmer[] = [];
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
      fishes.length = 0;
      const ice = Math.round(bh * 0.44);
      const kinds = FISH_ORDER.filter((k) => k !== "guld");
      for (let i = 0; i < 18; i++) {
        const kind = kinds[i % kinds.length];
        const [a, z] = FISH[kind].depth;
        const water = bh - ice - 12;
        fishes.push({ kind, x: hash(i, 1) * bw, y: ice + 8 + ((a + (z - a) * hash(i, 2)) / 358) * water, dir: hash(i, 3) > 0.5 ? 1 : -1, speed: FISH[kind].speed * 0.35 });
      }
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
      const ice = Math.round(bh * 0.44);
      // Fiskar under isen
      const frame = Math.floor(time * 4) % 2;
      for (const f of fishes) {
        f.x += f.dir * f.speed * dt;
        if (f.x < -30) f.dir = 1;
        if (f.x > bw + 30) f.dir = -1;
        const spr = fishSprite(f.kind, frame);
        b.save();
        b.translate(Math.round(f.x), Math.round(f.y + Math.sin(time + f.x * 0.05) * 1.5));
        if (f.dir === -1) b.scale(-1, 1);
        b.drawImage(spr, -Math.round(spr.width / 2), -Math.round(spr.height / 2));
        b.restore();
      }
      // Fiskarna på isen
      const usable = bw * 0.68;
      const n = v.players.length;
      const perRow = Math.max(1, Math.min(n, Math.floor(usable / 34)));
      const rows = Math.ceil(n / perRow);
      const iceH = ice - Math.round(bh * 0.24) - 10;
      const rowGap = Math.max(14, Math.min(26, iceH / Math.max(1, rows)));
      const slots: { x: number; y: number; id: string }[] = [];
      v.players.forEach((pl, i) => {
        const row = Math.floor(i / perRow);
        const col = i % perRow;
        const inRow = Math.min(perRow, n - row * perRow);
        const gap = usable / Math.max(1, inRow);
        const x = Math.round(14 + gap * (col + 0.5) + (row % 2 ? gap * 0.25 : 0));
        const y = Math.round(ice - 6 - (rows - 1 - row) * rowGap);
        slots.push({ x, y, id: pl.id });
        // Hål
        b.fillStyle = "#bfe0ee";
        b.fillRect(x + 1, y + 1, 11, 3);
        b.fillStyle = "#1d4f6a";
        b.fillRect(x + 2, y + 2, 9, 2);
        const spr = fisherSprite(COATS[i % COATS.length], HATS[(i * 7) % HATS.length]);
        b.drawImage(spr, x - 14, y - spr.height + 4);
        // Spö
        b.fillStyle = "#6b4a2c";
        for (let k = 0; k < 7; k++) b.fillRect(x - 3 + k, y - 9 + Math.floor(k / 2) - (k > 4 ? 1 : 0), 1, 1);
        // Lina ner i hålet
        b.fillStyle = "rgba(240,240,240,0.8)";
        for (let k = 0; k < 7; k++) b.fillRect(x + 4, y - 8 + k, 1, 1);
      });

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(buf, 0, 0, bw * PIX * dpr, bh * PIX * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Namn och poängpoppar
      const order = ranked(v.players);
      const rankOf = new Map(order.map((x, i) => [x.id, i + 1]));
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      for (const sl of slots) {
        const pl = v.players.find((x) => x.id === sl.id)!;
        const rk = rankOf.get(sl.id) ?? 99;
        const show = lugn ? false : n <= 12 || rk <= 8;
        if (show) {
          ctx.font = "800 13px Nunito, system-ui, sans-serif";
          const label = pl.name;
          const w = ctx.measureText(label).width + 14;
          const lx = sl.x * PIX;
          const ly = (sl.y - 21) * PIX;
          ctx.fillStyle = rk <= 3 ? ["#f2c230", "#dfe5e8", "#e0a370"][rk - 1] : "rgba(255,255,255,0.92)";
          ctx.beginPath();
          ctx.roundRect(lx - w / 2, ly - 10, w, 20, 10);
          ctx.fill();
          ctx.fillStyle = "#1d2326";
          ctx.fillText(label, lx, ly + 0.5);
        }
      }
      const tnow = performance.now();
      pops.current = pops.current.filter((x) => tnow - x.t < 2200);
      for (const pp of pops.current) {
        const sl = slots.find((x) => x.id === pp.id);
        if (!sl) continue;
        const age = (tnow - pp.t) / 2200;
        ctx.globalAlpha = Math.min(1, (1 - age) * 2);
        ctx.font = `900 ${pp.big ? 26 : 18}px Nunito, system-ui, sans-serif`;
        const x = sl.x * PIX;
        const y = (sl.y - 36) * PIX - age * 50;
        ctx.lineWidth = 5;
        ctx.strokeStyle = "rgba(10,30,40,0.85)";
        ctx.strokeText(pp.text, x, y);
        ctx.fillStyle = pp.big ? "#ffd84a" : "#ffffff";
        ctx.fillText(pp.text, x, y);
        ctx.globalAlpha = 1;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [lugn]);

  const order = ranked(view.players);
  const classFish = view.players.reduce((a, x) => a + (x.fish ?? 0), 0);

  return (
    <div className={p.wrap} style={{ background: "#0d2b42" }}>
      <canvas ref={canvasRef} className={p.map} style={{ imageRendering: "pixelated" }} aria-label="Isen med alla elever som fiskar" role="img" />
      <div className={p.topLeft}>
        <span className={p.time} role="timer" aria-label="Tid kvar">
          {remaining}
        </span>
        <span className={p.join}>{joinText}</span>
      </div>
      <aside className={p.board} aria-label={lugn ? "Klassens fångst" : "Flest poäng"}>
        <div className={p.boardHead}>
          <FishIcon kind="abborre" size={30} /> {lugn ? "Klassen tillsammans" : "Flest poäng"}
        </div>
        {lugn ? (
          <div className={p.classTotal}>
            <span>{classFish}</span>
            <small>fiskar upp ur sjön</small>
          </div>
        ) : (
          <ol className={p.list}>
            {order.slice(0, 8).map((x, i) => (
              <li key={x.id} className={i < 3 ? p.podium : ""}>
                <span className={`${p.rank} ${i === 0 ? p.gold : i === 1 ? p.silver : i === 2 ? p.bronze : ""}`}>{i + 1}</span>
                <span className={p.name}>{x.name}</span>
                {x.best ? <FishIcon kind={x.best as FishKind} size={30} /> : null}
                <span className={p.points}>{x.score.toLocaleString("sv-SE")}</span>
              </li>
            ))}
          </ol>
        )}
        <div className={p.foot}>
          {classFish} fiskar · {view.classCorrect} rätta svar
        </div>
      </aside>
      {feed.length > 0 && (
        <div className={s.feed} aria-live="polite">
          {feed.map((f) => (
            <div key={f.key} className={s.feedItem}>
              <FishIcon kind={f.kind} size={34} />
              <span>
                <strong>{f.name}</strong> fick {f.kind === "guld" ? "Guldfisken!" : `en ${FISH[f.kind].name.toLowerCase()}!`}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function drawBg(bw: number, bh: number) {
  const c = document.createElement("canvas");
  c.width = bw;
  c.height = bh;
  const g = c.getContext("2d")!;
  const ice = Math.round(bh * 0.44);
  const shore = Math.round(bh * 0.24);
  const sky = ["#a9d4ee", "#bcdff2", "#cfe8f6", "#e1f1fa"];
  for (let y = 0; y < shore; y++) {
    const band = Math.min(3, Math.floor((y / shore) * 4));
    g.fillStyle = sky[band];
    g.fillRect(0, y, bw, 1);
  }
  for (let x = 0; x < bw; x++) {
    const hgt = shore * 0.45 + Math.sin(x * 0.02) * shore * 0.15 + Math.sin(x * 0.07 + 1) * 4;
    const top = Math.round(shore - hgt);
    for (let y = top; y < shore + 2; y++) {
      g.fillStyle = y - top < 3 ? "#f6fbff" : y - top < 7 ? "#dbe9f2" : "#bcd3e2";
      g.fillRect(x, y, 1, 1);
    }
  }
  for (let i = 0; i < Math.floor(bw / 6); i++) {
    const x = Math.floor(hash(i, 3) * bw);
    const hgt = 8 + Math.floor(hash(i, 5) * 10);
    const base = shore + 3;
    for (let k = 0; k < hgt; k++) {
      const w = Math.round(k / 3);
      g.fillStyle = k % 3 === 0 ? "#1f4b3c" : "#2a5f4a";
      g.fillRect(x - w, base - hgt + k, w * 2 + 1, 1);
    }
  }
  for (let y = shore + 3; y < ice; y++)
    for (let x = 0; x < bw; x++) {
      g.fillStyle = y >= ice - 3 ? (y >= ice - 1 ? "#7fbfd8" : "#a9d8ea") : hash(x, y) > 0.94 ? "#dbe8f0" : "#f4f9fc";
      g.fillRect(x, y, 1, 1);
    }
  const bands = ["#58b3d3", "#3f97bf", "#2f7ca6", "#23628a", "#194b6d", "#123a56", "#0d2b42"];
  const bandH = (bh - ice) / bands.length;
  for (let y = ice; y < bh; y++) {
    const t = (y - ice) / bandH;
    const band = Math.min(bands.length - 1, Math.floor(t));
    g.fillStyle = bands[band];
    g.fillRect(0, y, bw, 1);
    if (t - band > 0.75 && band < bands.length - 1) {
      g.fillStyle = bands[band + 1];
      for (let x = y % 2; x < bw; x += 2) g.fillRect(x, y, 1, 1);
    }
  }
  for (let x = 0; x < bw; x++) {
    const top = Math.round(bh - 5 + Math.sin(x * 0.05) * 2);
    for (let y = top; y < bh; y++) {
      g.fillStyle = y === top ? "#7a6a45" : "#5b4d31";
      g.fillRect(x, y, 1, 1);
    }
  }
  for (let i = 0; i < Math.floor(bw / 10); i++) {
    const x = Math.floor(hash(i, 31) * bw);
    const hgt = 6 + Math.floor(hash(i, 32) * 16);
    for (let k = 0; k < hgt; k++) {
      g.fillStyle = k % 4 === 0 ? "#2f6b3e" : "#3f8a4e";
      g.fillRect(x + Math.round(Math.sin(k * 0.4 + i) * (k / hgt) * 2), bh - 4 - k, 1, 1);
    }
  }
  return c;
}
