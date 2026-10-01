"use client";

import { useEffect, useRef } from "react";
import { answer, autopilot, createChase, step } from "@/lib/game/chase";
import { ChaseRenderer } from "./render";

/** Liten levande förhandsvisning av Biljakt (används i lägesvalet). */
export default function ChasePreview({ className }: { className?: string }) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const st = createChase(11, "standard", 4242);
    answer(st, true);
    answer(st, true);
    st.heat = 0;
    for (let i = 0; i < 240; i++) {
      autopilot(st, 0.9);
      step(st, 1 / 30);
    }
    const el = wrap.current!;
    const r = new ChaseRenderer(canvas.current!);
    const fit = () => r.resize(el.clientWidth, Math.round((el.clientWidth * 2) / 3));
    fit();
    r.snapCamera(st);
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!reduce) {
        autopilot(st, 0.9);
        step(st, dt);
        st.heat = Math.min(st.heat, 0.9);
        if (st.phase === "question") st.phase = "drive";
      }
      r.draw(st, { reducedMotion: true, focus: 0 }, reduce ? 0 : dt);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);
  return (
    <div ref={wrap} className={className} style={{ borderRadius: 16, overflow: "hidden", aspectRatio: "3 / 2", background: "#3c6e3e" }} aria-hidden="true">
      <canvas ref={canvas} style={{ display: "block" }} />
    </div>
  );
}
