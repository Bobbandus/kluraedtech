"use client";

import { useEffect, useRef, useState } from "react";
import { ranked } from "@/lib/game/engine";
import type { HostView } from "@/lib/rooms/types";
import { PenaltyRenderer, type Flight } from "./render";
import p from "../chase/projector.module.css";
import s from "./penalty.module.css";

/**
 * Projektorn för Straffar: arenan visar klassens mål i repris, med namn,
 * och en topplista vid sidan.
 */
export default function PenaltyProjector({ view, remaining, joinText }: { view: HostView; remaining: string; joinText: React.ReactNode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lugn = view.settings.energy === "lugn";
  const queue = useRef<{ name: string; corner: boolean }[]>([]);
  const prev = useRef(new Map<string, { goals: number; score: number }>());
  const [showing, setShowing] = useState<{ name: string; key: number } | null>(null);
  const showRef = useRef(setShowing);
  showRef.current = setShowing;

  // Nya mål köas för repris
  useEffect(() => {
    for (const pl of view.players) {
      const b = prev.current.get(pl.id);
      const goals = pl.wave ?? 0;
      if (b && goals > b.goals && queue.current.length < 6) queue.current.push({ name: pl.name, corner: pl.score - b.score >= 150 });
      prev.current.set(pl.id, { goals, score: pl.score });
    }
  }, [view]);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const r = new PenaltyRenderer(canvas);
    const fit = () => r.resize(canvas.clientWidth, canvas.clientHeight);
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(canvas);
    let raf = 0;
    let last = performance.now();
    let flight: Flight | null = null;
    let cheer = 0;
    let idle = 0;
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!flight) {
        idle += dt;
        const next = queue.current.shift();
        if (next && idle > 0.4) {
          const side = Math.random() < 0.5 ? -1 : 1;
          const u = side * (next.corner ? 0.8 : 0.3 + Math.random() * 0.4);
          const v = next.corner ? 0.78 : 0.2 + Math.random() * 0.4;
          flight = { shot: { u, v, keeper: (side === 1 ? -1 : 1) as -1 | 1, result: "goal", points: 0 }, t: 0 };
          showRef.current({ name: next.name, key: now });
          idle = 0;
        }
      } else {
        flight.t += dt;
        if (flight.t > 0.5 && cheer <= 0) cheer = 1.6;
        if (flight.t > 2) {
          flight = null;
          showRef.current(null);
        }
      }
      cheer = Math.max(0, cheer - dt);
      r.draw({ reducedMotion: false, kit: "#2f7fc1", shirt: "#e0483b", aim: null, flight, cheer }, dt);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  const order = ranked(view.players);
  const goals = view.players.reduce((a, x) => a + (x.wave ?? 0), 0);

  return (
    <div className={p.wrap} style={{ background: "#232c36" }}>
      <canvas ref={canvasRef} className={p.map} style={{ imageRendering: "pixelated" }} role="img" aria-label="Arenan med klassens mål i repris" />
      <div className={p.topLeft}>
        <span className={p.time} role="timer" aria-label="Tid kvar">
          {remaining}
        </span>
        <span className={p.join}>{joinText}</span>
      </div>
      <aside className={p.board} aria-label={lugn ? "Klassens mål" : "Flest poäng"}>
        <div className={p.boardHead}>{lugn ? "Klassen tillsammans" : "Flest poäng"}</div>
        {lugn ? (
          <div className={p.classTotal}>
            <span>{goals}</span>
            <small>mål tillsammans</small>
          </div>
        ) : (
          <ol className={p.list}>
            {order.slice(0, 8).map((x, i) => (
              <li key={x.id} className={i < 3 ? p.podium : ""}>
                <span className={`${p.rank} ${i === 0 ? p.gold : i === 1 ? p.silver : i === 2 ? p.bronze : ""}`}>{i + 1}</span>
                <span className={p.name}>{x.name}</span>
                <span className={p.mult}>{x.wave ?? 0} mål</span>
                <span className={p.points}>{x.score.toLocaleString("sv-SE")}</span>
              </li>
            ))}
          </ol>
        )}
        <div className={p.foot}>
          {goals} mål · {view.classCorrect} rätta svar
        </div>
      </aside>
      {showing && (
        <div key={showing.key} className={`${s.banner} ${s.good}`} style={{ top: "30%" }}>
          MÅL!
          <small style={{ color: "#fff" }}>{lugn ? "Snyggt!" : showing.name}</small>
        </div>
      )}
    </div>
  );
}
