"use client";

import { useEffect, useRef } from "react";
import { build, createDefense, step, upgrade } from "@/lib/game/defense";
import { DefenseRenderer } from "./render";

/** Liten levande förhandsvisning av Fjällförsvar (används i lägesvalet). */
export default function DefensePreview({ className }: { className?: string }) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const st = createDefense(7);
    st.wood = 9999;
    build(st, "bage", 3, 3);
    build(st, "snoboll", 6, 4);
    build(st, "lykta", 7, 1);
    build(st, "bage", 9, 5);
    build(st, "bastu", 3, 6);
    upgrade(st, st.towers[0].id);
    for (let i = 0; i < 200; i++) step(st, 0.05);
    st.events = [];
    const el = wrap.current!;
    const r = new DefenseRenderer(canvas.current!);
    const fit = () => r.resize(el.clientWidth);
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (!reduce) step(st, dt);
      if (st.hp < 10) st.hp = 20;
      r.draw(st, { hover: null, placing: null, selectedTowerId: null, reducedMotion: reduce }, dt);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);
  return (
    <div ref={wrap} className={className} style={{ borderRadius: 16, overflow: "hidden" }} aria-hidden="true">
      <canvas ref={canvas} style={{ display: "block" }} />
    </div>
  );
}
