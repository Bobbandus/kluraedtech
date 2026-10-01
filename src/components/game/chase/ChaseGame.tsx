"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  FEEDBACK_CORRECT,
  FEEDBACK_WRONG,
  READ_LOCK,
  answer as answerChase,
  createChase,
  mapPos,
  resume,
  seedFromCode,
  step,
  type ChaseState,
} from "@/lib/game/chase";
import type { ActResult, FjallAnswerResult, PlayerAction, PlayerView, PublicQuestion } from "@/lib/rooms/types";
import { useStore } from "@/lib/store";
import { QuestionImage } from "@/components/QuestionImage";
import { OPT_COLORS, OPT_KEYS } from "../parts";
import { ChaseRenderer, drawCityOverview } from "./render";
import s from "./chase.module.css";

function fmtTime(ms: number) {
  const sec = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
}

type Pop = { id: number; text: string; kind: "star" | "near" | "miss" };

export default function ChaseGame({ view, act, clockOffset }: { view: PlayerView; act: (a: PlayerAction) => Promise<ActResult>; clockOffset: number }) {
  const reduced = useStore((x) => x.prefs.reducedMotion);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const miniRef = useRef<HTMLCanvasElement>(null);
  const game = useRef<ChaseState | null>(null);
  if (!game.current) game.current = createChase(Math.floor(Math.random() * 1e9), view.settings.energy, seedFromCode(view.code));
  const [, setTick] = useState(0);
  const [asking, setAsking] = useState(false);
  const [pops, setPops] = useState<Pop[]>([]);
  const [hint, setHint] = useState(true);
  const [touch, setTouch] = useState(false);
  const ended = view.phase === "ended";
  const paused = view.paused;
  const stateRef = useRef({ ended, paused, reduced, asking });
  stateRef.current = { ended, paused, reduced, asking };

  const pop = useCallback((text: string, kind: Pop["kind"]) => {
    const id = Math.random();
    setPops((p) => [...p.slice(-2), { id, text, kind }]);
    setTimeout(() => setPops((p) => p.filter((x) => x.id !== id)), 1600);
  }, []);

  /* ---------- Spel-loop ---------- */
  useEffect(() => {
    const canvas = canvasRef.current!;
    const g = game.current!;
    const r = new ChaseRenderer(canvas);
    const shell = shellRef.current!;
    const fit = () => r.resize(shell.clientWidth || window.innerWidth, shell.clientHeight || window.innerHeight);
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(shell);
    r.warm(g.city, g.player.x, g.player.y);
    r.snapCamera(g);

    // Minikarta
    const mini = miniRef.current!;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const M = 128;
    mini.width = M * dpr;
    mini.height = M * dpr;
    const overview = document.createElement("canvas");
    const os = (M * 2.2) / Math.max(g.city.w, g.city.h);
    overview.width = Math.ceil(g.city.w * os * dpr);
    overview.height = Math.ceil(g.city.h * os * dpr);
    drawCityOverview(overview.getContext("2d")!, g.city, os * dpr);

    let raf = 0;
    let last = performance.now();
    let ui = 0;
    let focus = 0;
    let lastEvent = 0;
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const st = stateRef.current;
      if (!st.ended && !st.paused) step(g, dt);
      // Händelser till UI
      for (const e of g.events) {
        if (e.t <= lastEvent) continue;
        if (e.kind === "nearmiss") pop("Nära ögat!", "near");
      }
      if (g.events.length) lastEvent = g.events[g.events.length - 1].t;
      if (g.phase === "question" && !st.asking) setAsking(true);
      focus += ((g.phase === "question" ? 1 : 0) - focus) * Math.min(1, dt * 4);
      r.draw(g, { reducedMotion: st.reduced, focus }, st.paused ? 0 : dt);
      ui += dt;
      if (ui > 0.1) {
        ui = 0;
        setTick((t) => t + 1);
        drawMini(mini, overview, g, os, dpr, M, now);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    const hideHint = setTimeout(() => setHint(false), 6000);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      clearTimeout(hideHint);
    };
  }, [pop]);

  /* ---------- Styrning ---------- */
  useEffect(() => {
    const keys = new Set<string>();
    const apply = () => {
      const g = game.current!;
      const l = keys.has("ArrowLeft") || keys.has("a") || keys.has("A");
      const rt = keys.has("ArrowRight") || keys.has("d") || keys.has("D");
      g.input.steer = (rt ? 1 : 0) - (l ? 1 : 0);
      g.input.brake = keys.has("ArrowDown") || keys.has("s") || keys.has("S") || keys.has(" ");
    };
    const down = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT") return;
      if (["ArrowLeft", "ArrowRight", "ArrowDown", "ArrowUp", " "].includes(e.key)) e.preventDefault();
      keys.add(e.key);
      apply();
    };
    const up = (e: KeyboardEvent) => {
      keys.delete(e.key);
      apply();
    };
    const blur = () => {
      keys.clear();
      apply();
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
    };
  }, []);

  // Pekskärm: vänster/höger halva svänger, båda samtidigt bromsar
  const pointers = useRef(new Map<number, number>());
  const applyTouch = () => {
    const g = game.current!;
    let l = false;
    let r = false;
    for (const x of pointers.current.values()) {
      const rect = shellRef.current?.getBoundingClientRect();
      if (x < (rect ? rect.left + rect.width / 2 : window.innerWidth / 2)) l = true;
      else r = true;
    }
    g.input.steer = l && r ? 0 : r ? 1 : l ? -1 : 0;
    g.input.brake = l && r;
  };
  const onDown = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") setTouch(true);
    pointers.current.set(e.pointerId, e.clientX);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    applyTouch();
  };
  const onMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, e.clientX);
    applyTouch();
  };
  const onUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    applyTouch();
  };

  /* ---------- Rapport till rummet ---------- */
  useEffect(() => {
    const iv = setInterval(() => {
      const g = game.current!;
      const p = mapPos(g);
      act({ type: "fjall_report", state: { wave: 0, hp: 0, score: 0, downed: false, stars: g.stars, busts: g.busts, x: p.x, y: p.y, a: g.player.a, busted: g.phase === "busted" } });
    }, 1000);
    return () => clearInterval(iv);
  }, [act]);

  const g = game.current;
  const remaining = view.endsAt ? view.endsAt - (Date.now() + clockOffset) : 0;
  const heat = g.phase === "question" ? 1 : g.heat;

  return (
    <div ref={shellRef} className={`${s.shell} ${asking ? s.asking : ""}`}>
      <canvas
        ref={canvasRef}
        className={s.canvas}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        role="img"
        aria-label="Stad sedd ovanifrån. Styr bilen med piltangenterna eller genom att trycka på vänster eller höger halva av skärmen."
      />
      <div className={s.vignette} aria-hidden="true" />

      {/* Stjärnor med mätaren som ring */}
      <div className={s.starHud} aria-live="polite" aria-label={`${g.stars} stjärnor`}>
        <StarRing value={heat} bump={g.stars} />
        <span className={s.starCount} key={g.stars}>
          {g.stars}
        </span>
      </div>

      <div className={`${s.timer} ${remaining < 30_000 ? s.timerLow : ""}`} role="timer" aria-label="Tid kvar">
        {fmtTime(remaining)}
      </div>

      <div className={s.mini} aria-hidden="true">
        <canvas ref={miniRef} />
      </div>

      <div className={s.pops} aria-live="polite">
        {pops.map((p) => (
          <span key={p.id} className={`${s.pop} ${p.kind === "star" ? s.popStar : p.kind === "miss" ? s.popMiss : ""}`}>
            {p.text}
          </span>
        ))}
      </div>

      {hint && !asking && (
        <div className={s.hint}>
          {touch ? (
            <>Tryck på vänster eller höger sida för att svänga</>
          ) : (
            <>
              <kbd>←</kbd> <kbd>→</kbd> styr <span className={s.sep} /> <kbd>↓</kbd> bromsa
            </>
          )}
        </div>
      )}

      {g.phase === "busted" && (
        <div className={s.busted} role="alert">
          <strong>Fast!</strong>
          <span>{g.lostStar ? "Du tappade en stjärna. Strax tillbaka …" : "Strax tillbaka …"}</span>
        </div>
      )}

      {paused && !ended && (
        <div className={s.paused} role="status">
          Pausat av läraren
        </div>
      )}

      {asking && (
        <QuestionBar
          act={act}
          disabled={ended}
          onResult={(correct) => {
            const gg = game.current!;
            answerChase(gg, correct);
            if (correct) pop(`★ ${gg.stars}`, "star");
          }}
          onClose={() => {
            resume(game.current!);
            setAsking(false);
          }}
        />
      )}
    </div>
  );
}

function StarRing({ value, bump }: { value: number; bump: number }) {
  const R = 33;
  const C = 2 * Math.PI * R;
  return (
    <svg className={s.ring} viewBox="0 0 80 80" width="80" height="80" aria-hidden="true">
      <circle cx="40" cy="40" r="38" fill="rgba(16,22,24,0.62)" />
      <circle cx="40" cy="40" r={R} fill="none" stroke="rgba(255,255,255,0.16)" strokeWidth="6" />
      <circle
        cx="40"
        cy="40"
        r={R}
        fill="none"
        stroke={value >= 1 ? "#ffd65a" : "#f2b705"}
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={`${C * Math.max(0.001, value)} ${C}`}
        transform="rotate(-90 40 40)"
        style={{ transition: "stroke-dasharray 0.12s linear" }}
      />
      <g key={bump} className={s.starPop}>
        <path
          d="M40 21.5l5.3 10.9 12 1.6-8.8 8.3 2.2 11.9L40 48.4l-10.7 5.8 2.2-11.9-8.8-8.3 12-1.6z"
          fill="#f7c531"
          stroke="#2a2310"
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
        <path d="M40 25.5l3.4 7 4 .6" fill="none" stroke="#fff3c0" strokeWidth="2" strokeLinecap="round" />
      </g>
    </svg>
  );
}

function drawMini(mini: HTMLCanvasElement, overview: HTMLCanvasElement, g: ChaseState, os: number, dpr: number, M: number, now: number) {
  const ctx = mini.getContext("2d")!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, M, M);
  ctx.save();
  ctx.beginPath();
  ctx.arc(M / 2, M / 2, M / 2, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = "#3c6e3e";
  ctx.fillRect(0, 0, M, M);
  const px = g.player.x * os;
  const py = g.player.y * os;
  ctx.drawImage(overview, M / 2 - px, M / 2 - py, overview.width / dpr, overview.height / dpr);
  for (const p of g.police) {
    const x = M / 2 + (p.x * os - px);
    const y = M / 2 + (p.y * os - py);
    ctx.fillStyle = Math.floor(now / 160 + p.id) % 2 ? "#3d8bff" : "#ffffff";
    ctx.beginPath();
    ctx.arc(Math.max(6, Math.min(M - 6, x)), Math.max(6, Math.min(M - 6, y)), 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#0f2a5c";
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }
  ctx.translate(M / 2, M / 2);
  ctx.rotate(g.player.a);
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "#1d2326";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(7, 0);
  ctx.lineTo(-5, -5);
  ctx.lineTo(-2.5, 0);
  ctx.lineTo(-5, 5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

/* ---------- Frågan ---------- */

function QuestionBar({ act, disabled, onResult, onClose }: { act: (a: PlayerAction) => Promise<ActResult>; disabled: boolean; onResult: (correct: boolean) => void; onClose: () => void }) {
  const [q, setQ] = useState<PublicQuestion | null>(null);
  const [unlocked, setUnlocked] = useState(false);
  const [picked, setPicked] = useState<number | null>(null);
  const [res, setRes] = useState<FjallAnswerResult | null>(null);
  const busy = useRef(false);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    let alive = true;
    act({ type: "fjall_next" }).then((r) => {
      if (!alive) return;
      if (r.ok && r.question) {
        setQ(r.question);
        setTimeout(() => alive && setUnlocked(true), READ_LOCK * 1000);
      } else closeRef.current();
    });
    return () => {
      alive = false;
    };
  }, [act]);

  const choose = async (i: number) => {
    if (!q || !unlocked || picked !== null || busy.current || disabled) return;
    busy.current = true;
    setPicked(i);
    const r = await act({ type: "fjall_answer", qid: q.id, option: i });
    busy.current = false;
    if (!r.ok || !r.answer) {
      setPicked(null);
      return;
    }
    setRes(r.answer);
    onResult(r.answer.correct);
    setTimeout(() => closeRef.current(), (r.answer.correct ? FEEDBACK_CORRECT : FEEDBACK_WRONG) * 1000);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const i = ["1", "2", "3", "4", "5", "6"].indexOf(e.key);
      if (i >= 0 && q && i < q.options.length) choose(i);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <section className={s.qbar} aria-label="Fråga">
      {!q ? (
        <p className={s.qText}>Hämtar fråga …</p>
      ) : (
        <>
          <div className={s.qHead}>
            {q.image && (
              <div className={s.qImg}>
                <QuestionImage src={q.image} maxHeight={110} />
              </div>
            )}
            <h2 className={s.qText}>{q.text}</h2>
          </div>
          <div className={s.opts} role="group" aria-label="Svarsalternativ" data-n={q.options.length}>
            {q.options.map((o, i) => {
              const right = res && i === res.correctIndex;
              const wrong = res && picked === i && !res.correct;
              return (
                <button
                  key={`${q.id}-${i}`}
                  className={[s.opt, !unlocked ? s.locked : "", right ? s.right : "", wrong ? s.wrong : "", res && !right && !wrong ? s.dim : ""].join(" ")}
                  disabled={!unlocked || picked !== null}
                  onClick={() => choose(i)}
                  aria-label={`${OPT_KEYS[i]}: ${o}`}
                >
                  <span className={s.key} style={{ background: OPT_COLORS[i] }}>
                    {i + 1}
                  </span>
                  <span>{o}</span>
                </button>
              );
            })}
          </div>
          {res && !res.correct && (
            <div className={s.fb} role="status">
              <strong>Ingen stjärna den här gången.</strong> {res.explanation ?? `Rätt svar: ${q.options[res.correctIndex]}.`}
              <span className={s.lock} style={{ ["--dur" as string]: `${FEEDBACK_WRONG}s` }} />
            </div>
          )}
        </>
      )}
    </section>
  );
}
