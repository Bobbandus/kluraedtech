"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  READ_LOCK,
  FEEDBACK_CORRECT,
  FEEDBACK_WRONG,
  REPAIR_TO_REVIVE,
  TOWERS,
  TOWER_ORDER,
  answerReward,
  build,
  createDefense,
  onCorrect,
  sell,
  sellValue,
  step,
  upgrade,
  upgradeCost,
  type DefenseState,
  type TowerKind,
} from "@/lib/game/defense";
import type { ActResult, FjallAnswerResult, PlayerAction, PlayerView, PublicQuestion } from "@/lib/rooms/types";
import { Icon } from "@/components/icons";
import { OPT_COLORS, OPT_KEYS } from "../parts";
import { DefenseRenderer } from "./render";
import { drawTowerIcon } from "./sprites";
import { useStore } from "@/lib/store";
import { QuestionImage } from "@/components/QuestionImage";
import s from "./defense.module.css";

function fmtTime(ms: number) {
  const sec = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
}

function TowerIcon({ kind }: { kind: TowerKind }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = 44 * dpr;
    c.height = 44 * dpr;
    const ctx = c.getContext("2d")!;
    ctx.scale(dpr, dpr);
    drawTowerIcon(ctx, kind, 44, 44);
  }, [kind]);
  return <canvas ref={ref} aria-hidden="true" />;
}

export default function DefenseGame({ view, act, clockOffset }: { view: PlayerView; act: (a: PlayerAction) => Promise<ActResult>; clockOffset: number }) {
  const reduced = useStore((x) => x.prefs.reducedMotion);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const renderer = useRef<DefenseRenderer | null>(null);
  const game = useRef<DefenseState>(createDefense(Math.floor(Math.random() * 1e6)));
  const [, setFrame] = useState(0);
  const [placing, setPlacing] = useState<TowerKind | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [hover, setHover] = useState<{ c: number; r: number } | null>(null);
  const [banner, setBanner] = useState<{ text: string; boss: boolean; key: number } | null>(null);
  const [hint, setHint] = useState("");
  const [woodBump, setWoodBump] = useState(0);
  const uiRef = useRef({ placing, selected, hover, reduced });
  uiRef.current = { placing, selected, hover, reduced };
  const ended = view.phase === "ended";

  /* ---------- Spel-loop ---------- */
  useEffect(() => {
    const canvas = canvasRef.current!;
    const wrap = wrapRef.current!;
    const r = new DefenseRenderer(canvas);
    renderer.current = r;
    const fit = () => r.resize(wrap.clientWidth);
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(wrap);
    let raf = 0;
    let last = performance.now();
    let lastWave = 0;
    let uiTick = 0;
    const loop = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const g = game.current;
      if (!endedRef.current) step(g, dt);
      if (g.wave !== lastWave) {
        lastWave = g.wave;
        setBanner({ text: g.wave % 5 === 0 ? `Våg ${g.wave} – Bergakungen kommer!` : `Våg ${g.wave}`, boss: g.wave % 5 === 0, key: g.wave });
      }
      const u = uiRef.current;
      r.draw(g, { hover: u.hover, placing: u.placing, selectedTowerId: u.selected, reducedMotion: u.reduced }, dt);
      uiTick += dt;
      if (uiTick > 0.2) {
        uiTick = 0;
        setFrame((f) => f + 1);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  const endedRef = useRef(ended);
  endedRef.current = ended;

  // Rapportera läget till servern/rummet
  useEffect(() => {
    const iv = setInterval(() => {
      const g = game.current;
      act({ type: "fjall_report", state: { wave: g.wavesCleared, hp: g.hp, score: g.score, downed: g.downed } });
    }, 2000);
    return () => clearInterval(iv);
  }, [act]);

  /* ---------- Karta: klick ---------- */
  const pointerCell = (e: React.PointerEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return renderer.current?.cellAt(e.clientX - rect.left, e.clientY - rect.top) ?? null;
  };
  const onMapClick = (e: React.PointerEvent) => {
    const cell = pointerCell(e);
    if (!cell) return;
    const g = game.current;
    const existing = g.towers.find((t) => t.c === cell.c && t.r === cell.r);
    if (existing) {
      setSelected(existing.id === selected ? null : existing.id);
      setPlacing(null);
      return;
    }
    if (placing) {
      if (build(g, placing, cell.c, cell.r)) {
        setHint(`${TOWERS[placing].name} byggd!`);
        if (g.wood < TOWERS[placing].cost[0]) setPlacing(null);
      } else if (g.wood < TOWERS[placing].cost[0]) setHint("Inte tillräckligt med virke – svara på frågor!");
      else setHint("Där går det inte att bygga.");
      return;
    }
    setSelected(null);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setPlacing(null);
        setSelected(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const g = game.current;
  const sel = g.towers.find((t) => t.id === selected);
  const remaining = view.endsAt ? view.endsAt - (Date.now() + clockOffset) : 0;

  return (
    <div className={s.shell}>
      <header className={s.hud}>
        <span className={`${s.timer} ${remaining < 30_000 ? s.timerLow : ""}`} role="timer" aria-label="Tid kvar">
          <Icon name="clock" size={18} /> {fmtTime(remaining)}
        </span>
        <span className={s.stat} aria-label={`Stugans liv ${g.hp} av ${g.maxHp}`}>
          <Icon name="heart" size={17} style={{ color: "#ff8a7a" }} /> {g.hp}
        </span>
        <span key={woodBump} className={`${s.stat} ${s.wood} ${woodBump ? s.statBump : ""}`} aria-label={`Virke ${g.wood}`}>
          <Icon name="log" size={18} /> {g.wood}
        </span>
        <span className={s.stat}>
          <Icon name="waves" size={17} /> Våg {Math.max(1, g.wave)}
        </span>
        <span className={s.spacer} />
        {view.you.streak >= 2 && (
          <span className={s.stat} style={{ background: "var(--sol)", color: "var(--ink)" }}>
            <Icon name="sun" size={16} /> {view.you.streak} i rad
          </span>
        )}
        <span className={`${s.stat} ${s.hideSm}`}>{view.you.name}</span>
      </header>

      <main id="innehall" className={s.layout}>
        <section className={s.mapCol} aria-label="Spelplan">
          <div className={s.mapWrap} ref={wrapRef}>
            <canvas
              ref={canvasRef}
              onPointerDown={onMapClick}
              onPointerMove={(e) => setHover(pointerCell(e))}
              onPointerLeave={() => setHover(null)}
              aria-label="Karta. Välj ett torn nedan och tryck på en ruta för att bygga."
              role="img"
            />
            {banner && (
              <div key={banner.key} className={`${s.banner} ${banner.boss ? s.bannerBoss : ""}`} aria-live="polite">
                {banner.text}
              </div>
            )}
            {g.downed && !ended && (
              <div className={s.downed} role="alert">
                <div>
                  <strong>Stugan har fallit!</strong>
                  Svara rätt för att reparera den.
                  <div className={s.repair}>
                    <span style={{ width: `${(g.hp / REPAIR_TO_REVIVE) * 100}%` }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {sel ? (
            <div className={s.selected}>
              <strong>
                {TOWERS[sel.kind].name} · nivå {sel.level + 1}
              </strong>
              <span className="muted" style={{ fontSize: "0.88rem" }}>
                {TOWERS[sel.kind].blurb}
              </span>
              <span style={{ flex: 1 }} />
              {upgradeCost(sel) !== null ? (
                <button
                  className="btn btn-accent btn-sm"
                  disabled={g.wood < (upgradeCost(sel) ?? 0)}
                  onClick={() => {
                    if (upgrade(g, sel.id)) setHint("Uppgraderad!");
                  }}
                >
                  <Icon name="chevronUp" size={16} /> Uppgradera · {upgradeCost(sel)}
                </button>
              ) : (
                <span className="chip chip-warn">Max nivå</span>
              )}
              <button
                className="btn btn-sm"
                onClick={() => {
                  if (sell(g, sel.id)) {
                    setSelected(null);
                    setHint(`Riven – du fick tillbaka ${sellValue(sel)} virke`);
                  }
                }}
              >
                Riv (+{sellValue(sel)})
              </button>
              <button className="btn btn-sm btn-ghost btn-icon" onClick={() => setSelected(null)} aria-label="Stäng">
                <Icon name="x" size={16} />
              </button>
            </div>
          ) : (
            <div className={s.build} role="group" aria-label="Bygg torn">
              {TOWER_ORDER.map((k) => (
                <button
                  key={k}
                  className={s.towerBtn}
                  aria-pressed={placing === k}
                  disabled={g.downed}
                  onClick={() => {
                    setPlacing(placing === k ? null : k);
                    setSelected(null);
                    setHint(placing === k ? "" : g.wood < TOWERS[k].cost[0] ? `${TOWERS[k].name} kostar ${TOWERS[k].cost[0]} virke – svara på frågor för att tjäna mer.` : `Tryck på en ljus ruta för att bygga ${TOWERS[k].name.toLowerCase()}.`);
                  }}
                  title={TOWERS[k].blurb}
                >
                  <TowerIcon kind={k} />
                  <span>
                    <span className={s.tName} style={{ display: "block" }}>
                      {TOWERS[k].name}
                    </span>
                    <span className={s.tCost} style={{ opacity: g.wood >= TOWERS[k].cost[0] ? 1 : 0.6 }}>
                      <Icon name="log" size={13} /> {TOWERS[k].cost[0]}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}
          <p className={s.hint} aria-live="polite">
            {hint}
          </p>
        </section>

        <QuestionPanel
          act={act}
          disabled={ended}
          streak={view.you.streak}
          onCorrect={(streak) => {
            const amount = onCorrect(game.current, streak);
            setWoodBump((b) => b + 1);
            setHint(`+${amount} virke!`);
          }}
        />
      </main>
    </div>
  );
}

/* ---------- Frågor i egen takt ---------- */

function QuestionPanel({ act, disabled, streak, onCorrect: onRight }: { act: (a: PlayerAction) => Promise<ActResult>; disabled: boolean; streak: number; onCorrect: (streak: number) => void }) {
  const [q, setQ] = useState<PublicQuestion | null>(null);
  const [unlocked, setUnlocked] = useState(false);
  const [picked, setPicked] = useState<number | null>(null);
  const [res, setRes] = useState<FjallAnswerResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(false);
  const disabledRef = useRef(disabled);
  disabledRef.current = disabled;

  const load = useCallback(async () => {
    if (disabledRef.current) return;
    setPicked(null);
    setRes(null);
    setUnlocked(false);
    const r = await act({ type: "fjall_next" });
    if (r.ok && r.question) {
      setQ(r.question);
      setTimeout(() => setUnlocked(true), READ_LOCK * 1000);
    } else if (!r.ok) setError(r.error);
  }, [act]);

  useEffect(() => {
    if (!disabled) load();
  }, [load, disabled]);

  const answer = async (i: number) => {
    if (!q || !unlocked || picked !== null || busy.current || disabled) return;
    busy.current = true;
    setPicked(i);
    const r = await act({ type: "fjall_answer", qid: q.id, option: i });
    busy.current = false;
    if (!r.ok || !r.answer) {
      setError(r.ok ? "Något gick fel." : r.error);
      setPicked(null);
      return;
    }
    setRes(r.answer);
    if (r.answer.correct) onRight(r.answer.streak);
    setTimeout(load, (r.answer.correct ? FEEDBACK_CORRECT : FEEDBACK_WRONG) * 1000);
  };

  // Tangentbord 1–4
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT") return;
      const i = ["1", "2", "3", "4", "5", "6"].indexOf(e.key);
      if (i >= 0 && q && i < q.options.length) answer(i);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const nextReward = answerReward(streak + 1);

  return (
    <section className={s.panel} aria-label="Fråga">
      <div className={s.panelHead}>
        <span className="eyebrow">Svara för att tjäna virke</span>
        <span className={s.reward}>
          <Icon name="log" size={14} /> +{nextReward}
        </span>
      </div>
      {disabled ? (
        <p className="muted">Tiden är ute!</p>
      ) : !q ? (
        <p className="muted">{error ?? "Hämtar fråga …"}</p>
      ) : (
        <>
          <QuestionImage src={q.image} maxHeight={180} />
          <h2 className={s.qText} key={q.id + (res ? "r" : "")}>
            {q.text}
          </h2>
          <div className={s.opts} role="group" aria-label="Svarsalternativ">
            {q.options.map((o, i) => {
              const isRight = res && i === res.correctIndex;
              const isWrong = res && picked === i && !res.correct;
              const cls = [s.opt, !unlocked ? s.locked : "", isRight ? s.right : "", isWrong ? s.wrong : "", res && !isRight && !isWrong ? s.dim : ""].join(" ");
              return (
                <button key={`${q.id}-${i}`} className={cls} disabled={!unlocked || picked !== null} onClick={() => answer(i)} aria-label={`${OPT_KEYS[i]}: ${o}`}>
                  <span className={s.key} style={{ background: OPT_COLORS[i] }}>
                    {OPT_KEYS[i]}
                  </span>
                  <span style={{ flex: 1 }}>{o}</span>
                  {isRight && <Icon name="check" size={20} stroke={3} style={{ color: "var(--ok-dark)" }} />}
                  {isWrong && <Icon name="x" size={20} stroke={3} style={{ color: "var(--lingon-dark)" }} />}
                </button>
              );
            })}
          </div>
          {res && (
            <div className={`${s.fb} ${res.correct ? s.fbOk : s.fbBad}`} role="status">
              {res.correct ? (
                <strong>Rätt! +{answerReward(res.streak)} virke</strong>
              ) : (
                <>
                  <strong style={{ color: "var(--lingon-dark)" }}>Inte riktigt.</strong> {res.explanation ?? `Rätt svar: ${q.options[res.correctIndex]}.`}
                  <div className={s.lockBar}>
                    <span style={{ ["--dur" as string]: `${FEEDBACK_WRONG}s` }} />
                  </div>
                </>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}
