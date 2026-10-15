"use client";

import { useEffect, useRef } from "react";
import { onScreen } from "@/lib/visible";
import { shoot, sweep } from "@/lib/game/penalty";
import { PenaltyRenderer, type Flight } from "./render";

/** Liten levande förhandsvisning av Straffar: siktar och skjuter i en slinga. */
export default function PenaltyPreview({ className }: { className?: string }) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const el = wrap.current!;
    const vis = onScreen(el);
    const r = new PenaltyRenderer(canvas.current!);
    let drawn = false;
    const fit = () => {
      r.resize(el.clientWidth, el.clientHeight);
      drawn = false;
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let last = performance.now();
    let cycle = 0;
    let flight: Flight | null = null;
    let u = 0;
    let cheer = 0;
    let n = 0;
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!vis.visible && drawn) {
        raf = requestAnimationFrame(loop);
        return;
      }
      if (!reduce) cycle += dt;
      let aim: { u: number; v: number | null } | null = null;
      if (cycle < 1.2) aim = { u: sweep(cycle, "standard", "u"), v: null };
      else if (cycle < 2) {
        if (!u) u = n % 2 ? 0.82 : -0.8;
        aim = { u, v: sweep(cycle - 1.2, "standard", "v") };
      } else if (!flight) {
        flight = { shot: shoot(u, 0.78, 2, () => (n % 3 === 2 ? 0.9 : 0.1), "standard"), t: 0 };
        n++;
      }
      if (flight) {
        flight.t += dt;
        if (flight.t > 0.5 && flight.shot.result === "goal" && cheer <= 0) cheer = 2;
        if (flight.t > 2.2) {
          flight = null;
          cycle = 0;
          u = 0;
        }
      }
      cheer = Math.max(0, cheer - dt);
      r.draw({ reducedMotion: reduce, kit: "#2f7fc1", shirt: "#e0483b", aim, flight, cheer }, reduce ? 0 : dt);
      drawn = true;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      vis.stop();
    };
  }, []);
  return (
    <div ref={wrap} className={className} style={{ borderRadius: 16, overflow: "hidden", aspectRatio: "3 / 2", background: "#232c36" }} aria-hidden="true">
      <canvas ref={canvas} style={{ display: "block", imageRendering: "pixelated" }} />
    </div>
  );
}
