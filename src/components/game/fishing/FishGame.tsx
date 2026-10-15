"use client";

import { useEffect, useRef, useState } from "react";
import { FISH, FISH_ORDER, MAX_BAIT, baitReward, createFishing, lineDepth, meters, onCorrect, setTarget, step, type FishKind, type FishingState } from "@/lib/game/fishing";
import type { ActResult, PlayerAction, PlayerView } from "@/lib/rooms/types";
import { Icon } from "@/components/icons";
import { useStore } from "@/lib/store";
import { sfx, useSound } from "@/lib/sound";
import { CountUp } from "../parts";
import { QuestionPanel } from "../defense/DefenseGame";
import { FishRenderer } from "./render";
import { fishSprite } from "./sprites";
import d from "../defense/defense.module.css";
import s from "./fishing.module.css";

function fmtTime(ms: number) {
  const sec = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
}

const COATS = ["#d9483b", "#2f7fc1", "#e8a317", "#3f9a5a", "#8a4fc0", "#e0607e", "#1f8f8a", "#c46a2c"];
const HATS = ["#2f7fc1", "#d9483b", "#f2c230", "#e0607e", "#3f9a5a", "#1b2422"];
function pick<T>(arr: T[], key: string, salt: number) {
  let h = salt;
  for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return arr[h % arr.length];
}

/** Liten pixelbild av en fisk till fiskboken */
export function FishIcon({ kind, size = 40, dim = false }: { kind: FishKind; size?: number; dim?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const spr = fishSprite(kind, 0);
    const scale = Math.max(1, Math.floor(Math.min(size / spr.width, (size * 0.62) / spr.height)));
    c.width = spr.width * scale;
    c.height = spr.height * scale;
    const ctx = c.getContext("2d")!;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(spr, 0, 0, c.width, c.height);
  }, [kind, size]);
  return <canvas ref={ref} className={`${s.fishIcon} ${dim ? s.fishDim : ""}`} aria-hidden="true" />;
}

export default function FishGame({ view, act, clockOffset }: { view: PlayerView; act: (a: PlayerAction) => Promise<ActResult>; clockOffset: number }) {
  const reduced = useStore((x) => x.prefs.reducedMotion);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const renderer = useRef<FishRenderer | null>(null);
  const game = useRef<FishingState>(createFishing(Math.floor(Math.random() * 1e6), view.settings.energy));
  const [, setFrame] = useState(0);
  const [banner, setBanner] = useState<{ text: string; gold: boolean; key: number } | null>(null);
  const [hint, setHint] = useState("Styr kroken med musen, fingret eller piltangenterna. Djupare fisk är värd mer!");
  const [baitBump, setBaitBump] = useState(0);
  const [soundOn, toggleSound] = useSound();
  const ended = view.phase === "ended";
  const endedRef = useRef(ended);
  endedRef.current = ended;
  const uiRef = useRef({ reduced, coat: pick(COATS, view.you.skinId, 7), hat: pick(HATS, view.you.name, 3) });
  uiRef.current.reduced = reduced;
  const keys = useRef(new Set<string>());

  /* ---------- Spel-loop ---------- */
  useEffect(() => {
    const canvas = canvasRef.current!;
    const wrap = wrapRef.current!;
    const r = new FishRenderer(canvas);
    renderer.current = r;
    const fit = () => r.resize(wrap.clientWidth);
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(wrap);
    let raf = 0;
    let last = performance.now();
    let uiTick = 0;
    let lastSound = -1;
    let reelTick = 0;
    const loop = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const g = game.current;
      // Tangentbord styr målet
      const k = keys.current;
      if (k.size && !g.reeling) {
        const sp = 260 * dt;
        let tx = g.tx;
        let ty = g.ty;
        if (k.has("ArrowLeft") || k.has("a")) tx -= sp;
        if (k.has("ArrowRight") || k.has("d")) tx += sp;
        if (k.has("ArrowUp") || k.has("w")) ty -= sp;
        if (k.has("ArrowDown") || k.has("s")) ty += sp;
        setTarget(g, tx, ty);
      }
      if (!endedRef.current) step(g, dt);
      for (const e of g.events) {
        if (e.t <= lastSound) continue;
        if (e.type === "catch") {
          sfx(e.value >= 50 ? "bigcatch" : e.value > 0 ? "catch" : "wrong");
          if (e.value > 0) {
            const best = g.best === e.kind && g.caught[e.kind] === 1 && e.value >= 35;
            setHint(e.kind === "guld" ? "GULDFISKEN! +200" : best ? `Ny rekordfisk: ${FISH[e.kind].name}!` : g.bait > 0 ? `${FISH[e.kind].name} på kroken! +${e.value}` : `${FISH[e.kind].name}! Betet är slut – svara rätt för mer.`);
          } else setHint("Bara en gammal känga. Undvik botten där den ligger!");
        } else if (e.type === "bite") sfx("bite");
        else if (e.type === "snag") sfx("hit");
        else if (e.type === "steal") {
          sfx("leak");
          setHint(`Gäddan snodde din ${FISH[e.kind].name.toLowerCase()}! Styr undan nästa gång.`);
        }
        else if (e.type === "splash") sfx("splash");
        else if (e.type === "gold") {
          sfx("star");
          setBanner({ text: "Guldfisken simmar förbi!", gold: true, key: e.t });
        }
      }
      if (g.events.length) lastSound = g.events[g.events.length - 1].t;
      if (g.reeling) {
        reelTick += dt;
        if (reelTick > 0.09) {
          reelTick = 0;
          sfx("reel");
        }
      }
      r.draw(g, { reducedMotion: uiRef.current.reduced, coat: uiRef.current.coat, hat: uiRef.current.hat }, dt);
      uiTick += dt;
      if (uiTick > 0.2) {
        uiTick = 0;
        setFrame((f) => f + 1);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    const down = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT") return;
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) e.preventDefault();
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
      act({ type: "fjall_report", state: { wave: 0, hp: 0, score: g.score, downed: false, fish: g.catches, best: g.best ?? undefined, last: g.last ?? undefined } });
    }, 2000);
    return () => clearInterval(iv);
  }, [act]);

  const aim = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse" && e.buttons === 0 && e.type === "pointermove") return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const w = renderer.current?.toWorld(e.clientX - rect.left, e.clientY - rect.top);
    if (w) setTarget(game.current, w.x, w.y);
  };

  const g = game.current;
  const remaining = view.endsAt ? view.endsAt - (Date.now() + clockOffset) : 0;
  const reach = meters(lineDepth(g.correct));

  return (
    <div className={d.shell} style={{ background: "#e6f1f6" }}>
      <header className={d.hud}>
        <span className={`${d.timer} ${remaining < 30_000 ? d.timerLow : ""}`} role="timer" aria-label="Tid kvar">
          <Icon name="clock" size={18} /> {fmtTime(remaining)}
        </span>
        <span className={s.score} aria-label={`Poäng ${g.score}`}>
          <CountUp value={g.score} duration={600} />
          <small>poäng</small>
        </span>
        <span key={baitBump} className={`${d.stat} ${baitBump ? d.statBump : ""} ${g.bait === 0 ? s.noBait : ""}`} aria-label={`Bete ${g.bait} av ${MAX_BAIT}`}>
          <span className={s.worm} aria-hidden="true" />
          {g.bait} bete
        </span>
        <span className={d.stat} aria-label={`Linan räcker ${reach} meter`}>
          <Icon name="hook" size={17} /> {reach} m
        </span>
        <span className={`${d.stat} ${d.hideSm}`}>
          <Icon name="fish" size={17} /> {g.catches}
        </span>
        <span className={d.spacer} />
        {view.you.streak >= 2 && (
          <span className={d.stat} style={{ background: "var(--sol)", color: "var(--ink)" }}>
            <Icon name="sun" size={16} /> {view.you.streak} i rad
          </span>
        )}
        {view.you.rank ? <span className={d.stat}>Plats {view.you.rank}</span> : null}
        <button className={d.soundBtn} onClick={toggleSound} aria-label={soundOn ? "Stäng av ljud" : "Sätt på ljud"} aria-pressed={soundOn}>
          <Icon name={soundOn ? "volume" : "mute"} size={18} />
        </button>
      </header>

      <main id="innehall" className={d.layout}>
        <section className={d.mapCol} aria-label="Isen och sjön">
          <div className={`${d.mapWrap} ${s.lake}`} ref={wrapRef}>
            <canvas
              ref={canvasRef}
              className={s.canvas}
              onPointerDown={(e) => {
                (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
                aim(e);
              }}
              onPointerMove={aim}
              role="img"
              aria-label="Sjön under isen. Styr kroken med musen, fingret eller piltangenterna."
            />
            {banner && (
              <div key={banner.key} className={`${d.banner} ${banner.gold ? s.goldBanner : ""}`} aria-live="polite">
                {banner.text}
              </div>
            )}
            {g.bait === 0 && !ended && !g.reeling && (
              <div className={s.outOfBait} role="status">
                <span className={s.worm} aria-hidden="true" /> Slut på bete – svara rätt på en fråga!
              </div>
            )}
          </div>
          <div className={s.book} aria-label="Fiskbok">
            {FISH_ORDER.map((k) => (
              <div key={k} className={`${s.bookItem} ${g.caught[k] ? s.got : ""}`} title={`${FISH[k].name} · ${FISH[k].value} poäng · ${meters(FISH[k].depth[0])}–${meters(FISH[k].depth[1])} m`}>
                <FishIcon kind={k} size={44} dim={!g.caught[k]} />
                <span className={s.bookName}>{g.caught[k] ? FISH[k].name : "?"}</span>
                <span className={s.bookVal}>{g.caught[k] ? `×${g.caught[k]}` : `${FISH[k].value} p`}</span>
              </div>
            ))}
          </div>
          <p className={d.hint} aria-live="polite">
            {hint}
          </p>
        </section>

        <QuestionPanel
          act={act}
          disabled={ended}
          streak={view.you.streak}
          label="Svara rätt för bete och längre lina"
          icon="hook"
          unit="bete"
          reward={baitReward}
          onCorrect={(streak) => {
            const before = lineDepth(game.current.correct);
            const amount = onCorrect(game.current, streak);
            setBaitBump((b) => b + 1);
            const longer = lineDepth(game.current.correct) > before;
            setHint(`+${amount} bete${longer ? ` – linan räcker nu ${meters(lineDepth(game.current.correct))} m` : ""}`);
          }}
        />
      </main>
    </div>
  );
}
