"use client";

import { useEffect, useRef, useState } from "react";
import { RESULT_TEXT, multiplier, shoot, sweep, type Shot } from "@/lib/game/penalty";
import { sfx, useSound } from "@/lib/sound";
import { Icon } from "@/components/icons";
import type { ActResult, PlayerAction, PlayerView } from "@/lib/rooms/types";
import { useStore } from "@/lib/store";
import { QuestionBar } from "../chase/ChaseGame";
import { PenaltyRenderer, type Flight } from "./render";
import c from "../chase/chase.module.css";
import s from "./penalty.module.css";

function fmtTime(ms: number) {
  const sec = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
}

const KITS = ["#2f7fc1", "#e0483b", "#f2b705", "#8a4fc0", "#1f8f8a"];
const SHIRTS = ["#e0483b", "#2f7fc1", "#3f9a5a", "#f2b705", "#e0607e", "#ff7a1a"];
function pick<T>(arr: T[], key: string, salt: number) {
  let h = salt;
  for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return arr[h % arr.length];
}

type Phase = "question" | "aimU" | "aimV" | "flight";

export default function PenaltyGame({ view, act, clockOffset }: { view: PlayerView; act: (a: PlayerAction) => Promise<ActResult>; clockOffset: number }) {
  const reduced = useStore((x) => x.prefs.reducedMotion);
  const energy = view.settings.energy;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<Phase>("question");
  const [qKey, setQKey] = useState(0);
  const [score, setScore] = useState(0);
  const [goals, setGoals] = useState(0);
  const [shots, setShots] = useState(0);
  const [streak, setStreak] = useState(0);
  const [banner, setBanner] = useState<{ text: string; good: boolean; points: number; key: number } | null>(null);
  const [soundOn, toggleSound] = useSound();
  const [intro, setIntro] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setIntro(false), 7000);
    return () => clearTimeout(t);
  }, []);
  const ended = view.phase === "ended";
  const st = useRef({ phase, reduced, u: 0, aimT0: 0, flight: null as Flight | null, cheer: 0, lastCorrect: false, sides: [] as number[] });
  st.current.phase = phase;
  st.current.reduced = reduced;
  const look = useRef({ kit: pick(KITS, view.code, 3), shirt: pick(SHIRTS, view.you.skinId, 11) });
  const stats = useRef({ score: 0, goals: 0, shots: 0, streak: 0 });
  stats.current = { score, goals, shots, streak };

  /* ---------- Rit-loop ---------- */
  useEffect(() => {
    const canvas = canvasRef.current!;
    const shell = shellRef.current!;
    const r = new PenaltyRenderer(canvas);
    const fit = () => r.resize(shell.clientWidth, shell.clientHeight);
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(shell);
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const u = st.current;
      const t = (now - u.aimT0) / 1000;
      let aim: { u: number; v: number | null } | null = null;
      if (u.phase === "aimU") aim = { u: sweep(t, energy, "u"), v: null };
      else if (u.phase === "aimV") aim = { u: u.u, v: sweep(t, energy, "v") };
      if (u.flight) u.flight.t += dt;
      u.cheer = Math.max(0, u.cheer - dt);
      r.draw({ reducedMotion: u.reduced, kit: look.current.kit, shirt: look.current.shirt, aim, flight: u.flight, cheer: u.cheer }, dt);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [energy]);

  // Rapportera läget
  useEffect(() => {
    const iv = setInterval(() => {
      const x = stats.current;
      act({ type: "fjall_report", state: { wave: x.goals, hp: x.shots, score: x.score, downed: false, stars: x.streak } });
    }, 1500);
    return () => clearInterval(iv);
  }, [act]);

  const tap = () => {
    const u = st.current;
    if (ended) return;
    const t = (performance.now() - u.aimT0) / 1000;
    if (u.phase === "aimU") {
      u.u = sweep(t, energy, "u");
      u.aimT0 = performance.now() - 250; // börja höjdmarkören en bit upp
      sfx("click");
      setPhase("aimV");
    } else if (u.phase === "aimV") {
      const v = sweep(t, energy, "v");
      // Senaste skottens sida – målvakten känner igen mönster
      const tendency = u.sides.length ? u.sides.reduce((a, b) => a + b, 0) / u.sides.length : 0;
      const shot: Shot = shoot(u.u, v, stats.current.streak, Math.random, energy, tendency);
      u.sides = [...u.sides.slice(-3), Math.abs(u.u) < 0.25 ? 0 : Math.sign(u.u)];
      u.flight = { shot, t: 0 };
      sfx("shot");
      setPhase("flight");
      setShots((n) => n + 1);
      setTimeout(() => {
        const good = shot.result === "goal";
        sfx(good ? "bigcatch" : shot.result === "save" ? "hit" : "leak");
        if (good) {
          u.cheer = 2;
          setGoals((n) => n + 1);
          setScore((n) => n + shot.points);
        }
        setBanner({ text: RESULT_TEXT[shot.result], good, points: shot.points, key: performance.now() });
      }, 520);
      setTimeout(() => {
        u.flight = null;
        setBanner(null);
        setQKey((k) => k + 1);
        setPhase("question");
      }, 2100);
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === " " || e.key === "Enter") {
        if (st.current.phase === "aimU" || st.current.phase === "aimV") {
          e.preventDefault();
          tap();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const remaining = view.endsAt ? view.endsAt - (Date.now() + clockOffset) : 0;
  const [, force] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => force((n) => n + 1), 500);
    return () => clearInterval(iv);
  }, []);
  const rank = view.you.rank;
  const mult = multiplier(streak);

  return (
    <div ref={shellRef} className={`${c.shell} ${s.shell} ${phase === "question" ? c.asking : ""}`} onPointerDown={phase === "aimU" || phase === "aimV" ? tap : undefined}>
      <canvas ref={canvasRef} className={c.canvas} style={{ imageRendering: "pixelated" }} role="img" aria-label="Straffspark mot en målvakt" />

      <div className={s.hud} aria-live="polite">
        <span className={s.score}>{score.toLocaleString("sv-SE")}</span>
        <span className={s.row}>
          <span className={s.mult} key={streak}>
            ×{mult.toLocaleString("sv-SE")}
          </span>
          <span className={s.goals}>
            {goals} mål på {shots} skott
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
        <button className={c.iconBtn} onPointerDown={(e) => e.stopPropagation()} onClick={toggleSound} aria-label={soundOn ? "Stäng av ljud" : "Sätt på ljud"} aria-pressed={soundOn}>
          <Icon name={soundOn ? "volume" : "mute"} size={18} />
        </button>
      </div>

      {intro && phase === "question" && shots === 0 && (
        <div className={s.intro} role="status">
          <strong>Svara rätt – då får du skjuta en straff!</strong>
          <span>Rätt i rad höjer multiplikatorn. Krysset ger mest poäng.</span>
        </div>
      )}

      {(phase === "aimU" || phase === "aimV") && (
        <div className={s.prompt}>
          <strong>{phase === "aimU" ? "Välj sida" : "Välj höjd"}</strong>
          <span>Tryck {phase === "aimU" ? "när markören är där du vill skjuta" : "igen för att skjuta"} – mellanslag, klick eller tryck på skärmen</span>
        </div>
      )}

      {banner && (
        <div key={banner.key} className={`${s.banner} ${banner.good ? s.good : s.bad}`} role="status">
          {banner.text}
          {banner.good && <small>+{banner.points}</small>}
        </div>
      )}

      {view.paused && !ended && (
        <div className={c.paused} role="status">
          Pausat av läraren
        </div>
      )}

      {phase === "question" && !ended && (
        <QuestionBar
          key={qKey}
          act={act}
          disabled={ended}
          wrongText="Ingen straff den här gången."
          onResult={(correct) => {
            st.current.lastCorrect = correct;
            setStreak((n) => (correct ? n + 1 : 0));
            sfx(correct ? "correct" : "wrong");
          }}
          onClose={() => {
            if (st.current.lastCorrect) {
              st.current.aimT0 = performance.now();
              setPhase("aimU");
            } else setQKey((k) => k + 1);
          }}
        />
      )}
    </div>
  );
}
