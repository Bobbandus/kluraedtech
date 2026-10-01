"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ENERGY, LEG_NAMES, ranked } from "@/lib/game/engine";
import { getTransport, loadHostKey } from "@/lib/backend";
import type { HostAction, HostView } from "@/lib/rooms/types";
import { useStore } from "@/lib/store";
import { formatCode } from "@/lib/format";
import { Avatar } from "@/components/avatar";
import { Icon } from "@/components/icons";
import { LogoMark } from "@/components/brand";
import { OPT_COLORS, OPT_KEYS } from "./parts";
import ClimbScene from "./climb/ClimbScene";
import ChaseProjector from "./chase/ChaseProjector";
import { MODE_INFO } from "@/lib/modes";
import { QuestionImage } from "@/components/QuestionImage";
import s from "./host.module.css";

const LOBBY_RULES: Record<HostView["mode"], string> = {
  jakt: "Kör undan polisen. När mätaren är full kommer en fråga – rätt svar ger en stjärna. Flest stjärnor vinner.",
  fjall: "Försvara stugan mot trollen. Rätt svar ger virke till nya torn. Trollen väntar inte medan du funderar.",
  topptur: "Alla svarar på samma fråga. Rätt svar tar dig uppåt mot toppen – fart ger bara lite extra.",
};

function legOf(sizes: number[], q: number) {
  let acc = 0;
  for (let i = 0; i < sizes.length; i++) {
    acc += sizes[i];
    if (q < acc) return i;
  }
  return sizes.length - 1;
}

function fmtTime(ms: number) {
  const sec = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
}

export default function HostGame({ code, keyboard = true }: { code: string; keyboard?: boolean }) {
  const router = useRouter();
  const transport = useMemo(() => getTransport(), []);
  const addSession = useStore((x) => x.addSession);
  const [view, setView] = useState<HostView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [host, setHost] = useState("");
  const keyRef = useRef<string | null>(null);
  const saved = useRef(false);

  useEffect(() => {
    setHost(window.location.host);
    const key = loadHostKey(code);
    keyRef.current = key;
    if (!key) {
      setError("Det här spelet startades i en annan flik eller webbläsare.");
      return;
    }
    return transport.hostWatch(
      code,
      key,
      (v) => {
        setView(v);
        setOffset(v.serverNow - Date.now());
      },
      (e) => setError(e),
    );
  }, [code, transport]);

  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(iv);
  }, []);

  // Spara resultatet lokalt när matchen är slut
  useEffect(() => {
    if (view?.phase === "ended" && view.result && !saved.current) {
      saved.current = true;
      addSession(view.result);
    }
  }, [view, addSession]);

  const send = useCallback(
    (a: HostAction) => {
      if (keyRef.current) transport.hostAction(code, keyRef.current, a);
    },
    [transport, code],
  );

  const next = useCallback(() => {
    if (!view) return;
    if (view.phase === "lobby") send({ type: "start" });
    else if (view.phase !== "ended") send({ type: "next" });
  }, [view, send]);

  // Tangentbord: mellanslag/pil höger = nästa, P = paus
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!keyboard) return;
      if ((e.target as HTMLElement)?.tagName === "BUTTON" && (e.key === " " || e.key === "Enter")) return;
      // Lägen i egen takt avslutas bara med knappen – inte av misstag med en tangent
      if ((e.key === " " || e.key === "ArrowRight") && view?.phase !== "playing") {
        e.preventDefault();
        next();
      }
      if ((e.key === "p" || e.key === "P") && view) send({ type: view.paused ? "resume" : "pause" });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, send, view, keyboard]);

  if (error) {
    return (
      <div className={s.shell}>
        <main className={s.main} style={{ alignItems: "center", justifyContent: "center", textAlign: "center" }}>
          <h1 style={{ color: "#fff" }}>Spelet går inte att visa</h1>
          <p style={{ color: "#c9e6d9" }}>{error}</p>
          <Link href="/larare" className="btn btn-accent btn-lg">
            Till översikten
          </Link>
        </main>
      </div>
    );
  }
  if (!view) return <div className={s.shell} />;

  const clock = now + offset;
  const fj = view.mode !== "topptur";
  const legIndex = legOf(view.legSizes, view.qIndex);
  const nextLabel =
    view.phase === "lobby"
      ? "Starta"
      : view.phase === "question"
        ? "Visa svaret"
        : view.phase === "playing"
          ? "Avsluta nu"
          : "Nästa";

  const controls = (
    <div className={s.ctrl} role="toolbar" aria-label="Spelkontroller">
      {(view.phase === "question" || view.phase === "playing") && (
        <button className={s.cbtn} onClick={() => send({ type: view.paused ? "resume" : "pause" })} aria-pressed={view.paused}>
          <Icon name={view.paused ? "play" : "pause"} size={15} /> {view.paused ? "Fortsätt" : "Pausa"}
        </button>
      )}
      {view.phase !== "ended" && (
        <button className={`${s.cbtn} ${s.cbtnMain}`} onClick={next} disabled={view.phase === "lobby" && !view.players.length}>
          {nextLabel} <Icon name="arrowRight" size={15} />
        </button>
      )}
      <Link href="/larare" className={s.cbtn} aria-label="Avsluta och gå till översikten">
        <Icon name="x" size={15} />
      </Link>
    </div>
  );

  const top = (
    <header className={s.top}>
      <LogoMark size={36} />
      {view.phase !== "lobby" && (
        <span className={s.joinPill}>
          {host}/spela <strong>{formatCode(view.code)}</strong>
        </span>
      )}
      {view.phase !== "lobby" && view.phase !== "ended" && !fj && (
        <span className={s.progress}>
          {view.legSizes.length > 1 ? `${LEG_NAMES[legIndex]} · ` : ""}Fråga {view.qIndex + 1} av {view.total}
        </span>
      )}
    </header>
  );

  /* ---------- Lobby ---------- */
  if (view.phase === "lobby") {
    return (
      <div className={s.shell}>
        {top}
        <main id="innehall" className={s.main}>
          <div className={s.lobbyGrid}>
            <div className={s.joinCard}>
              <span className={s.modeChip}>
                <Icon name={MODE_INFO[view.mode].icon} size={16} /> {MODE_INFO[view.mode].name} · {view.quizTitle}
              </span>
              <ol className={s.joinSteps}>
                <li>
                  Gå till <strong>{host}/spela</strong>
                </li>
                <li>Skriv koden</li>
              </ol>
              <div className={s.bigCode} aria-label={`Spelkod ${view.code}`}>
                {formatCode(view.code)}
              </div>
              <p className={s.rules}>{LOBBY_RULES[view.mode]}</p>
            </div>
            <div className={s.lobbyPlayers}>
              <div className={s.playersHead}>
                <span className={s.playersCount}>{view.players.length}</span>
                <span>{view.players.length === 1 ? "spelare har gått med" : "spelare har gått med"}</span>
              </div>
              <div className={s.players} aria-live="polite">
                {view.players.length === 0 ? (
                  <p className={s.waiting}>Väntar på de första spelarna …</p>
                ) : (
                  view.players.map((p) => (
                    <span key={p.id} className={s.pchip}>
                      <Avatar skin={p.skinId} size={38} /> {p.name}
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>
          <svg className={s.lobbyHills} viewBox="0 0 1600 160" preserveAspectRatio="none" aria-hidden="true">
            <path d="M0 160 L0 110 Q200 40 420 95 T860 80 T1280 60 T1600 90 L1600 160 Z" fill="rgba(255,255,255,0.05)" />
            <path d="M0 160 L0 135 Q260 90 520 125 T1040 110 T1600 120 L1600 160 Z" fill="rgba(255,255,255,0.06)" />
          </svg>
        </main>
        {controls}
      </div>
    );
  }

  /* ---------- Biljakt ---------- */
  if (view.mode === "jakt" && view.phase === "playing") {
    return (
      <div className={s.shell}>
        <ChaseProjector
          view={view}
          remaining={view.paused ? "Paus" : fmtTime((view.endsAt ?? clock) - clock)}
          joinText={
            <>
              {host}/spela <strong>{formatCode(view.code)}</strong>
            </>
          }
        />
        {controls}
      </div>
    );
  }

  /* ---------- Fjällförsvar ---------- */
  if (fj && view.phase === "playing") {
    const remaining = (view.endsAt ?? clock) - clock;
    const lugn = view.settings.energy === "lugn";
    const order = ranked(view.players);
    const acc = view.classAnswered ? view.classCorrect / view.classAnswered : 0;
    return (
      <div className={s.shell}>
        {top}
        <main id="innehall" className={s.main}>
          <div className={s.fjTimer} role="timer" aria-label="Tid kvar">
            {view.paused ? "Paus" : fmtTime(remaining)}
          </div>
          <div className={s.fjGrid}>
            <div className="stack gap-16">
              <div className={s.panel}>
                <p className="eyebrow">Klassen har svarat rätt</p>
                <div className="num" style={{ fontSize: "3.4rem" }}>
                  {view.classCorrect.toLocaleString("sv-SE")} gånger
                </div>
                <p className="muted" style={{ fontSize: "1.1rem" }}>
                  {Math.round(acc * 100)} % träffsäkerhet
                </p>
              </div>
              {view.hardest && (
                <div className={s.panel}>
                  <p className="eyebrow">Svåraste frågan just nu</p>
                  <div style={{ fontWeight: 750, fontSize: "1.25rem", marginTop: 4 }}>{view.hardest.text}</div>
                  <p className="muted" style={{ marginTop: 4 }}>
                    {Math.round(view.hardest.accuracy * 100)} % rätt
                  </p>
                </div>
              )}
            </div>
            <div className={s.panel}>
              {lugn ? (
                <>
                  <h2 style={{ fontSize: "1.4rem", marginBottom: 14 }}>Klassens stugor</h2>
                  <div className={s.forts}>
                    {view.players.map((p) => (
                      <div key={p.id} className={`${s.fort} ${p.downed ? s.fortDown : ""}`} style={{ background: "var(--paper)", color: "var(--ink)" }}>
                        <Avatar skin={p.skinId} size={40} />
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <h2 style={{ fontSize: "1.4rem", marginBottom: 14 }}>Starkaste försvaren</h2>
                  <div className={s.board}>
                    {order.slice(0, 5).map((p, i) => (
                      <div key={p.id} className={s.brow}>
                        <span className="num" style={{ width: 28, color: "var(--ink-3)" }}>
                          {i + 1}
                        </span>
                        <Avatar skin={p.skinId} size={40} />
                        <span className="grow">{p.name}</span>
                        <span className="chip">Våg {Math.max(1, p.wave ?? 0)}</span>
                        <span className="num">{p.score.toLocaleString("sv-SE")}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </main>
        {controls}
      </div>
    );
  }

  /* ---------- Topptur: fråga / svar ---------- */
  if ((view.phase === "question" || view.phase === "reveal") && view.question) {
    const q = view.question;
    const revealed = view.phase === "reveal";
    const d = view.distribution ?? q.options.map(() => 0);
    const total = view.players.length || 1;
    const limitMs = q.time * ENERGY[view.settings.energy].timeFactor * (view.settings.longerTime ? 1.5 : 1) * 1000;
    const remaining = view.deadline ? view.deadline - clock : 0;
    return (
      <div className={s.shell}>
        {top}
        <main id="innehall" className={s.main}>
          <div className={s.qCard} key={q.id}>
            <QuestionImage src={q.image} maxHeight="34vh" />
            <h1 className={s.qText}>{q.text}</h1>
          </div>
          <div className={s.opts}>
            {q.options.map((o, i) => (
              <div key={i} className={`${s.opt} ${revealed && i === q.correct ? s.right : ""} ${revealed && i !== q.correct ? s.dim : ""}`}>
                {revealed && <span className={s.fill} style={{ width: `${(d[i] / total) * 100}%` }} />}
                <span className={s.key} style={{ background: OPT_COLORS[i] }}>
                  {OPT_KEYS[i]}
                </span>
                <span className={s.optText}>{o}</span>
                {revealed && (
                  <span className={s.count}>
                    {i === q.correct && <Icon name="check" size={22} stroke={3.2} style={{ display: "inline", color: "var(--ok-dark)", marginRight: 6, verticalAlign: "-3px" }} />}
                    {d[i]}
                  </span>
                )}
              </div>
            ))}
          </div>
          {revealed ? (
            <div className={s.explain}>
              <strong>{Math.round((d[q.correct] / total) * 100)} % svarade rätt.</strong> {q.explanation ?? ""}
            </div>
          ) : (
            <div className={s.bottom}>
              <div className={s.timer} aria-hidden="true">
                <span style={{ transform: `scaleX(${view.paused ? 1 : Math.max(0, remaining / limitMs)})` }} />
              </div>
              <span className={s.answered} aria-live="polite">
                {view.answeredCount}/{view.players.length} har svarat
              </span>
            </div>
          )}
          {view.paused && (
            <div className={s.explain} style={{ textAlign: "center" }} role="status">
              Pausat
            </div>
          )}
        </main>
        {controls}
      </div>
    );
  }

  /* ---------- Topptur: etapp ---------- */
  if (view.phase === "leg") {
    const order = ranked(view.players);
    const lugn = ENERGY[view.settings.energy].legBoard === "klassen";
    const maxScore = Math.max(view.total * 115, ...view.players.map((p) => p.score));
    return (
      <div className={s.shell}>
        {top}
        <main id="innehall" className={s.main}>
          <h1 style={{ color: "#fff", fontSize: "clamp(2rem,4vw,3rem)" }}>{LEG_NAMES[legIndex]} avklarad</h1>
          <ClimbScene field={view.players.map((p) => ({ skinId: p.skinId, score: p.score }))} maxScore={maxScore} score={0} height={260} legs={view.legSizes.length > 1 ? [...LEG_NAMES] : []} />
          {!lugn && (
            <div className={s.panel}>
              <div className={s.board}>
                {order.slice(0, 5).map((p, i) => (
                  <div key={p.id} className={s.brow} style={{ animationDelay: `${i * 0.07}s` }}>
                    <span className="num" style={{ width: 28, color: "var(--ink-3)" }}>
                      {i + 1}
                    </span>
                    <Avatar skin={p.skinId} size={40} />
                    <span className="grow">{p.name}</span>
                    <span className="num">{p.score.toLocaleString("sv-SE")} m</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
        {controls}
      </div>
    );
  }

  /* ---------- Slut ---------- */
  const order = ranked(view.players);
  const podium = order.slice(0, Math.min(3, ENERGY[view.settings.energy].podium));
  const acc = view.classAnswered ? view.classCorrect / view.classAnswered : 0;
  const streakKing = view.players.slice().sort((a, b) => b.bestStreak - a.bestStreak)[0];
  const heights = [190, 140, 110];
  const placeOrder = [1, 0, 2].filter((i) => i < podium.length);
  return (
    <div className={s.shell}>
      {top}
      <main id="innehall" className={s.main} style={{ alignItems: "center", textAlign: "center" }}>
        <p style={{ color: "#8fd1b6", fontWeight: 700 }}>{view.quizTitle}</p>
        <h1 style={{ color: "#fff", fontSize: "clamp(2.2rem,5vw,3.6rem)" }}>{view.mode === "jakt" ? "Jakten är över!" : fj ? "Försvaret höll!" : "Toppen nådd!"}</h1>
        <div className={s.podium} style={{ width: "100%" }}>
          {placeOrder.map((i) => {
            const p = podium[i];
            return (
              <div key={p.id} className={s.step} style={{ animationDelay: `${[0.5, 1.1, 0][i]}s` }}>
                <Avatar skin={p.skinId} size={i === 0 ? 96 : 72} style={{ margin: "0 auto" }} className={i === 0 ? "anim-bob" : undefined} />
                <div style={{ fontWeight: 800, fontSize: "1.3rem", marginTop: 6 }}>{p.name}</div>
                <div style={{ color: "#c9e6d9" }}>{view.mode === "jakt" ? `★ ${p.stars ?? p.score} ${(p.stars ?? p.score) === 1 ? "stjärna" : "stjärnor"}` : fj ? `Våg ${p.wave ?? 0} · ${p.score.toLocaleString("sv-SE")}` : `${p.score.toLocaleString("sv-SE")} m`}</div>
                <div className={s.block} style={{ height: heights[i], background: i === 0 ? "var(--sol)" : undefined, color: i === 0 ? "var(--ink)" : undefined }}>
                  {i + 1}
                </div>
              </div>
            );
          })}
        </div>
        <div className="row gap-12 wrap center" style={{ marginTop: 8 }}>
          <span className={s.joinPill}>Klassen: {Math.round(acc * 100)} % rätt</span>
          {streakKing && streakKing.bestStreak > 2 && (
            <span className={s.joinPill}>
              Längsta rad: {streakKing.name} ({streakKing.bestStreak})
            </span>
          )}
        </div>
        <div className="row gap-12 wrap center" style={{ marginTop: 16 }}>
          <button className="btn btn-accent btn-lg" onClick={() => router.push(`/larare/resultat/r-${view.code}`)}>
            <Icon name="chart" size={20} /> Se vad klassen behöver repetera
          </button>
        </div>
      </main>
      {controls}
    </div>
  );
}
