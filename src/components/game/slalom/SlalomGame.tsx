"use client";

import { useEffect, useRef, useState } from "react";
import { answer as answerSlalom, createSlalom, multiplier, resume, step, MAX_LEVEL, type SlalomState } from "@/lib/game/slalom";
import { sfx, useSound } from "@/lib/sound";
import { Icon } from "@/components/icons";
import type { ActResult, PlayerAction, PlayerView } from "@/lib/rooms/types";
import { useStore } from "@/lib/store";
import { QuestionBar } from "../chase/ChaseGame";
import { SlalomRenderer } from "./render";
import c from "../chase/chase.module.css";
import s from "./slalom.module.css";

function fmtTime(ms: number) {
  const sec = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
}

const JACKETS = ["#e0483b", "#2f7fc1", "#f2b705", "#3f9a5a", "#8a4fc0", "#e0607e", "#1f8f8a", "#ff7a1a"];
const HELMETS = ["#1b2226", "#f4f1e8", "#2f7fc1", "#e0483b", "#f2b705"];
function pick<T>(arr: T[], key: string, salt: number) {
  let h = salt;
  for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return arr[h % arr.length];
}

export default function SlalomGame({ view, act, clockOffset }: { view: PlayerView; act: (a: PlayerAction) => Promise<ActResult>; clockOffset: number }) {
  const reduced = useStore((x) => x.prefs.reducedMotion);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const game = useRef<SlalomState>(createSlalom(Math.floor(Math.random() * 1e6), view.settings.energy));
  const [, setFrame] = useState(0);
  const [asking, setAsking] = useState(false);
  const [count, setCount] = useState(3);
  const [hint, setHint] = useState(true);
  const [touch, setTouch] = useState(false);
  const [soundOn, toggleSound] = useSound();
  const ended = view.phase === "ended";
  const paused = view.paused;
  const st = useRef({ asking, count, ended, paused, reduced });
  st.current = { asking, count, ended, paused, reduced };
  const look = useRef({ jacket: pick(JACKETS, view.you.skinId, 5), helmet: pick(HELMETS, view.you.name, 9) });
  const keys = useRef(new Set<string>());
  const pointer = useRef<number | null>(null);

  useEffect(() => {
    setTouch(window.matchMedia("(pointer: coarse)").matches);
    const id = setInterval(() => setCount((n) => (n > -1 ? n - 1 : n)), 800);
    const h = setTimeout(() => setHint(false), 9000);
    return () => {
      clearInterval(id);
      clearTimeout(h);
    };
  }, []);
  useEffect(() => {
    if (count > 0) sfx("tick");
    else if (count === 0) sfx("go");
  }, [count]);

  /* ---------- Spel-loop ---------- */
  useEffect(() => {
    const canvas = canvasRef.current!;
    const shell = shellRef.current!;
    const r = new SlalomRenderer(canvas);
    const fit = () => r.resize(shell.clientWidth, shell.clientHeight);
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(shell);
    let raf = 0;
    let last = performance.now();
    let uiTick = 0;
    let lastSound = -1;
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const g = game.current;
      const u = st.current;
      const k = keys.current;
      let steer = 0;
      if (k.has("ArrowLeft") || k.has("a")) steer -= 1;
      if (k.has("ArrowRight") || k.has("d")) steer += 1;
      if (pointer.current !== null) steer = pointer.current;
      g.steer = steer;
      g.tuck = k.has("ArrowDown") || k.has("s");
      const running = !u.ended && !u.paused && u.count <= 0;
      if (running) step(g, dt);
      if (g.phase === "question" && !u.asking) setAsking(true);
      for (const e of g.events) {
        if (e.t <= lastSound) continue;
        if (e.type === "gate") sfx(e.combo > 0 && e.combo % 5 === 0 ? "coin" : "gate");
        else if (e.type === "miss") sfx("leak");
        else if (e.type === "crash") sfx("crash");
        else if (e.type === "jump") sfx("ghost");
        else if (e.type === "land") sfx("escape");
        else if (e.type === "quiz") sfx("star");
      }
      if (g.events.length) lastSound = g.events[g.events.length - 1].t;
      r.draw(g, { reducedMotion: u.reduced, jacket: look.current.jacket, helmet: look.current.helmet }, running ? dt : 0);
      uiTick += dt;
      if (uiTick > 0.15) {
        uiTick = 0;
        setFrame((f) => f + 1);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    const down = (e: KeyboardEvent) => {
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " "].includes(e.key)) e.preventDefault();
      keys.current.add(e.key.length === 1 ? e.key.toLowerCase() : e.key);
    };
    const up = (e: KeyboardEvent) => keys.current.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  // Rapportera läget
  useEffect(() => {
    const iv = setInterval(() => {
      const g = game.current;
      act({ type: "fjall_report", state: { wave: g.gates, hp: 0, score: Math.floor(g.score), downed: g.phase === "fallen", stars: g.level } });
    }, 1500);
    return () => clearInterval(iv);
  }, [act]);

  const steerFrom = (e: React.PointerEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const rel = (e.clientX - rect.left - rect.width / 2) / (rect.width * 0.22);
    pointer.current = Math.max(-1, Math.min(1, rel));
  };

  const g = game.current;
  const remaining = view.endsAt ? view.endsAt - (Date.now() + clockOffset) : 0;
  const mult = multiplier(g.level);
  const rank = view.you.rank;
  const toQuiz = g.gatesList.filter((x) => x.passed === null).findIndex((x) => x.quiz) + 1;

  return (
    <div ref={shellRef} className={`${c.shell} ${s.shell} ${asking ? c.asking : ""}`}>
      <canvas
        ref={canvasRef}
        className={c.canvas}
        style={{ imageRendering: "pixelated" }}
        onPointerDown={(e) => {
          (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
          steerFrom(e);
        }}
        onPointerMove={(e) => {
          if (pointer.current !== null) steerFrom(e);
        }}
        onPointerUp={() => (pointer.current = null)}
        onPointerCancel={() => (pointer.current = null)}
        role="img"
        aria-label="Fjällsluttning sedd uppifrån. Styr med piltangenterna eller genom att hålla på vänster eller höger sida av skärmen."
      />

      <div className={s.scoreHud} aria-live="polite" aria-label={`${Math.floor(g.score)} poäng, multiplikator ${mult}`}>
        <span className={s.score}>{Math.floor(g.score).toLocaleString("sv-SE")}</span>
        <span className={s.multRow}>
          <span className={s.mult} key={g.level}>
            ×{mult}
          </span>
          <span className={s.levels} aria-hidden="true">
            {Array.from({ length: MAX_LEVEL }, (_, i) => (
              <i key={i} className={i < g.level ? s.on : ""} />
            ))}
          </span>
        </span>
      </div>

      <div className={c.topRight}>
        {rank !== undefined && rank > 0 && (
          <span className={`${c.rank} ${rank === 1 ? c.gold : rank === 2 ? c.silver : rank === 3 ? c.bronze : ""}`} title="Din placering">
            {rank <= 3 ? <Icon name="trophy" size={15} /> : "#"}
            {rank}
          </span>
        )}
        <span className={`${c.timer} ${remaining < 30_000 ? c.timerLow : ""}`} role="timer" aria-label="Tid kvar">
          {fmtTime(remaining)}
        </span>
        <button className={c.iconBtn} onClick={toggleSound} aria-label={soundOn ? "Stäng av ljud" : "Sätt på ljud"} aria-pressed={soundOn}>
          <Icon name={soundOn ? "volume" : "mute"} size={18} />
        </button>
      </div>

      <div className={s.chips}>
        {g.combo >= 3 && <span className={`${s.chip} ${s.chipHot}`}>{g.combo} portar i rad</span>}
        <span className={s.chip}>
          <span className={s.qDot} aria-hidden="true">?</span>
          {toQuiz <= 1 ? "Kunskapsport nu!" : `Kunskapsport om ${toQuiz} portar`}
        </span>
      </div>

      {count > -1 && count <= 3 && (
        <div className={c.countdown} key={count} aria-live="assertive">
          {count > 0 ? count : "Åk!"}
        </div>
      )}

      {hint && !asking && (
        <div className={c.hint}>
          {touch ? (
            <>Håll på vänster eller höger sida för att svänga</>
          ) : (
            <>
              <kbd>←</kbd> <kbd>→</kbd> svänga <span className={c.sep} /> <kbd>↓</kbd> ducka för mer fart
            </>
          )}
        </div>
      )}

      {paused && !ended && (
        <div className={c.paused} role="status">
          Pausat av läraren
        </div>
      )}

      {asking && (
        <QuestionBar
          act={act}
          disabled={ended}
          wrongText="Multiplikatorn sjönk den här gången."
          onResult={(correct) => {
            answerSlalom(game.current, correct);
            sfx(correct ? "correct" : "wrong");
          }}
          onClose={() => {
            resume(game.current);
            setAsking(false);
          }}
        />
      )}
    </div>
  );
}
