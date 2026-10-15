"use client";

import { useEffect, useRef } from "react";
import { onScreen } from "@/lib/visible";
import { FISH, MAX_BAIT, createFishing, setTarget, step, type FishingState } from "@/lib/game/fishing";
import { FishRenderer } from "./render";

/** Enkel autopilot: siktar på den värdefullaste fisken inom räckhåll. */
function autopilot(g: FishingState, t: number) {
  g.bait = MAX_BAIT;
  if (g.reeling) return;
  let best: { x: number; y: number; v: number } | null = null;
  for (const f of g.fish) {
    if (f.kind === "kanga" || f.x < 20 || f.x > 620) continue;
    const v = FISH[f.kind].value - Math.hypot(f.x - g.hx, f.y - g.hy) * 0.15;
    if (!best || v > best.v) best = { x: f.x, y: f.y, v };
  }
  if (best) setTarget(g, best.x + Math.sin(t * 2) * 6, best.y);
}

/** Liten levande förhandsvisning av Isfiske (används i lägesvalet). */
export default function FishPreview({ className }: { className?: string }) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const g = createFishing(4242);
    g.correct = 9;
    const el = wrap.current!;
    const vis = onScreen(el);
    const r = new FishRenderer(canvas.current!);
    const fit = () => r.resize(el.clientWidth);
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    for (let i = 0; i < 60; i++) {
      autopilot(g, i / 30);
      step(g, 1 / 30);
    }
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!vis.visible) {
        raf = requestAnimationFrame(loop);
        return;
      }
      if (!reduce) {
        autopilot(g, now / 1000);
        step(g, dt);
      }
      r.draw(g, { reducedMotion: reduce, coat: "#d9483b", hat: "#2f7fc1" }, reduce ? 0 : dt);
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
    <div ref={wrap} className={className} style={{ borderRadius: 16, overflow: "hidden", aspectRatio: "3 / 2", background: "#0d2b42" }} aria-hidden="true">
      <canvas ref={canvas} style={{ display: "block", marginTop: "-6%", imageRendering: "pixelated" }} />
    </div>
  );
}
