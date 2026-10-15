"use client";

import { useEffect, useRef } from "react";
import { createSlalom, resume, step, answer, type SlalomState } from "@/lib/game/slalom";
import { SlalomRenderer } from "./render";

/** Autopilot: styr mot nästa port och väjer för hinder. */
function autopilot(g: SlalomState) {
  const next = g.gatesList.find((x) => x.y > g.y + 2);
  let tx = next ? next.x : g.x;
  for (const o of g.obstacles) {
    if (o.kind === "mogul" || o.kind === "jump") continue;
    const dy = o.y - g.y;
    if (dy > 0 && dy < 40 && Math.abs(o.x - g.x) < 14) tx = g.x + (o.x > g.x ? -30 : 30);
  }
  g.steer = Math.max(-1, Math.min(1, (tx - g.x) / 18));
  if (g.phase === "question") {
    answer(g, true);
    resume(g);
  }
}

/** Liten levande förhandsvisning av Slalom (används i lägesvalet). */
export default function SlalomPreview({ className }: { className?: string }) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const g = createSlalom(777);
    for (let i = 0; i < 120; i++) {
      autopilot(g);
      step(g, 1 / 30);
    }
    const el = wrap.current!;
    const r = new SlalomRenderer(canvas.current!);
    const fit = () => r.resize(el.clientWidth, el.clientHeight);
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!reduce) {
        autopilot(g);
        step(g, dt);
      }
      r.draw(g, { reducedMotion: reduce, jacket: "#e0483b", helmet: "#1b2226" }, reduce ? 0 : dt);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);
  return (
    <div ref={wrap} className={className} style={{ borderRadius: 16, overflow: "hidden", aspectRatio: "3 / 2", background: "#e6eff5" }} aria-hidden="true">
      <canvas ref={canvas} style={{ display: "block", imageRendering: "pixelated" }} />
    </div>
  );
}
